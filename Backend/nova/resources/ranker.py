"""
Backend/nova/resources/ranker.py

Resource Ranker computing composite normalized overall score and ranking candidate resources transparently.
"""

from __future__ import annotations

import logging
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.resources.types import ScoredResource, ResourceType

logger = logging.getLogger("growthos.nova.resources.ranker")


class ResourceRanker:
    """
    Computes weighted overall scores and ranks candidate resources descending.
    """

    WEIGHT_RELEVANCE: float = 0.25
    WEIGHT_AUTHORITY: float = 0.15
    WEIGHT_QUALITY: float = 0.10
    WEIGHT_DIFFICULTY: float = 0.15
    WEIGHT_TIME_FIT: float = 0.10
    WEIGHT_GOAL_ALIGNMENT: float = 0.15
    WEIGHT_FRESHNESS: float = 0.10

    def score_and_rank(
        self,
        candidates: List[ScoredResource],
        state: Optional[NovaState] = None,
    ) -> List[ScoredResource]:
        """
        Computes composite overall score for candidates and returns sorted list.
        """
        ranked: List[ScoredResource] = []

        for candidate in candidates:
            c = candidate
            composite = (
                (c.relevance_score * self.WEIGHT_RELEVANCE)
                + (c.authority_score * self.WEIGHT_AUTHORITY)
                + (c.quality_score * self.WEIGHT_QUALITY)
                + (c.difficulty_match_score * self.WEIGHT_DIFFICULTY)
                + (c.time_fit_score * self.WEIGHT_TIME_FIT)
                + (c.goal_alignment_score * self.WEIGHT_GOAL_ALIGNMENT)
                + (c.freshness_score * self.WEIGHT_FRESHNESS)
                + c.history_penalty
            )

            # Clamp composite score to [0.0, 1.0]
            c.overall_score = max(0.0, min(1.0, round(composite, 2)))
            c.recommendation_reason = self.generate_recommendation_reason(c, state)
            ranked.append(c)

        ranked.sort(key=lambda x: x.overall_score, reverse=True)
        logger.info("[RESOURCE_RANKER] Ranked %d candidates. Top score = %.2f", len(ranked), ranked[0].overall_score if ranked else 0.0)
        return ranked

    def generate_recommendation_reason(
        self,
        candidate: ScoredResource,
        state: Optional[NovaState] = None,
    ) -> str:
        """Generates transparent, human-readable rationale for recommending this resource."""
        res = candidate.resource
        user_level = state.user.experience_level if state and state.user else "your level"
        reasons: List[str] = []

        if candidate.authority_score >= 0.85:
            reasons.append(f"from authoritative source ({res.provider_platform})")
        if candidate.difficulty_match_score >= 0.90:
            reasons.append(f"tailored to your {user_level} skill level")
        if candidate.time_fit_score >= 0.90:
            reasons.append("fits your available daily study time")
        if candidate.goal_alignment_score >= 0.90:
            reasons.append("directly aligns with your active mission goal")

        if reasons:
            return "Recommended because it is " + ", ".join(reasons) + "."
        else:
            return f"Relevant {res.resource_type.value} resource from {res.provider_platform}."
