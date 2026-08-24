"""
Backend/nova/resources/evaluator.py

Resource Evaluator evaluating candidate learning resources across 8 distinct quality & personalization signals.
"""

from __future__ import annotations

import logging
import math
from typing import Dict, List, Optional, Set, TYPE_CHECKING
from uuid import UUID
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.resources.types import ResourceItem, ScoredResource, ResourceType

logger = logging.getLogger("growthos.nova.resources.evaluator")


class ResourceEvaluator:
    """
    Evaluates candidate learning resources using 8 normalized scoring signals.
    """

    def evaluate_candidate(
        self,
        item: ResourceItem,
        user_query: str,
        state: Optional[NovaState] = None,
        interaction_history: Optional[Dict[str, str]] = None,
    ) -> ScoredResource:
        """
        Computes 8 granular scoring signals for a candidate resource item.
        """
        q_words = set(re_words(user_query))
        t_words = set(re_words(item.title + " " + item.description))

        # 1. Relevance Signal (0.0 to 1.0)
        overlap = len(q_words.intersection(t_words))
        relevance_score = min(1.0, overlap / max(1, len(q_words))) if q_words else 0.5

        # 2. Authority Signal (0.0 to 1.0)
        authority_score = 0.60
        domain = (item.source_domain or "").lower()
        if "docs." in domain or "developer." in domain or "official" in item.title.lower():
            authority_score = 1.00
        elif "github.com" in domain or "coursera.org" in domain or "leetcode.com" in domain or "geeksforgeeks.org" in domain:
            authority_score = 0.90
        elif "youtube.com" in domain or "youtu.be" in domain:
            authority_score = 0.85

        # 3. Quality Signal (0.0 to 1.0)
        desc_len = len(item.description)
        quality_score = max(0.4, min(1.0, desc_len / 150.0))

        # 4. Difficulty Match Signal (0.0 to 1.0)
        user_level = ((state.user.experience_level if state and state.user else None) or "beginner").lower()
        res_diff = (item.difficulty or "intermediate").lower()

        if user_level == res_diff:
            difficulty_match_score = 1.00
        elif (user_level == "beginner" and res_diff == "intermediate") or (user_level == "intermediate" and res_diff == "advanced"):
            difficulty_match_score = 0.75
        elif user_level == "beginner" and res_diff == "advanced":
            difficulty_match_score = 0.30
        else:
            difficulty_match_score = 0.80

        # 5. Freshness Signal (0.0 to 1.0)
        freshness_score = 0.80
        if item.published_year:
            if item.published_year >= 2024:
                freshness_score = 1.00
            elif item.published_year >= 2021:
                freshness_score = 0.80
            else:
                freshness_score = 0.60

        # 6. Time Fit Signal (0.0 to 1.0)
        time_fit_score = 0.85
        if item.estimated_duration_mins:
            daily_time_str = ((state.user.daily_time if state and state.user else None) or "30 mins").lower()
            if "15" in daily_time_str or "30" in daily_time_str:
                budget = 30
            elif "1 hour" in daily_time_str or "60" in daily_time_str:
                budget = 60
            else:
                budget = 45

            if item.estimated_duration_mins <= budget:
                time_fit_score = 1.00
            elif item.estimated_duration_mins <= budget * 2:
                time_fit_score = 0.70
            else:
                time_fit_score = 0.40

        # 7. Goal Alignment Signal (0.0 to 1.0)
        goal_alignment_score = 0.70
        if state:
            raw_goal = (state.user.primary_goal if state.user else None) or state.current_goal.active_mission_title or ""
            user_goal_str = raw_goal.lower()
            if user_goal_str and any(w in t_words for w in re_words(user_goal_str)):
                goal_alignment_score = 1.00

        # 8. History Penalty (0.0 to -0.80)
        history_penalty = 0.0
        if interaction_history and item.url in interaction_history:
            status = interaction_history[item.url]
            if status in ("completed", "unhelpful"):
                history_penalty = -0.80
            elif status == "skipped":
                history_penalty = -0.40
            elif status == "opened":
                history_penalty = -0.10

        return ScoredResource(
            resource=item,
            relevance_score=round(relevance_score, 2),
            authority_score=round(authority_score, 2),
            quality_score=round(quality_score, 2),
            difficulty_match_score=round(difficulty_match_score, 2),
            freshness_score=round(freshness_score, 2),
            time_fit_score=round(time_fit_score, 2),
            goal_alignment_score=round(goal_alignment_score, 2),
            history_penalty=round(history_penalty, 2),
        )

    def fetch_user_interaction_history(
        self,
        db: Optional[Session],
        user_id: Optional[str],
    ) -> Dict[str, str]:
        """Fetches map of URL -> interaction status for user history penalty scoring."""
        history_map: Dict[str, str] = {}
        if not db or not user_id:
            return history_map

        try:
            from Backend.nova.resources.models import ResourceInteractionModel, ResourceModel
            user_uuid = UUID(str(user_id))
            rows = (
                db.query(ResourceModel.url, ResourceInteractionModel.interaction_type)
                .join(ResourceInteractionModel, ResourceModel.id == ResourceInteractionModel.resource_id)
                .filter(ResourceInteractionModel.user_id == user_uuid)
                .all()
            )
            for url, itype in rows:
                history_map[url] = itype
        except Exception as exc:
            logger.debug("[EVALUATOR] Interaction query failed safely: %s", exc)

        return history_map


def re_words(text: str) -> List[str]:
    """Helper to extract clean lower-cased alphanumeric words."""
    import re
    return [w.lower() for w in re.findall(r"\b\w+\b", text) if len(w) > 1]
