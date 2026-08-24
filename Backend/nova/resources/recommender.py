"""
Backend/nova/resources/recommender.py

Personalization Engine & Structured Resource Bundle Builder for NOVA Resource Engine.
Creates curated decision bundles (Primary, Alternative, Practice, Reference) to avoid link spam.
"""

from __future__ import annotations

import logging
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.resources.types import (
    ScoredResource,
    ResourceBundle,
    ResourceMode,
    ResourceType,
)

logger = logging.getLogger("growthos.nova.resources.recommender")


class ResourceRecommender:
    """
    Constructs personalized, structured Resource Bundles from ranked candidates.
    """

    def build_bundle(
        self,
        ranked_candidates: List[ScoredResource],
        mode: ResourceMode = ResourceMode.LEARN,
        state: Optional[NovaState] = None,
    ) -> ResourceBundle:
        """
        Selects primary, alternative, practice, and reference resources from top candidates.
        """
        bundle = ResourceBundle()
        if not ranked_candidates:
            return bundle

        # 1. Primary Recommendation ("Start Here")
        bundle.primary = ranked_candidates[0]

        # 2. Alternative, Practice, Reference Selection
        for candidate in ranked_candidates[1:]:
            res = candidate.resource
            r_type = res.resource_type

            if r_type == ResourceType.PRACTICE_SET or r_type == ResourceType.PROJECT:
                if not bundle.practice:
                    bundle.practice = candidate
            elif r_type == ResourceType.DOCUMENTATION or r_type == ResourceType.BOOK:
                if not bundle.reference:
                    bundle.reference = candidate
            elif r_type in (ResourceType.VIDEO, ResourceType.COURSE, ResourceType.TUTORIAL):
                if not bundle.alternative and (not bundle.primary or bundle.primary.resource.resource_type != r_type):
                    bundle.alternative = candidate

        if not bundle.alternative and len(ranked_candidates) > 1:
            for c in ranked_candidates[1:]:
                if c != bundle.practice and c != bundle.reference:
                    bundle.alternative = c
                    break

        logger.info(
            "[RESOURCE_RECOMMENDER] Built bundle: primary='%s', alt='%s', practice='%s', ref='%s'",
            bundle.primary.resource.title if bundle.primary else "None",
            bundle.alternative.resource.title if bundle.alternative else "None",
            bundle.practice.resource.title if bundle.practice else "None",
            bundle.reference.resource.title if bundle.reference else "None",
        )

        return bundle

    def compose_reasoning_explanation(
        self,
        bundle: ResourceBundle,
        mode: ResourceMode,
        state: Optional[NovaState] = None,
    ) -> str:
        """Composes personalized high-level explanation of why this bundle was selected."""
        if not bundle.primary:
            return "No matching resources were found for your query."

        user_name = state.user.name if state and state.user and state.user.name else "Learner"
        user_level = state.user.experience_level if state and state.user and state.user.experience_level else "current level"

        explanation_parts = [
            f"Tailored resource selection for {user_name} ({user_level}).",
            f"Primary recommendation: '{bundle.primary.resource.title}' ({bundle.primary.recommendation_reason})"
        ]

        if bundle.practice:
            explanation_parts.append(f"Hands-on practice: '{bundle.practice.resource.title}'")

        if bundle.reference:
            explanation_parts.append(f"Official reference: '{bundle.reference.resource.title}'")

        return " ".join(explanation_parts)
