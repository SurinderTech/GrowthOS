"""
Backend/tests/test_nova_state.py

Unit tests for NOVA State & Context Layer (Step 1).
Tests Pydantic validation, serializability, prompt formatting, context building,
and LangGraph dict conversion using built-in unittest framework.
"""

import unittest
import json
from uuid import uuid4

from Backend.nova.types import (
    NovaState,
    UserProfileContext,
    GoalContext,
    TaskItem,
    ChatMessage,
    SkillItem,
)
from Backend.nova.context_builder import build_nova_state


class TestNovaState(unittest.TestCase):

    def test_nova_state_default_instantiation(self):
        """Verify NovaState default values and structural health."""
        state = NovaState()

        self.assertEqual(state.user.user_type, "student")
        self.assertIsNone(state.conversation.latest_user_message)
        self.assertIsInstance(state.current_task.todays_tasks, list)
        self.assertEqual(len(state.memories), 0)
        self.assertEqual(len(state.retrieved_knowledge), 0)
        self.assertEqual(len(state.research_results), 0)
        self.assertIsNone(state.plan)
        self.assertIsNone(state.critique)

    def test_nova_state_serialization(self):
        """Verify that NovaState can be serialized to JSON and deserialized cleanly."""
        state = NovaState()
        state.user.name = "Alex Dev"
        state.user.primary_goal = "Crack Software Engineering"
        state.update_user_message("What should I focus on today?")

        # Pydantic json dump
        json_str = state.model_dump_json()
        self.assertIn("Alex Dev", json_str)
        self.assertIn("Crack Software Engineering", json_str)

        # Deserialization test
        reconstructed = NovaState.model_validate_json(json_str)
        self.assertEqual(reconstructed.user.name, "Alex Dev")
        self.assertEqual(reconstructed.conversation.latest_user_message, "What should I focus on today?")

    def test_nova_state_langgraph_dict_conversion(self):
        """Verify native dict conversion for LangGraph state update nodes."""
        state = NovaState()
        state.user.user_type = "entrepreneur"
        state.user.country = "India"

        # LangGraph dict export
        lg_dict = state.to_langgraph_dict()
        self.assertIsInstance(lg_dict, dict)
        self.assertEqual(lg_dict["user"]["user_type"], "entrepreneur")

        # LangGraph dict re-import
        restored_state = NovaState.from_langgraph_dict(lg_dict)
        self.assertEqual(restored_state.user.user_type, "entrepreneur")
        self.assertEqual(restored_state.user.country, "India")

    def test_prompt_block_formatting(self):
        """Verify that to_prompt_block() outputs rich structured context."""
        state = NovaState()
        state.user.name = "Priya"
        state.user.primary_goal = "Build AI Startups"
        state.user.twelve_month_goal = "Launch MVP"
        state.progress_context.current_streak = 12
        state.progress_context.total_xp = 1450
        state.progress_context.skills.append(SkillItem(topic="Python", progress_pct=85))
        state.current_task.todays_tasks.append(
            TaskItem(id="t1", title="Complete Nova Architecture", completed=True)
        )
        state.current_task.completed_today.append(
            state.current_task.todays_tasks[0]
        )
        state.update_user_message("Suggest next steps for my learning path")

        prompt_text = state.to_prompt_block()

        self.assertIn("Priya", prompt_text)
        self.assertIn("Build AI Startups", prompt_text)
        self.assertIn("12 days", prompt_text)
        self.assertIn("Python (85%)", prompt_text)
        self.assertIn("Complete Nova Architecture", prompt_text)
        self.assertIn("Suggest next steps for my learning path", prompt_text)

    def test_context_builder_standalone(self):
        """Verify build_nova_state in standalone mode with override profile."""
        mock_profile = {
            "name": "Sarah",
            "user_type": "freelancer",
            "primary_goal": "Scale agency to $10k/mo",
            "daily_time": "4+hours",
            "interests": ["copywriting", "ai"],
        }

        state = build_nova_state(
            user_message="How do I get my first client?",
            override_profile=mock_profile,
        )

        self.assertEqual(state.user.name, "Sarah")
        self.assertEqual(state.user.user_type, "freelancer")
        self.assertEqual(state.user.primary_goal, "Scale agency to $10k/mo")
        self.assertEqual(state.conversation.latest_user_message, "How do I get my first client?")
        self.assertEqual(state.metadata.execution_stage, "context_assembled")


if __name__ == "__main__":
    unittest.main()
