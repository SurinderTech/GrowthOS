"""
Backend/tests/test_nova_graph.py

Unit Test Suite for NOVA Reasoning & Execution Graph Engine (Step 3).
Tests graph compilation, node execution, memory context injection, response generation,
routing decisions, post-turn memory extraction, and error resilience.
"""

import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from Backend.nova.graph.builder import build_nova_graph, get_nova_graph, run_nova_graph
from Backend.nova.graph.nodes import (
    load_context_node,
    reason_node,
    response_node,
    memory_update_node,
)
from Backend.nova.types import NovaState, ReasoningContext
from Backend.nova.memory.types import MemoryRecord, MemoryType, MemorySource
from Backend.nova.llm.provider import NovaLLMProvider


class TestNovaGraphEngine(unittest.TestCase):

    def setUp(self):
        self.user_id = str(uuid4())
        # Use a mock client without API key to ensure instant deterministic fallback execution
        self.mock_provider = NovaLLMProvider(client=MagicMock(api_key=None))

    def test_1_graph_construction(self):
        """Verify that build_nova_graph() compiles a valid LangGraph instance."""
        graph = build_nova_graph()
        self.assertIsNotNone(graph)
        self.assertTrue(hasattr(graph, "invoke"))

    def test_2_normal_user_request(self):
        """Test end-to-end execution of a normal user prompt through run_nova_graph()."""
        with patch("Backend.nova.graph.nodes.get_nova_llm_provider", return_value=self.mock_provider):
            result = run_nova_graph(
                user_message="What should I study today?",
                override_profile={"name": "Alex", "primary_goal": "Learn Python"},
            )

        self.assertIn("response", result)
        self.assertIsInstance(result["response"], str)
        self.assertTrue(len(result["response"]) > 0)
        self.assertIsInstance(result["state"], NovaState)
        self.assertEqual(result["execution_stage"], "turn_completed")

    def test_3_novastate_node_flow(self):
        """Test that NovaState moves through nodes and accumulates data."""
        state_payload = {"user_message": "Tell me about my roadmap"}

        # 1. Load Context Node
        state_payload = load_context_node(state_payload)
        self.assertIn("nova_state", state_payload)
        self.assertEqual(state_payload["execution_stage"], "context_assembled")

        # 2. Reason Node
        state_payload = reason_node(state_payload, provider=self.mock_provider)
        self.assertIn("route", state_payload)
        self.assertEqual(state_payload["execution_stage"], "reasoning_completed")

        # 3. Response Node
        state_payload = response_node(state_payload, provider=self.mock_provider)
        self.assertIn("final_response", state_payload)
        self.assertEqual(state_payload["execution_stage"], "response_generated")

        # 4. Memory Update Node
        state_payload = memory_update_node(state_payload)
        self.assertEqual(state_payload["execution_stage"], "turn_completed")

    def test_4_retrieved_memories_reach_reasoning_context(self):
        """Verify retrieved memories reach NovaState and prompt block."""
        state = NovaState()
        mem = MemoryRecord(
            user_id=self.user_id,
            memory_type=MemoryType.PREFERENCE,
            content="User prefers deep focus mornings",
            confidence=1.0,
        )
        state.memories.append(mem)

        prompt_block = state.to_prompt_block()
        self.assertIn("[Retrieved Personal Memories]", prompt_block)
        self.assertIn("User prefers deep focus mornings", prompt_block)

    def test_5_response_generation(self):
        """Test response node generation logic."""
        state = NovaState()
        state.update_user_message("How do I stay consistent?")

        payload = {"nova_state": state.model_dump()}
        output_payload = response_node(payload, provider=self.mock_provider)

        self.assertIn("final_response", output_payload)
        self.assertIsNotNone(output_payload["final_response"])

    def test_6_correct_routing_decision(self):
        """Test reasoning node populates reasoning context and route."""
        state = NovaState()
        state.update_user_message("Explain Python list comprehensions")

        payload = {"nova_state": state.model_dump()}
        output_payload = reason_node(payload, provider=self.mock_provider)

        restored_state = NovaState.model_validate(output_payload["nova_state"])
        self.assertIsNotNone(restored_state.reasoning)
        self.assertEqual(restored_state.reasoning.route, "direct_answer")

    def test_7_memory_update_triggered_after_turn(self):
        """Verify memory_update_node extracts and remembers user facts."""
        mock_db = MagicMock()
        mock_state = NovaState()
        mock_state.user.user_id = self.user_id

        payload = {
            "db": mock_db,
            "user_id": self.user_id,
            "user_message": "I prefer studying Rust over C++",
            "nova_state": mock_state.model_dump(),
        }

        with patch("Backend.nova.graph.nodes.get_memory_manager") as mock_get_mgr:
            mock_mgr = MagicMock()
            mock_get_mgr.return_value = mock_mgr

            memory_update_node(payload)
            mock_mgr.extract_and_remember.assert_called_once()

    def test_8_memory_failure_resilience(self):
        """Verify memory update failure does not crash the turn."""
        mock_db = MagicMock()
        payload = {
            "db": mock_db,
            "user_id": self.user_id,
            "user_message": "My goal is to learn Go",
            "nova_state": NovaState().model_dump(),
        }

        with patch("Backend.nova.graph.nodes.get_memory_manager") as mock_get_mgr:
            mock_mgr = MagicMock()
            mock_mgr.extract_and_remember.side_effect = Exception("DB Connection Timeout")
            mock_get_mgr.return_value = mock_mgr

            # Should not raise exception
            result = memory_update_node(payload)
            self.assertEqual(result["execution_stage"], "turn_completed")

    def test_9_llm_failure_resilience(self):
        """Verify LLM failure yields a safe fallback response without crashing."""
        broken_provider = MagicMock()
        broken_provider.generate_response.side_effect = Exception("LLM Provider 503 Overloaded")
        broken_provider.generate_json.side_effect = Exception("LLM Provider 503 Overloaded")

        with patch("Backend.nova.graph.nodes.get_nova_llm_provider", return_value=broken_provider):
            result = run_nova_graph(
                user_message="Hello Nova",
                override_profile={"name": "TestUser"},
            )

            self.assertIn("response", result)
            self.assertIsInstance(result["response"], str)
            self.assertTrue(len(result["response"]) > 0)


if __name__ == "__main__":
    unittest.main()
