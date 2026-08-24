"""
Backend/tests/test_nova_critic.py

Comprehensive Unit & Integration Test Suite for NOVA Critic, Verification Engine & Controlled Retry Engine (Step 8).
Tests draft evaluation, 14 scoring signals, deterministic checks, claim verification, adaptive intensity,
retry budget enforcement, LangGraph critic node routing, and end-to-end self-correction.
"""

import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from Backend.db.init_db import Base
from Backend.nova.types import NovaState, KnowledgeContextPayload, KnowledgeContext
from Backend.nova.research.types import ResearchContextPayload, SearchResult
from Backend.nova.critic import (
    CriticAction,
    VerificationStatus,
    VerificationIntensity,
    CriticResult,
    VerificationResult,
    CriticEvaluator,
    VerifierEngine,
    ControlledRetryEngine,
    CriticManager,
    get_critic_manager,
    determine_verification_intensity,
    is_valid_url,
)
from Backend.nova.critic.models import CriticTelemetryModel
from Backend.nova.graph.nodes import critic_node
from Backend.nova.graph.builder import run_nova_graph, retry_decision
from Backend.nova.llm.provider import NovaLLMProvider


class TestNovaCriticEngine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionLocal()
        self.user_id = str(uuid4())
        self.mock_llm_provider = NovaLLMProvider(client=MagicMock(api_key=None))
        self.manager = get_critic_manager()

    def tearDown(self):
        self.db.close()

    def test_1_adaptive_verification_intensity_selection(self):
        """Test selection of NONE for simple greetings vs FULL for complex/research queries."""
        self.assertEqual(determine_verification_intensity("hello", "direct_answer"), VerificationIntensity.NONE)
        self.assertEqual(determine_verification_intensity("thanks", "direct_answer"), VerificationIntensity.NONE)
        self.assertEqual(determine_verification_intensity("What are the latest AI engineering trends in 2026?", "research"), VerificationIntensity.FULL)

    def test_2_deterministic_url_and_citation_verification(self):
        """Test URL syntax checking and source citation matching."""
        verifier = VerifierEngine()

        self.assertTrue(is_valid_url("https://docs.python.org/3/"))
        self.assertTrue(is_valid_url("growthos://knowledge/123"))
        self.assertFalse(is_valid_url("ht!tp://invalid url"))

        state = NovaState()
        state.research_payload = ResearchContextPayload(
            query="Python 3.14",
            results=[SearchResult(title="Python Docs", snippet="Python 3.14 features", url="https://docs.python.org/3.14/")]
        )

        draft = "Python 3.14 introduced new features. See [Python Docs](https://docs.python.org/3.14/)."
        v_res = verifier.verify(draft, state=state)

        self.assertTrue(v_res.deterministic_checks_passed)

    def test_3_semantic_claim_level_evidence_verification(self):
        """Test claim extraction and evidence grounding status (SUPPORTED vs UNSUPPORTED)."""
        verifier = VerifierEngine()

        state = NovaState()
        state.retrieved_knowledge = [
            KnowledgeContext(content="Recursion involves a base case and recursive call stack.", source="note.txt")
        ]

        supported_draft = "Recursion involves a base case and recursive call stack."
        v_supported = verifier.verify(supported_draft, state=state)
        self.assertTrue(v_supported.claims_verified > 0)
        self.assertEqual(v_supported.claim_details[0].status, VerificationStatus.SUPPORTED)

        unsupported_draft = "Quantum computing uses 512 qubits for rocket propulsion physics."
        v_unsupported = verifier.verify(unsupported_draft, state=state)
        self.assertEqual(v_unsupported.claim_details[0].status, VerificationStatus.UNSUPPORTED)

    def test_4_freshness_and_intent_failure_detection(self):
        """Verify Critic flags freshness failure when current information is requested without web search."""
        evaluator = CriticEvaluator()
        state = NovaState()
        state.update_user_message("What are the latest AI engineering trends in 2026?")

        draft = "AI engineering is a field of computer science."
        res = evaluator.evaluate(draft, state=state, intensity=VerificationIntensity.FULL)

        self.assertFalse(res.passed)
        self.assertEqual(res.action, CriticAction.RESEARCH_AGAIN)
        self.assertIn("Freshness failure", res.retry_reason)

    def test_5_controlled_retry_budget_enforcement(self):
        """Test that ControlledRetryEngine caps retries at 3 total execution attempts max."""
        retry_engine = ControlledRetryEngine()
        critic_res = CriticResult(passed=False, action=CriticAction.REVISE, retry_reason="Quality issue")

        # Attempt 1 -> Approved REVISE
        act1 = retry_engine.evaluate_retry_budget(critic_res, execution_attempt=1, retry_count=0)
        self.assertEqual(act1, CriticAction.REVISE)

        # Attempt 3 (Budget exhausted) -> Forced PASS
        act3 = retry_engine.evaluate_retry_budget(critic_res, execution_attempt=3, retry_count=2)
        self.assertEqual(act3, CriticAction.PASS)
        self.assertTrue(critic_res.passed)

    def test_6_critic_manager_telemetry_recording(self):
        """Test end-to-end Critic decision making and telemetry database persistence."""
        state = NovaState()
        state.update_user_message("Explain recursion")

        # Create test user in DB to satisfy foreign key constraint
        from Backend.models.user import User
        user_uuid = uuid4()
        user_m = User(id=user_uuid, email=f"critic_{user_uuid}@example.com", hashed_password="pw")
        self.db.add(user_m)
        self.db.commit()

        payload = self.manager.evaluate_verify_and_decide(
            draft_response="Recursion is a programming technique where a function calls itself.",
            state=state,
            db=self.db,
            user_id=str(user_uuid),
            execution_attempt=1,
        )

        self.assertIsNotNone(payload.critic_result)
        self.assertTrue(payload.critic_result.passed)
        self.assertEqual(payload.critic_result.action, CriticAction.PASS)

        # Verify telemetry record in DB
        telemetry_rows = self.db.query(CriticTelemetryModel).filter(CriticTelemetryModel.user_id == user_uuid).all()
        self.assertEqual(len(telemetry_rows), 1)
        self.assertEqual(telemetry_rows[0].critic_action, "pass")

    def test_7_retry_decision_graph_router(self):
        """Test retry_decision conditional edge mapping."""
        self.assertEqual(retry_decision({"critic_action": "pass"}), "update_memory")
        self.assertEqual(retry_decision({"critic_action": "revise"}), "generate_response")
        self.assertEqual(retry_decision({"critic_action": "research_again"}), "execute_research")
        self.assertEqual(retry_decision({"critic_action": "retrieve_again"}), "execute_knowledge")
        self.assertEqual(retry_decision({"critic_action": "resource_again"}), "execute_resource")
        self.assertEqual(retry_decision({"critic_action": "replan"}), "reason")

    def test_8_critic_node_execution(self):
        """Test execution of critic_node in LangGraph dictionary payload."""
        state = NovaState()
        state.update_user_message("Hello, how are you?")
        state.draft_response = "Hello! I am NOVA, your intelligent AI operating assistant."

        payload = {"nova_state": state.model_dump(), "draft_response": state.draft_response, "user_id": self.user_id}
        out_payload = critic_node(payload)

        self.assertEqual(out_payload["critic_action"], "pass")
        self.assertTrue(out_payload["critic_passed"])

    def test_9_end_to_end_turn_execution_with_critic_loop(self):
        """Test full turn execution through LangGraph including critic and verifier node."""
        with patch("Backend.nova.graph.nodes.get_nova_llm_provider", return_value=self.mock_llm_provider):
            res = run_nova_graph(
                user_message="Explain recursion in Python",
                override_profile={"name": "Kiran"},
                db=self.db,
            )

        self.assertIn("response", res)
        self.assertEqual(res["execution_stage"], "turn_completed")
        self.assertIsNotNone(res["state"].critic_payload)
        self.assertTrue(res["state"].critic_payload.critic_result.passed)


if __name__ == "__main__":
    unittest.main()
