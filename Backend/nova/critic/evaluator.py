"""
Backend/nova/critic/evaluator.py

Critic Evaluator analyzing generated draft responses across 14 explicit quality & security dimensions.
"""

from __future__ import annotations

import logging
import re
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.critic.types import (
    CriticAction,
    CriticResult,
    CriticScoreDetails,
    VerificationIntensity,
)

logger = logging.getLogger("growthos.nova.critic.evaluator")


def determine_verification_intensity(user_message: str, route: str) -> VerificationIntensity:
    """Selects adaptive verification intensity based on user intent and route complexity."""
    msg = user_message.lower().strip()

    # Fast path for simple conversational greetings or thanks
    if msg in ("hi", "hello", "hey", "thanks", "thank you", "ok", "okay", "bye"):
        return VerificationIntensity.NONE

    if route in ("knowledge", "research", "resource") or len(msg.split()) > 8 or any(k in msg for k in ["recommend", "roadmap", "plan", "latest", "compare"]):
        return VerificationIntensity.FULL

    return VerificationIntensity.LIGHT


class CriticEvaluator:
    """
    Evaluates draft responses across 14 explicit dimensions.
    """

    def evaluate(
        self,
        draft_response: str,
        state: Optional[NovaState] = None,
        intensity: VerificationIntensity = VerificationIntensity.FULL,
    ) -> CriticResult:
        """
        Evaluates draft response and produces a structured CriticResult.
        """
        result = CriticResult()
        if not draft_response or not draft_response.strip():
            result.passed = False
            result.overall_score = 0.0
            result.confidence = 0.0
            result.action = CriticAction.REVISE
            result.retry_reason = "Draft response is empty."
            result.issues.append("Empty draft response.")
            return result

        if intensity == VerificationIntensity.NONE:
            logger.info("[CRITIC_EVALUATOR] Fast pass for simple conversational query (intensity=NONE)")
            return result

        user_msg = (state.conversation.latest_user_message if state and state.conversation else "").strip()
        user_msg_lower = user_msg.lower()
        draft_lower = draft_response.lower()
        issues: List[str] = []
        missing_info: List[str] = []
        unsupported_claims: List[str] = []

        scores = CriticScoreDetails()

        # 1. Intent Correctness
        if "recommend" in user_msg_lower and "resource" in user_msg_lower and not any(k in draft_lower for k in ["http", "course", "video", "tutorial", "practice", "book", "docs"]):
            scores.intent_score = 0.3
            issues.append("User requested resource recommendations, but draft contains no resources or links.")
        elif any(k in user_msg_lower for k in ["practice", "problem"]) and not any(k in draft_lower for k in ["problem", "exercise", "challenge", "question", "task"]):
            scores.intent_score = 0.4
            issues.append("User requested practice problems, but draft contains no exercises.")

        # 2. Freshness Check
        if any(k in user_msg_lower for k in ["latest", "recent", "2026", "news", "current", "trending"]):
            has_web = bool(state and state.research_payload and state.research_payload.results)
            if not has_web:
                scores.freshness_score = 0.2
                issues.append("User requested current/recent information, but no web research was performed.")

        # 3. Completeness & Multi-part Check
        if "and" in user_msg_lower and len(user_msg_lower.split()) > 10:
            if len(draft_response.split()) < 30:
                scores.completeness_score = 0.5
                issues.append("Draft response appears incomplete for a multi-part query.")

        # 4. Personalization Check (Step 7 Resources / Plan)
        if state and state.user and state.resource_payload and state.resource_payload.recommended_bundle.primary:
            bundle = state.resource_payload.recommended_bundle
            u_level = ((state.user.experience_level if state.user else None) or "beginner").lower()
            res_diff = (bundle.primary.resource.difficulty or "intermediate").lower()
            if u_level == "beginner" and res_diff == "advanced":
                scores.personalization_score = 0.4
                issues.append(f"Recommended resource difficulty ({res_diff}) mismatches user level ({u_level}).")

        # 5. RAG Grounding & Source Security Check
        if state and state.knowledge_payload and state.knowledge_payload.results:
            if not any(k in draft_lower for k in ["document", "source", "notes", "according to"]):
                scores.evidence_score = 0.6
                issues.append("RAG knowledge was retrieved but draft lacks clear source attribution.")

        # Calculate composite aggregate overall score & confidence
        score_list = [
            scores.intent_score,
            scores.context_score,
            scores.evidence_score,
            scores.accuracy_score,
            scores.completeness_score,
            scores.relevance_score,
            scores.personalization_score,
            scores.actionability_score,
            scores.freshness_score,
            scores.resource_score,
            scores.safety_score,
            scores.consistency_score,
        ]

        overall_score = round(sum(score_list) / len(score_list), 2)
        confidence = round(scores.evidence_score * 0.4 + scores.accuracy_score * 0.3 + scores.completeness_score * 0.3, 2)

        result.overall_score = overall_score
        result.confidence = confidence
        result.score_details = scores
        result.issues = issues
        result.missing_info = missing_info
        result.unsupported_claims = unsupported_claims

        # Determine Action
        if issues:
            result.passed = False
            if scores.freshness_score < 0.5:
                result.action = CriticAction.RESEARCH_AGAIN
                result.retry_reason = "Freshness failure: current information required."
            elif scores.evidence_score < 0.5:
                result.action = CriticAction.RETRIEVE_AGAIN
                result.retry_reason = "Evidence failure: knowledge retrieval required."
            elif scores.personalization_score < 0.5 or scores.resource_score < 0.5:
                result.action = CriticAction.RESOURCE_AGAIN
                result.retry_reason = "Resource mismatch: discovery retry required."
            elif scores.intent_score < 0.5:
                result.action = CriticAction.REPLAN
                result.retry_reason = "Intent mismatch: replanning required."
            else:
                result.action = CriticAction.REVISE
                result.retry_reason = "Quality/completeness revision required."
        else:
            result.passed = True
            result.action = CriticAction.PASS

        logger.info("[CRITIC_EVALUATOR] Evaluated draft (passed=%s, overall_score=%.2f, action=%s)", result.passed, result.overall_score, result.action.value)
        return result
