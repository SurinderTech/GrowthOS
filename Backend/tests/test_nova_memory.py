"""
Backend/tests/test_nova_memory.py

Comprehensive Unit Test Suite for NOVA Personal Memory Infrastructure (Step 2).
Tests memory creation, classification, confidence hierarchy, repository CRUD, ranking,
recency decay, deduplication, user isolation, failure-safety, NovaState integration,
and LangGraph serialization.
"""

import unittest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from unittest.mock import MagicMock

from Backend.nova.memory.types import (
    MemoryRecord,
    MemoryType,
    MemorySource,
    MemoryStatus,
    MemoryCandidate,
    RetrievalQuery,
)
from Backend.nova.memory.policies import MemoryPolicies
from Backend.nova.memory.ranker import MemoryRanker
from Backend.nova.memory.extractor import MemoryExtractor
from Backend.nova.memory.manager import MemoryManager
from Backend.nova.types import NovaState
from Backend.nova.context_builder import build_nova_state


class TestNovaMemorySystem(unittest.TestCase):

    def setUp(self):
        self.user_a_id = str(uuid4())
        self.user_b_id = str(uuid4())

    def test_1_memory_creation(self):
        """Test basic MemoryRecord instantiation and validation."""
        record = MemoryRecord(
            user_id=self.user_a_id,
            memory_type=MemoryType.PREFERENCE,
            content="User prefers Python over Java",
            source=MemorySource.EXPLICIT_USER,
            confidence=1.0,
            importance=0.8,
        )
        self.assertEqual(record.user_id, self.user_a_id)
        self.assertEqual(record.memory_type, MemoryType.PREFERENCE)
        self.assertEqual(record.content, "User prefers Python over Java")
        self.assertEqual(record.confidence, 1.0)
        self.assertEqual(record.status, MemoryStatus.ACTIVE)

    def test_2_memory_serialization(self):
        """Test MemoryRecord serialization to JSON and deserialization back."""
        record = MemoryRecord(
            user_id=self.user_a_id,
            memory_type=MemoryType.GOAL,
            content="Aiming for FAANG Senior Engineer role",
            source=MemorySource.EXPLICIT_USER,
            confidence=1.0,
        )
        json_data = record.model_dump_json()
        self.assertIn("Aiming for FAANG", json_data)

        restored = MemoryRecord.model_validate_json(json_data)
        self.assertEqual(restored.id, record.id)
        self.assertEqual(restored.content, record.content)

    def test_3_memory_classification(self):
        """Test that all required memory types are supported as Enums."""
        types = [
            MemoryType.EPISODIC,
            MemoryType.SEMANTIC,
            MemoryType.PREFERENCE,
            MemoryType.GOAL,
            MemoryType.DECISION,
            MemoryType.BEHAVIORAL,
        ]
        self.assertEqual(len(types), 6)
        for t in types:
            self.assertIsInstance(t.value, str)

    def test_4_explicit_user_memory_confidence(self):
        """Test that explicit user memories receive highest confidence (1.0)."""
        conf = MemoryPolicies.resolve_confidence(MemorySource.EXPLICIT_USER)
        self.assertEqual(conf, 1.0)

    def test_5_inferred_memory_confidence(self):
        """Test that LLM inferred memories receive lower confidence (0.5)."""
        conf_inferred = MemoryPolicies.resolve_confidence(MemorySource.LLM_INFERRED)
        self.assertEqual(conf_inferred, 0.5)

        conf_observed = MemoryPolicies.resolve_confidence(MemorySource.SYSTEM_OBSERVED)
        self.assertEqual(conf_observed, 0.85)

        self.assertGreater(conf_observed, conf_inferred)

    def test_6_memory_retrieval(self):
        """Test memory filtering and query text matching in retriever."""
        ranker = MemoryRanker()
        m1 = MemoryRecord(
            user_id=self.user_a_id,
            memory_type=MemoryType.SEMANTIC,
            content="User is preparing for JEE 2026",
            confidence=1.0,
            importance=0.9,
        )
        m2 = MemoryRecord(
            user_id=self.user_a_id,
            memory_type=MemoryType.PREFERENCE,
            content="User likes morning study sessions",
            confidence=1.0,
            importance=0.5,
        )

        ranked = ranker.rank_memories([m1, m2], query_text="JEE exam preparation", limit=2)
        self.assertEqual(len(ranked), 2)
        self.assertEqual(ranked[0].id, m1.id)

    def test_7_ranking(self):
        """Test multi-signal ranking ordering."""
        ranker = MemoryRanker()

        m_high = MemoryRecord(
            user_id=self.user_a_id,
            content="Crucial goal: Launch SaaS startup",
            importance=0.95,
            confidence=1.0,
        )
        m_low = MemoryRecord(
            user_id=self.user_a_id,
            content="Minor note: Prefers blue theme",
            importance=0.2,
            confidence=0.5,
        )

        score_high = ranker.score_memory(m_high, query_text="startup SaaS")
        score_low = ranker.score_memory(m_low, query_text="startup SaaS")

        self.assertGreater(score_high, score_low)

    def test_8_recency_behavior(self):
        """Test recency decay calculation."""
        ranker = MemoryRanker(half_life_days=10.0)
        now = datetime.now(timezone.utc)

        m_recent = MemoryRecord(
            user_id=self.user_a_id,
            content="Recent memory",
            updated_at=now.isoformat(),
        )
        m_old = MemoryRecord(
            user_id=self.user_a_id,
            content="Old memory",
            updated_at=(now - timedelta(days=20)).isoformat(),
        )

        rec_recent = ranker.calculate_recency_score(m_recent, now)
        rec_old = ranker.calculate_recency_score(m_old, now)

        self.assertGreater(rec_recent, rec_old)
        self.assertAlmostEqual(rec_recent, 1.0, delta=0.01)

    def test_9_importance_behavior(self):
        """Test importance score impact on ranking."""
        ranker = MemoryRanker(weight_relevance=0.0, weight_importance=1.0, weight_confidence=0.0, weight_recency=0.0)
        m1 = MemoryRecord(user_id=self.user_a_id, content="Important", importance=0.9)
        m2 = MemoryRecord(user_id=self.user_a_id, content="Unimportant", importance=0.1)

        self.assertGreater(ranker.score_memory(m1), ranker.score_memory(m2))

    def test_10_duplicate_update_behavior(self):
        """Test write policy duplicate detection."""
        mock_repo = MagicMock()
        existing_mem = MemoryRecord(
            user_id=self.user_a_id,
            content="Prefers dark mode",
            confidence=0.8,
            importance=0.5,
        )
        mock_repo.list_user_memories.return_value = [existing_mem]

        cand = MemoryCandidate(
            memory_type=MemoryType.PREFERENCE,
            content="Prefers dark mode",
            source=MemorySource.EXPLICIT_USER,
            confidence=1.0,
            importance=0.9,
        )

        db = MagicMock()
        MemoryPolicies.apply_write_policy(db, mock_repo, self.user_a_id, cand)

        # Should call update_memory rather than create_memory
        mock_repo.update_memory.assert_called_once()

    def test_11_memory_deletion_archive(self):
        """Test forget policy archiving."""
        mock_repo = MagicMock()

        db = MagicMock()
        MemoryPolicies.apply_forget_policy(db, mock_repo, self.user_a_id, "mem-123", hard_delete=False)

        mock_repo.delete_or_archive_memory.assert_called_with(db, memory_id="mem-123", user_id=self.user_a_id, hard_delete=False)

    def test_12_user_isolation(self):
        """Test repository user_id isolation."""
        mgr = MemoryManager()
        db = MagicMock()

        # Mock list return for user A only
        mgr.repo.list_user_memories = MagicMock(return_value=[
            MemoryRecord(user_id=self.user_a_id, content="User A Secret")
        ])

        results_a = mgr.retrieve(db, user_id=self.user_a_id)
        self.assertEqual(len(results_a), 1)

        # Mock list return for user B (empty)
        mgr.repo.list_user_memories = MagicMock(return_value=[])
        results_b = mgr.retrieve(db, user_id=self.user_b_id)
        self.assertEqual(len(results_b), 0)

    def test_13_empty_memory_behavior(self):
        """Test graceful response when user has no memories."""
        mgr = MemoryManager()
        db = MagicMock()
        mgr.repo.list_user_memories = MagicMock(return_value=[])

        memories = mgr.retrieve(db, user_id=self.user_a_id)
        self.assertEqual(memories, [])

    def test_14_novastate_integration(self):
        """Test that NovaState stores and renders memories."""
        state = NovaState()
        mem = MemoryRecord(
            user_id=self.user_a_id,
            memory_type=MemoryType.PREFERENCE,
            content="Prefers concise code examples",
            source=MemorySource.EXPLICIT_USER,
            confidence=1.0,
        )
        state.memories.append(mem)

        prompt_block = state.to_prompt_block()
        self.assertIn("[Retrieved Personal Memories]", prompt_block)
        self.assertIn("Prefers concise code examples", prompt_block)

    def test_15_langgraph_serialization_with_memories(self):
        """Test LangGraph dict serialization with active memories."""
        state = NovaState()
        mem = MemoryRecord(
            user_id=self.user_a_id,
            memory_type=MemoryType.GOAL,
            content="Launch GrowthOS Nova",
            confidence=1.0,
        )
        state.memories.append(mem)

        lg_dict = state.to_langgraph_dict()
        self.assertIn("memories", lg_dict)
        self.assertEqual(len(lg_dict["memories"]), 1)
        self.assertEqual(lg_dict["memories"][0]["content"], "Launch GrowthOS Nova")

        # Deserialization test
        restored = NovaState.from_langgraph_dict(lg_dict)
        self.assertEqual(len(restored.memories), 1)
        self.assertEqual(restored.memories[0].content, "Launch GrowthOS Nova")

    def test_16_failure_safe_behavior(self):
        """Test zero-crash principle when database or retrieval raises an exception."""
        # Simulated DB failure in build_nova_state
        broken_db = MagicMock()
        broken_db.query.side_effect = Exception("DB Connection Lost")

        # Must not raise exception, memories must default to empty list
        state = build_nova_state(user_id=self.user_a_id, db=broken_db, user_message="Hello")
        self.assertIsInstance(state, NovaState)
        self.assertEqual(state.memories, [])


if __name__ == "__main__":
    unittest.main()
