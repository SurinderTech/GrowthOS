"""
Backend/nova/critic/decision.py

Controlled Retry Engine for NOVA. Enforces hard retry budgets and deterministic decision mapping
to prevent infinite loops and ensure observable execution paths.
"""

from __future__ import annotations

import logging
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.critic.types import CriticAction, CriticResult

logger = logging.getLogger("growthos.nova.critic.decision")


class ControlledRetryEngine:
    """
    Enforces strict retry bounds and maps Critic signals to execution actions.
    """

    MAX_CRITIC_RETRIES: int = 2
    MAX_RESEARCH_RETRIES: int = 1
    MAX_RAG_RETRIES: int = 1
    MAX_RESOURCE_RETRIES: int = 1
    MAX_TOTAL_EXECUTION_ATTEMPTS: int = 3

    def evaluate_retry_budget(
        self,
        critic_result: CriticResult,
        state: Optional[NovaState] = None,
        execution_attempt: int = 1,
        retry_count: int = 0,
    ) -> CriticAction:
        """
        Enforces hard limits on retries and maps proposed actions to safe graph routes.
        """
        proposed_action = critic_result.action

        if proposed_action == CriticAction.PASS:
            return CriticAction.PASS

        # Enforce total attempt limit
        if execution_attempt >= self.MAX_TOTAL_EXECUTION_ATTEMPTS or retry_count >= self.MAX_CRITIC_RETRIES:
            logger.warning(
                "[CONTROLLED_RETRY] Retry budget exhausted (attempt=%d/%d, retries=%d/%d). Overriding action '%s' to PASS",
                execution_attempt,
                self.MAX_TOTAL_EXECUTION_ATTEMPTS,
                retry_count,
                self.MAX_CRITIC_RETRIES,
                proposed_action.value,
            )
            critic_result.retry_reason = f"Retry budget limit reached ({execution_attempt} attempts max). Proceeding with best safe response."
            critic_result.action = CriticAction.PASS
            critic_result.passed = True
            return CriticAction.PASS

        logger.info(
            "[CONTROLLED_RETRY] Approved retry action '%s' (attempt=%d, retries=%d, reason='%s')",
            proposed_action.value,
            execution_attempt,
            retry_count,
            critic_result.retry_reason,
        )

        return proposed_action
