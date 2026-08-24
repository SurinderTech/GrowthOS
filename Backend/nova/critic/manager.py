"""
Backend/nova/critic/manager.py

High-Level Critic, Verification & Controlled Retry Orchestrator for NOVA (Step 8).
Coordinates Draft Evaluation, Deterministic & Semantic Verification, Budget Control, and Telemetry.
"""

from __future__ import annotations

import logging
from typing import Optional, TYPE_CHECKING
from uuid import UUID
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.critic.types import (
    CriticAction,
    CriticPayload,
    CriticResult,
    VerificationResult,
)
from Backend.nova.critic.evaluator import CriticEvaluator, determine_verification_intensity
from Backend.nova.critic.verifier import VerifierEngine
from Backend.nova.critic.decision import ControlledRetryEngine

logger = logging.getLogger("growthos.nova.critic.manager")


class CriticManager:
    """
    High-level Orchestrator for NOVA Critic, Verifier, and Controlled Retry Engine.
    """

    def __init__(
        self,
        evaluator: Optional[CriticEvaluator] = None,
        verifier: Optional[VerifierEngine] = None,
        decision_engine: Optional[ControlledRetryEngine] = None,
    ):
        self.evaluator = evaluator or CriticEvaluator()
        self.verifier = verifier or VerifierEngine()
        self.decision_engine = decision_engine or ControlledRetryEngine()

    def evaluate_verify_and_decide(
        self,
        draft_response: str,
        state: Optional[NovaState] = None,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
        execution_attempt: int = 1,
        retry_count: int = 0,
    ) -> CriticPayload:
        """
        Executes complete Critic Evaluation, Verification, Retry Decision, and Telemetry Recording.
        """
        route = state.reasoning.route if state and state.reasoning else "direct_answer"
        user_msg = state.conversation.latest_user_message if state and state.conversation else ""

        intensity = determine_verification_intensity(user_msg, route)

        # 1. Evaluate Draft Response Across 14 Signals
        critic_res = self.evaluator.evaluate(draft_response, state=state, intensity=intensity)

        # 2. Run Deterministic and Semantic Verification Checks
        verifier_res = self.verifier.verify(draft_response, state=state)

        # Merge verification issues if any
        if not verifier_res.deterministic_checks_passed:
            critic_res.issues.extend(verifier_res.issues)

        # 3. Enforce Controlled Retry Budget & Map Approved Action
        final_action = self.decision_engine.evaluate_retry_budget(
            critic_result=critic_res,
            state=state,
            execution_attempt=execution_attempt,
            retry_count=retry_count,
        )

        trace_item = {
            "attempt": execution_attempt,
            "retry_count": retry_count,
            "route": route,
            "action": final_action.value,
            "overall_score": critic_res.overall_score,
            "confidence": critic_res.confidence,
            "issues": list(critic_res.issues),
            "reason": critic_res.retry_reason,
        }

        trace_history = (state.critic_payload.trace_history if state and state.critic_payload else []) + [trace_item]

        payload = CriticPayload(
            draft_response=draft_response,
            critic_result=critic_res,
            verification_result=verifier_res,
            execution_attempt=execution_attempt,
            retry_count=retry_count,
            trace_history=trace_history,
        )

        # 4. Record Telemetry Record to Database
        if db and user_id:
            self.record_telemetry(
                db=db,
                user_id=user_id,
                execution_attempt=execution_attempt,
                route=route,
                action=final_action,
                overall_score=critic_res.overall_score,
                confidence=critic_res.confidence,
                issues=critic_res.issues,
            )

        logger.info(
            "[CRITIC_MANAGER] Evaluation complete (attempt=%d, action=%s, score=%.2f, confidence=%.2f)",
            execution_attempt,
            final_action.value,
            critic_res.overall_score,
            critic_res.confidence,
        )

        return payload

    def record_telemetry(
        self,
        db: Session,
        user_id: str,
        execution_attempt: int,
        route: str,
        action: CriticAction,
        overall_score: float,
        confidence: float,
        issues: list[str],
    ) -> bool:
        """Persists lightweight telemetry trace record into critic_telemetry database table."""
        if not db or not user_id:
            return False

        try:
            from Backend.nova.critic.models import CriticTelemetryModel
            u_uuid = UUID(str(user_id))

            record = CriticTelemetryModel(
                user_id=u_uuid,
                attempt_count=execution_attempt,
                route=route,
                critic_action=action.value,
                overall_score=overall_score,
                confidence=confidence,
                issues_json=issues,
            )
            db.add(record)
            db.commit()
            return True
        except Exception as exc:
            logger.debug("[CRITIC_MANAGER] Failed to record telemetry: %s", exc)
            db.rollback()
            return False


# Global singleton instance
_default_critic_manager: Optional[CriticManager] = None


def get_critic_manager() -> CriticManager:
    global _default_critic_manager
    if _default_critic_manager is None:
        _default_critic_manager = CriticManager()
    return _default_critic_manager
