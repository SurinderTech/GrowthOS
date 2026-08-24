"""
Backend/tests/test_nova_adaptive.py

Comprehensive Unit & Integration Test Suite for NOVA Adaptive Planning & Replanning Engine (Step 11).
Tests adaptation decisions, threshold evaluation, minimal-change principle, plan versioning, plan diff calculation,
completed-work preservation, stability cooldowns, and 5 end-to-end scenarios.
"""

import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from Backend.db.init_db import Base
from Backend.nova.types import NovaState
from Backend.nova.planner import NovaPlanner, PlanningPayload, TaskItem
from Backend.nova.progress import AdaptationSignal, AdaptationSignalType, ProgressSignal, ProgressSignalType
from Backend.nova.adaptive import (
    AdaptationDecisionType,
    AdaptationLevel,
    AdaptationDecisionEngine,
    PlanDiffCalculator,
    AdaptiveReplanner,
    AdaptationCooldownManager,
    AdaptivePlanningManager,
    get_adaptive_manager,
)
from Backend.nova.graph.nodes import adapt_node
from Backend.nova.graph.builder import run_nova_graph
from Backend.nova.llm.provider import NovaLLMProvider


class TestNovaAdaptiveEngine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionLocal()
        self.user_id = str(uuid4())
        self.mock_llm_provider = NovaLLMProvider(client=MagicMock(api_key=None))
        self.manager = get_adaptive_manager()

    def tearDown(self):
        self.db.close()

    def test_1_e2e_scenario_5_no_replan_for_minor_variation(self):
        """Scenario 5: User completes task 10 mins late -> NO_CHANGE decision, no replan."""
        decision_engine = AdaptationDecisionEngine(cooldown_mgr=AdaptationCooldownManager())
        dec = decision_engine.evaluate_decision(user_query="I completed task 10 minutes late")

        self.assertEqual(dec.decision, AdaptationDecisionType.NO_CHANGE)
        self.assertEqual(dec.level, AdaptationLevel.TASK)

    def test_2_e2e_scenario_1_struggle_adaptation_prerequisite_insertion(self):
        """Scenario 1: User repeatedly fails recursion tasks -> INSERT_PREREQUISITE adaptation -> Plan v2 generated."""
        planner = NovaPlanner()
        old_plan = planner.generate_plan("Learn Computer Science", db=self.db, user_id=self.user_id)
        old_plan.plan_version = 1

        adapt_signals = [
            AdaptationSignal(
                adaptation_type=AdaptationSignalType.INSERT_PREREQUISITE,
                reason="User experienced repeated failures on recursion tasks.",
                target_task_id="t_recursion",
            )
        ]

        decision_engine = AdaptationDecisionEngine(cooldown_mgr=AdaptationCooldownManager(cooldown_hours=0))
        dec = decision_engine.evaluate_decision(adaptation_signals=adapt_signals)

        self.assertEqual(dec.decision, AdaptationDecisionType.INSERT_PREREQUISITE)

        replanner = AdaptiveReplanner(planner=planner)
        new_plan = replanner.execute_replan(dec, old_plan, "Learn Computer Science", db=self.db, user_id=self.user_id)

        self.assertEqual(new_plan.plan_version, 2)
        diff_calc = PlanDiffCalculator()
        diff = diff_calc.compute_diff(old_plan, new_plan)
        self.assertTrue(len(diff.diffs) > 0)

    def test_3_e2e_scenario_2_high_capacity_adaptation(self):
        """Scenario 2: User completes tasks 3x faster -> INCREASE_WORKLOAD adaptation."""
        adapt_signals = [
            AdaptationSignal(
                adaptation_type=AdaptationSignalType.INCREASE_WORKLOAD,
                reason="User completed task 3x faster than estimated pace.",
            )
        ]

        decision_engine = AdaptationDecisionEngine(cooldown_mgr=AdaptationCooldownManager(cooldown_hours=0))
        dec = decision_engine.evaluate_decision(adaptation_signals=adapt_signals)

        self.assertEqual(dec.decision, AdaptationDecisionType.INCREASE_WORKLOAD)
        self.assertEqual(dec.level, AdaptationLevel.PHASE)

    def test_4_e2e_scenario_3_time_constraint_adaptation(self):
        """Scenario 3: User says 'I only have 45 minutes now' -> ADJUST_TIMELINE adaptation."""
        decision_engine = AdaptationDecisionEngine(cooldown_mgr=AdaptationCooldownManager(cooldown_hours=0))
        dec = decision_engine.evaluate_decision(user_query="I only have 45 minutes now")

        self.assertEqual(dec.decision, AdaptationDecisionType.ADJUST_TIMELINE)
        self.assertEqual(dec.level, AdaptationLevel.PLAN)

    def test_5_e2e_scenario_4_goal_change_and_completed_work_preservation(self):
        """Scenario 4: User changes goal to AI Engineering -> REPLAN_GOAL, preserves finished tasks."""
        planner = NovaPlanner()
        old_plan = planner.generate_plan("Become an AI Engineer", db=self.db, user_id=self.user_id)
        old_plan.plan_version = 1

        # Mark Python task as completed in old_plan
        if old_plan.phases and old_plan.phases[0].milestones and old_plan.phases[0].milestones[0].objectives:
            old_plan.phases[0].milestones[0].objectives[0].tasks[0].status = "completed"

        decision_engine = AdaptationDecisionEngine(cooldown_mgr=AdaptationCooldownManager(cooldown_hours=0))
        dec = decision_engine.evaluate_decision(user_query="I want to focus on AI Engineering instead")

        self.assertEqual(dec.decision, AdaptationDecisionType.REPLAN_GOAL)
        self.assertEqual(dec.level, AdaptationLevel.GOAL)

        replanner = AdaptiveReplanner(planner=planner)
        new_plan = replanner.execute_replan(dec, old_plan, "Become an AI Engineer", db=self.db, user_id=self.user_id)

        self.assertEqual(new_plan.plan_version, 2)
        # Verify Python task remains completed in Plan v2
        completed_count = 0
        for p in new_plan.phases:
            for ms in p.milestones:
                for obj in ms.objectives:
                    for t in obj.tasks:
                        if t.status == "completed":
                            completed_count += 1
        self.assertTrue(completed_count >= 1)

    def test_6_cooldown_manager_stability_check(self):
        """Test cooldown manager suppresses rapid minor background replans within 24h."""
        cooldown_mgr = AdaptationCooldownManager(cooldown_hours=24)
        cooldown_mgr.record_replan(self.user_id)

        self.assertTrue(cooldown_mgr.is_cooldown_active(self.user_id, is_major_change=False))
        self.assertFalse(cooldown_mgr.is_cooldown_active(self.user_id, is_major_change=True))

    def test_7_langgraph_adapt_node_integration(self):
        """Test adapt_node and route_decision integration with LangGraph."""
        with patch("Backend.nova.graph.nodes.get_nova_llm_provider", return_value=self.mock_llm_provider):
            res = run_nova_graph(
                user_message="I want to focus on AI Engineering instead and replan my roadmap",
                override_profile={"name": "Kiran"},
                db=self.db,
            )

        self.assertIn("response", res)
        self.assertEqual(res["execution_stage"], "turn_completed")
        self.assertIsNotNone(res["state"].adaptive_payload)
        self.assertEqual(res["state"].adaptive_payload.decision.decision, AdaptationDecisionType.REPLAN_GOAL)


if __name__ == "__main__":
    unittest.main()
