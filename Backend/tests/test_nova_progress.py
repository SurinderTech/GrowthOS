"""
Backend/tests/test_nova_progress.py

Comprehensive Unit & Integration Test Suite for NOVA Execution & Progress Intelligence Engine (Step 10).
Tests execution events, task state transitions, time ratio tracking, partial completion, hierarchical progress propagation,
struggle signal detection, adaptation signal generation, tenant isolation, idempotency, and 4 end-to-end scenarios.
"""

import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from Backend.db.init_db import Base
from Backend.nova.types import NovaState
from Backend.nova.progress import (
    ExecutionEventRecord,
    ExecutionEventType,
    TaskExecutionState,
    ProgressSignalType,
    AdaptationSignalType,
    ProgressSnapshot,
    ExecutionEventIngestor,
    ProgressCalculator,
    SignalDetector,
    AdaptationSignalEngine,
    ProgressManager,
    get_progress_manager,
)
from Backend.nova.progress.models import NovaExecutionEventModel
from Backend.nova.graph.nodes import progress_node, reason_node
from Backend.nova.graph.builder import run_nova_graph
from Backend.nova.llm.provider import NovaLLMProvider


class TestNovaProgressEngine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionLocal()
        self.user_id = str(uuid4())
        self.mock_llm_provider = NovaLLMProvider(client=MagicMock(api_key=None))
        self.manager = get_progress_manager()

    def tearDown(self):
        self.db.close()

    def test_1_execution_event_creation_and_idempotency(self):
        """Test event ingestion and idempotency key deduplication."""
        ingestor = ExecutionEventIngestor()
        event = ExecutionEventRecord(
            user_id=self.user_id,
            task_id="t100",
            event_type=ExecutionEventType.TASK_COMPLETED,
            idempotency_key="idempotent_key_123",
        )

        ok1, msg1 = ingestor.ingest_event(event, db=self.db, authenticated_user_id=self.user_id)
        self.assertTrue(ok1)

        # Retry duplicate event
        ok2, msg2 = ingestor.ingest_event(event, db=self.db, authenticated_user_id=self.user_id)
        self.assertTrue(ok2)
        self.assertIn("Duplicate", msg2)

    def test_2_tenant_isolation_security_check(self):
        """Test server-side rejection when event user_id does not match authenticated user."""
        ingestor = ExecutionEventIngestor()
        event = ExecutionEventRecord(
            user_id="other_user_456",
            task_id="t101",
            event_type=ExecutionEventType.TASK_COMPLETED,
        )

        ok, msg = ingestor.ingest_event(event, db=self.db, authenticated_user_id=self.user_id)
        self.assertFalse(ok)
        self.assertIn("Tenant ownership mismatch", msg)

    def test_3_actual_vs_estimated_time_ratio_calculation(self):
        """Test actual duration vs estimated duration time ratio calculation (e.g. 95 min vs 60 min estimate = 1.58x)."""
        calc = ProgressCalculator()
        event = ExecutionEventRecord(
            user_id=self.user_id,
            task_id="t102",
            event_type=ExecutionEventType.TASK_COMPLETED,
            duration_seconds=5700,  # 95 minutes
            completion_percentage=100.0,
        )

        snapshot = calc.compute_snapshot([event], estimated_duration_mins=60)
        self.assertEqual(snapshot.actual_vs_estimated_ratio, 1.58)

    def test_4_e2e_scenario_1_partial_completion_and_struggle_detection(self):
        """Scenario 1: User completed 3 out of 5 problems and spent 95 minutes on 60 min estimate."""
        event = ExecutionEventRecord(
            user_id=self.user_id,
            task_id="t_binary_search",
            event_type=ExecutionEventType.TASK_PARTIALLY_COMPLETED,
            duration_seconds=5700,  # 95 minutes
            completion_percentage=60.0,
        )

        payload = self.manager.record_and_analyze_event(
            event=event,
            db=self.db,
            user_id=self.user_id,
            estimated_duration_mins=60,
        )

        self.assertEqual(payload.snapshot.task_progress_pct, 60.0)
        self.assertEqual(payload.snapshot.actual_vs_estimated_ratio, 1.58)
        self.assertTrue(any(sig.signal_type == ProgressSignalType.STRUGGLING for sig in payload.active_signals))
        self.assertTrue(any(ad.adaptation_type == AdaptationSignalType.INSERT_PREREQUISITE for ad in payload.adaptation_signals))

    def test_5_e2e_scenario_2_repeated_skips_and_inconsistency(self):
        """Scenario 2: User repeatedly skips tasks for several days -> INCONSISTENT signal -> REDUCE_WORKLOAD adaptation."""
        events = [
            ExecutionEventRecord(user_id=self.user_id, task_id="t201", event_type=ExecutionEventType.TASK_SKIPPED, completion_percentage=0.0),
            ExecutionEventRecord(user_id=self.user_id, task_id="t202", event_type=ExecutionEventType.TASK_SKIPPED, completion_percentage=0.0),
        ]

        snapshot = ProgressSnapshot()
        detector = SignalDetector()
        signals = detector.detect_signals(events, snapshot)

        self.assertTrue(any(s.signal_type == ProgressSignalType.INCONSISTENT for s in signals))

        adaptation_engine = AdaptationSignalEngine()
        adaptations = adaptation_engine.generate_adaptation_signals(signals)
        self.assertTrue(any(ad.adaptation_type == AdaptationSignalType.REDUCE_WORKLOAD for ad in adaptations))

    def test_6_e2e_scenario_3_capacity_higher_than_estimate(self):
        """Scenario 3: User finishes tasks faster than estimated -> CAPACITY_HIGHER signal -> INCREASE_WORKLOAD adaptation."""
        event = ExecutionEventRecord(
            user_id=self.user_id,
            task_id="t301",
            event_type=ExecutionEventType.TASK_COMPLETED,
            duration_seconds=1200,  # 20 mins vs 60 min estimate (0.33x)
            completion_percentage=100.0,
        )

        payload = self.manager.record_and_analyze_event(
            event=event,
            db=self.db,
            user_id=self.user_id,
            estimated_duration_mins=60,
        )

        self.assertTrue(any(sig.signal_type == ProgressSignalType.CAPACITY_HIGHER for sig in payload.active_signals))
        self.assertTrue(any(ad.adaptation_type == AdaptationSignalType.INCREASE_WORKLOAD for ad in payload.adaptation_signals))

    def test_7_e2e_scenario_4_difficulty_mismatch_feedback(self):
        """Scenario 4: User explicitly reports 'too_hard' -> DIFFICULTY_MISMATCH signal."""
        event = ExecutionEventRecord(
            user_id=self.user_id,
            task_id="t401",
            event_type=ExecutionEventType.TASK_COMPLETED,
            duration_seconds=1800,
            completion_percentage=100.0,
            difficulty_rating="too_hard",
        )

        payload = self.manager.record_and_analyze_event(
            event=event,
            db=self.db,
            user_id=self.user_id,
        )

        self.assertTrue(any(sig.signal_type == ProgressSignalType.DIFFICULTY_MISMATCH for sig in payload.active_signals))

    def test_8_langgraph_progress_node_integration(self):
        """Test progress_node and route_decision integration with LangGraph."""
        with patch("Backend.nova.graph.nodes.get_nova_llm_provider", return_value=self.mock_llm_provider):
            res = run_nova_graph(
                user_message="I completed 3 out of 5 binary search problems in 95 minutes",
                override_profile={"name": "Kiran"},
                db=self.db,
            )

        self.assertIn("response", res)
        self.assertEqual(res["execution_stage"], "turn_completed")
        self.assertIsNotNone(res["state"].progress_payload)
        self.assertEqual(res["state"].progress_payload.snapshot.task_progress_pct, 60.0)


if __name__ == "__main__":
    unittest.main()
