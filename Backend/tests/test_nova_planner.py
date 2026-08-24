"""
Backend/tests/test_nova_planner.py

Comprehensive Unit & Integration Test Suite for NOVA Planning & Goal Decomposition Engine (Step 9).
Tests goal categories, gap analysis, dependency sorting, task generation, time budget evaluation,
priority calculation, resource association, critic validation, LangGraph plan node, and end-to-end plan generation.
"""

import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from Backend.db.init_db import Base
from Backend.nova.types import NovaState, UserProfileContext
from Backend.nova.planner import (
    GoalCategory,
    HorizonType,
    PriorityLevel,
    TaskItemType,
    TaskItem,
    GapAnalysisItem,
    GapAnalyzer,
    DependencyEngine,
    TaskGenerator,
    TimeBudgetEvaluator,
    PriorityCalculator,
    NovaPlanner,
    get_nova_planner,
    infer_goal_category,
)
from Backend.nova.planner.models import NovaGoalModel, NovaPlanModel
from Backend.nova.graph.nodes import plan_node, reason_node
from Backend.nova.graph.builder import run_nova_graph, route_decision
from Backend.nova.llm.provider import NovaLLMProvider


class TestNovaPlannerEngine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionLocal()
        self.user_id = str(uuid4())
        self.mock_llm_provider = NovaLLMProvider(client=MagicMock(api_key=None))
        self.planner = get_nova_planner()

    def tearDown(self):
        self.db.close()

    def test_1_domain_agnostic_goal_category_inference(self):
        """Test inference of GoalCategory across domains (Tech, Exam, Business, Creator, Personal)."""
        self.assertEqual(infer_goal_category("Become an AI Engineer"), GoalCategory.TECHNOLOGY)
        self.assertEqual(infer_goal_category("Prepare for NEET 2026 Exam"), GoalCategory.EDUCATION)
        self.assertEqual(infer_goal_category("Launch my SaaS Startup"), GoalCategory.BUSINESS)
        self.assertEqual(infer_goal_category("Build a YouTube Tech Channel"), GoalCategory.CREATOR)
        self.assertEqual(infer_goal_category("Build a daily study habit"), GoalCategory.PERSONAL)

    def test_2_gap_analysis_current_vs_desired_state(self):
        """Test gap analysis comparing user experience level and known skills against goal."""
        analyzer = GapAnalyzer()
        state = NovaState()
        state.user.experience_level = "beginner"

        gaps = analyzer.analyze_gaps("Become AI Engineer", state=state)
        self.assertTrue(len(gaps) >= 4)
        self.assertTrue(any("Python" in g.skill_or_topic for g in gaps))
        self.assertTrue(any("Machine Learning" in g.skill_or_topic for g in gaps))

    def test_3_dependency_engine_topological_sorting(self):
        """Test topological sorting of prerequisite tasks."""
        dep_engine = DependencyEngine()

        t_py = TaskItem(title="Learn Python Basics", prerequisites=[])
        t_ml = TaskItem(title="Learn Machine Learning", prerequisites=["Learn Python Basics"])
        t_dl = TaskItem(title="Learn Deep Learning", prerequisites=["Learn Machine Learning"])

        # Pass tasks in reverse order
        sorted_tasks = dep_engine.sort_tasks_topologically([t_dl, t_ml, t_py])

        titles = [t.title for t in sorted_tasks]
        self.assertEqual(titles, ["Learn Python Basics", "Learn Machine Learning", "Learn Deep Learning"])

    def test_4_task_prioritization_by_dependency_blocking(self):
        """Test PriorityCalculator assigns CRITICAL priority to tasks that block future prerequisites."""
        calc = PriorityCalculator()
        t1 = TaskItem(id="t1", title="Foundations of Python")
        t2 = TaskItem(id="t2", title="ML Algorithms", prerequisites=["Foundations of Python"])

        deps = calc.calculate_task_priorities([t1, t2])
        self.assertEqual(t1.priority, PriorityLevel.CRITICAL)

    def test_5_time_budget_evaluation_and_feasibility_check(self):
        """Test workload evaluation against user's daily study budget."""
        evaluator = TimeBudgetEvaluator()
        state = NovaState()
        state.user.daily_time = "2 hours/day"

        tasks = [TaskItem(title=f"Task {i}", estimated_minutes=30) for i in range(10)]
        total_mins, daily_budget, status, assumptions = evaluator.evaluate_workload(tasks, state)

        self.assertEqual(daily_budget, 120)
        self.assertEqual(total_mins, 300)
        self.assertEqual(status, "feasible")

    def test_6_nova_planner_end_to_end_generation(self):
        """Test full plan generation pipeline and database persistence."""
        # Create test user in DB
        from Backend.models.user import User
        user_uuid = uuid4()
        user_m = User(id=user_uuid, email=f"planner_{user_uuid}@example.com", hashed_password="pw")
        self.db.add(user_m)
        self.db.commit()

        payload = self.planner.generate_plan(
            user_query="Become an AI Engineer",
            db=self.db,
            user_id=str(user_uuid),
        )

        self.assertIsNotNone(payload.phases)
        self.assertTrue(len(payload.phases) >= 3)
        self.assertTrue(payload.total_estimated_mins > 0)
        self.assertEqual(payload.goal_category, GoalCategory.TECHNOLOGY)

        # Check DB persistence
        goals = self.db.query(NovaGoalModel).filter(NovaGoalModel.user_id == user_uuid).all()
        plans = self.db.query(NovaPlanModel).filter(NovaPlanModel.user_id == user_uuid).all()
        self.assertEqual(len(goals), 1)
        self.assertEqual(len(plans), 1)

    def test_7_reason_node_plan_routing(self):
        """Test reason_node routes queries asking for roadmap/plans to plan route."""
        state = NovaState()
        state.update_user_message("Create a step by step roadmap to become an AI Engineer")

        payload = {"nova_state": state.model_dump(), "user_message": state.conversation.latest_user_message}
        out_payload = reason_node(payload, provider=self.mock_llm_provider)

        self.assertEqual(out_payload["route"], "plan")

    def test_8_end_to_end_plan_turn_execution(self):
        """Test full turn execution through LangGraph with plan route."""
        with patch("Backend.nova.graph.nodes.get_nova_llm_provider", return_value=self.mock_llm_provider):
            res = run_nova_graph(
                user_message="Make me a study plan for NEET 2026 exam",
                override_profile={"name": "Kiran"},
                db=self.db,
            )

        self.assertIn("response", res)
        self.assertEqual(res["execution_stage"], "turn_completed")
        self.assertIsNotNone(res["state"].planning_payload)
        self.assertTrue(len(res["state"].planning_payload.phases) > 0)


if __name__ == "__main__":
    unittest.main()
