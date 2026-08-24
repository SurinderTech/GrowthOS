"""
Backend/nova/resources/manager.py

High-Level Resource Intelligence Orchestrator for NOVA.
Coordinates Candidate Discovery, 8-Signal Evaluation, Personalization Ranking, and Bundle Generation.
"""

from __future__ import annotations

import logging
import time
from typing import Optional, TYPE_CHECKING
from uuid import UUID
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.resources.types import (
    ResourceItem,
    ScoredResource,
    ResourceBundle,
    ResourceMode,
    ResourceRecommendationPayload,
    ResourceInteractionType,
)
from Backend.nova.resources.searcher import ResourceSearcher, infer_resource_mode
from Backend.nova.resources.evaluator import ResourceEvaluator
from Backend.nova.resources.ranker import ResourceRanker
from Backend.nova.resources.recommender import ResourceRecommender

logger = logging.getLogger("growthos.nova.resources.manager")


class ResourceManager:
    """
    High-level Orchestrator for Personal Resource Discovery, Evaluation, Ranking, and Recommendation.
    """

    def __init__(
        self,
        searcher: Optional[ResourceSearcher] = None,
        evaluator: Optional[ResourceEvaluator] = None,
        ranker: Optional[ResourceRanker] = None,
        recommender: Optional[ResourceRecommender] = None,
    ):
        self.searcher = searcher or ResourceSearcher()
        self.evaluator = evaluator or ResourceEvaluator()
        self.ranker = ranker or ResourceRanker()
        self.recommender = recommender or ResourceRecommender()

    def discover_evaluate_and_recommend(
        self,
        query_text: str,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
        state: Optional[NovaState] = None,
        override_mode: Optional[ResourceMode] = None,
    ) -> ResourceRecommendationPayload:
        """
        Executes end-to-end Resource Discovery, Evaluation, Ranking, and Bundle Recommendation.
        """
        start_time = time.monotonic()
        mode = override_mode or infer_resource_mode(query_text)

        logger.info("[RESOURCE_MANAGER] Executing discovery for query='%s' (mode=%s, user_id=%s)", query_text, mode.value, user_id)

        # 1. Candidate Discovery across Web, RAG, and User-Provided Resources
        candidates, search_queries = self.searcher.discover(
            user_message=query_text,
            state=state,
            db=db,
            user_id=user_id,
            mode=mode,
            max_candidates=15,
        )

        # 2. Fetch User Interaction History for History Penalty Scoring
        interaction_history = self.evaluator.fetch_user_interaction_history(db, user_id)

        # 3. Evaluate 8 Scoring Signals per Candidate
        scored_candidates: list[ScoredResource] = []
        for item in candidates:
            scored_candidates.append(
                self.evaluator.evaluate_candidate(
                    item=item,
                    user_query=query_text,
                    state=state,
                    interaction_history=interaction_history,
                )
            )

        # 4. Rank Candidates by Composite Weighted Overall Score
        ranked_candidates = self.ranker.score_and_rank(scored_candidates, state)

        # 5. Construct Personalized Resource Bundle (Primary, Alternative, Practice, Reference)
        bundle = self.recommender.build_bundle(ranked_candidates, mode=mode, state=state)

        # 6. Compose Explanation Rationale
        explanation = self.recommender.compose_reasoning_explanation(bundle, mode=mode, state=state)

        duration_ms = round((time.monotonic() - start_time) * 1000.0, 2)

        payload = ResourceRecommendationPayload(
            query_text=query_text,
            mode=mode,
            recommended_bundle=bundle,
            all_ranked_resources=ranked_candidates,
            reasoning_explanation=explanation,
            execution_time_ms=duration_ms,
        )

        logger.info("[RESOURCE_MANAGER] Recommendation completed in %.2fms (top_primary='%s')", duration_ms, bundle.primary.resource.title if bundle.primary else "None")
        return payload

    def record_interaction(
        self,
        db: Session,
        user_id: str,
        resource_id: str,
        interaction_type: ResourceInteractionType = ResourceInteractionType.OPENED,
        time_spent_mins: Optional[int] = None,
    ) -> bool:
        """Records a user interaction event on a resource into database history."""
        if not db or not user_id or not resource_id:
            return False

        try:
            from Backend.nova.resources.models import ResourceInteractionModel
            u_uuid = UUID(str(user_id))
            r_uuid = UUID(str(resource_id))

            interaction = ResourceInteractionModel(
                user_id=u_uuid,
                resource_id=r_uuid,
                interaction_type=interaction_type.value,
                time_spent_mins=time_spent_mins,
            )
            db.add(interaction)
            db.commit()
            logger.info("[RESOURCE_MANAGER] Recorded interaction '%s' for user=%s resource=%s", interaction_type.value, user_id, resource_id)
            return True
        except Exception as exc:
            logger.error("[RESOURCE_MANAGER] Failed to record interaction: %s", exc)
            db.rollback()
            return False


# Global singleton instance
_default_resource_manager: Optional[ResourceManager] = None


def get_resource_manager() -> ResourceManager:
    global _default_resource_manager
    if _default_resource_manager is None:
        _default_resource_manager = ResourceManager()
    return _default_resource_manager
