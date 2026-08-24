"""
Backend/tests/test_nova_resources.py

Comprehensive Unit & Integration Test Suite for NOVA Resource Intelligence & Personalized Discovery (Step 7).
Tests candidate discovery, 8-signal evaluation, personalization ranking, bundle creation,
history penalty avoidance, LangGraph routing, and error resilience.
"""

import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from Backend.db.init_db import Base
from Backend.nova.types import NovaState, UserProfileContext, GoalContext
from Backend.nova.resources import (
    ResourceType,
    ResourceMode,
    ResourceItem,
    ScoredResource,
    ResourceBundle,
    ResourceEvaluator,
    ResourceRanker,
    ResourceRecommender,
    ResourceSearcher,
    ResourceManager,
    get_resource_manager,
    infer_resource_type_and_platform,
    infer_resource_mode,
)
from Backend.nova.resources.models import ResourceModel, UserResourceModel, ResourceInteractionModel
from Backend.nova.graph.nodes import reason_node, resource_node
from Backend.nova.graph.builder import run_nova_graph
from Backend.nova.llm.provider import NovaLLMProvider


class TestNovaResourceIntelligence(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionLocal()
        self.user_id = str(uuid4())
        self.mock_llm_provider = NovaLLMProvider(client=MagicMock(api_key=None))
        self.manager = get_resource_manager()

    def tearDown(self):
        self.db.close()

    def test_1_resource_type_and_platform_inference(self):
        """Test URL and title parsing for resource type, platform, and domain."""
        r_type, platform, domain = infer_resource_type_and_platform("https://www.youtube.com/watch?v=1234", "Recursion Explained")
        self.assertEqual(r_type, ResourceType.VIDEO)
        self.assertEqual(platform, "YouTube")
        self.assertEqual(domain, "youtube.com")

        r_type_doc, platform_doc, _ = infer_resource_type_and_platform("https://docs.python.org/3/", "Official Documentation")
        self.assertEqual(r_type_doc, ResourceType.DOCUMENTATION)
        self.assertEqual(platform_doc, "Documentation")

    def test_2_resource_mode_inference(self):
        """Test user intent classification into ResourceMode."""
        self.assertEqual(infer_resource_mode("Give me practice problems for binary trees"), ResourceMode.PRACTICE)
        self.assertEqual(infer_resource_mode("I don't understand recursion, I'm stuck"), ResourceMode.UNDERSTAND)
        self.assertEqual(infer_resource_mode("Build a full stack React project"), ResourceMode.BUILD)
        self.assertEqual(infer_resource_mode("Explain machine learning basics"), ResourceMode.LEARN)

    def test_3_contextual_query_construction(self):
        """Test construction of context-aware search queries from NovaState."""
        searcher = ResourceSearcher()
        state = NovaState()
        state.user.experience_level = "beginner"
        state.current_goal.active_mission_title = "Python Mastery"

        queries = searcher.construct_contextual_queries("recursion", state=state, mode=ResourceMode.PRACTICE)
        self.assertTrue(any("practice" in q for q in queries))
        self.assertTrue(any("beginner" in q for q in queries))

    def test_4_eight_signal_candidate_evaluation(self):
        """Test 8-signal evaluation scoring (relevance, authority, quality, difficulty, freshness, time fit, goal, history penalty)."""
        evaluator = ResourceEvaluator()
        state = NovaState()
        state.user.experience_level = "beginner"
        state.user.daily_time = "30 mins"
        state.user.primary_goal = "AI Engineering"

        item = ResourceItem(
            title="Supervised Learning Official Docs",
            description="Official guide on supervised machine learning algorithms.",
            url="https://docs.scikit-learn.org/stable/",
            resource_type=ResourceType.DOCUMENTATION,
            source_domain="docs.scikit-learn.org",
            difficulty="beginner",
            estimated_duration_mins=25,
            published_year=2025,
        )

        scored = evaluator.evaluate_candidate(item, user_query="supervised machine learning", state=state)

        self.assertEqual(scored.authority_score, 1.0)
        self.assertEqual(scored.difficulty_match_score, 1.0)
        self.assertEqual(scored.time_fit_score, 1.0)
        self.assertEqual(scored.freshness_score, 1.0)
        self.assertGreater(scored.relevance_score, 0.4)

    def test_5_history_penalty_avoidance(self):
        """Verify already completed or unhelpful resources receive history penalty."""
        evaluator = ResourceEvaluator()
        history = {"https://example.com/old-video": "completed"}

        item = ResourceItem(
            title="Old Video",
            url="https://example.com/old-video",
        )

        scored = evaluator.evaluate_candidate(item, user_query="Python", interaction_history=history)
        self.assertEqual(scored.history_penalty, -0.80)

    def test_6_personalization_ranking_and_bundle_creation(self):
        """Test composite ranking and creation of primary, alternative, practice, and reference bundle."""
        ranker = ResourceRanker()
        recommender = ResourceRecommender()

        item_primary = ResourceItem(
            title="Recursion Visualized 15 Min Explanation",
            description="Visual step-by-step breakdown of call stacks and recursion.",
            url="https://youtube.com/watch?v=recursion1",
            resource_type=ResourceType.VIDEO,
            difficulty="beginner",
            estimated_duration_mins=15,
        )
        item_practice = ResourceItem(
            title="3 Recursion Practice Problems",
            description="Solve recursion coding exercises.",
            url="https://leetcode.com/problems/recursion",
            resource_type=ResourceType.PRACTICE_SET,
            difficulty="beginner",
        )
        item_ref = ResourceItem(
            title="Python Recursion Documentation",
            description="Official recursion language references.",
            url="https://docs.python.org/3/recursion",
            resource_type=ResourceType.DOCUMENTATION,
        )

        evaluator = ResourceEvaluator()
        scored_list = [
            evaluator.evaluate_candidate(item_primary, "recursion"),
            evaluator.evaluate_candidate(item_practice, "recursion"),
            evaluator.evaluate_candidate(item_ref, "recursion"),
        ]

        ranked = ranker.score_and_rank(scored_list)
        bundle = recommender.build_bundle(ranked)

        self.assertIsNotNone(bundle.primary)
        self.assertIsNotNone(bundle.practice)
        self.assertIsNotNone(bundle.reference)

    def test_7_resource_manager_end_to_end_discovery(self):
        """Test end-to-end resource discovery, evaluation, ranking, and recommendation."""
        payload = self.manager.discover_evaluate_and_recommend(
            query_text="I don't understand binary trees, recommend a tutorial",
            db=self.db,
            user_id=self.user_id,
        )

        self.assertIsNotNone(payload.recommended_bundle.primary)
        self.assertTrue(len(payload.all_ranked_resources) > 0)
        self.assertIn("Tailored resource selection", payload.reasoning_explanation)

    def test_8_resource_interaction_recording(self):
        """Test recording resource interactions in database history."""
        # Create resource in DB first
        res_m = ResourceModel(title="Test Resource", url="https://example.com/test-res")
        self.db.add(res_m)
        self.db.commit()
        self.db.refresh(res_m)

        # Create test user in DB to satisfy foreign key constraint
        from Backend.models.user import User
        user_uuid = uuid4()
        user_m = User(id=user_uuid, email=f"user_{user_uuid}@example.com", hashed_password="pw")
        self.db.add(user_m)
        self.db.commit()

        success = self.manager.record_interaction(
            db=self.db,
            user_id=str(user_uuid),
            resource_id=str(res_m.id),
            time_spent_mins=10,
        )
        self.assertTrue(success)

    def test_9_resource_routing_in_reason_node(self):
        """Test reason_node routes queries asking for course/tutorial recommendations to resource route."""
        state = NovaState()
        state.update_user_message("Recommend the best course for learning Python")

        payload = {"nova_state": state.model_dump(), "user_message": state.conversation.latest_user_message}
        out_payload = reason_node(payload, provider=self.mock_llm_provider)

        self.assertEqual(out_payload["route"], "resource")

    def test_10_end_to_end_resource_turn_execution(self):
        """Test full turn execution through LangGraph with resource route."""
        with patch("Backend.nova.graph.nodes.get_nova_llm_provider", return_value=self.mock_llm_provider):
            res = run_nova_graph(
                user_message="Recommend a video tutorial and practice problems for recursion",
                override_profile={"name": "Kiran"},
                db=self.db,
            )

        self.assertIn("response", res)
        self.assertEqual(res["execution_stage"], "turn_completed")
        self.assertIsNotNone(res["state"].resource_payload)


if __name__ == "__main__":
    unittest.main()
