"""
Backend/nova/adaptive/decision_engine.py

Adaptation Decision Engine for NOVA.
Evaluates execution signals, explicit user replan requests, and evidence thresholds to choose minimal adaptation level.
"""

from __future__ import annotations

import logging
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.adaptive.types import (
    AdaptationDecisionPayload,
    AdaptationDecisionType,
    AdaptationLevel,
)
from Backend.nova.progress.types import AdaptationSignal, AdaptationSignalType, ProgressSignal, ProgressSignalType
from Backend.nova.adaptive.config import get_adaptation_thresholds
from Backend.nova.adaptive.cooldown import AdaptationCooldownManager

logger = logging.getLogger("growthos.nova.adaptive.decision_engine")


class AdaptationDecisionEngine:
    """
    Evaluates evidence and selects minimal adaptation decision level.
    """

    def __init__(self, cooldown_mgr: Optional[AdaptationCooldownManager] = None):
        self.cooldown_mgr = cooldown_mgr or AdaptationCooldownManager()
        self.thresholds = get_adaptation_thresholds()

    def evaluate_decision(
        self,
        user_query: Optional[str] = None,
        progress_signals: Optional[List[ProgressSignal]] = None,
        adaptation_signals: Optional[List[AdaptationSignal]] = None,
        state: Optional[NovaState] = None,
        user_id: Optional[str] = None,
    ) -> AdaptationDecisionPayload:
        """
        Selects minimal effective adaptation decision level from user intent or Step 10 signals.
        """
        u_id = user_id or (state.user.user_id if state and state.user else "anonymous_user")
        q_lower = (user_query or "").lower().strip()

        # 1. Explicit User Replan Request Handling
        if any(k in q_lower for k in ["change my goal", "focus on ai", "new goal", "different goal"]):
            return AdaptationDecisionPayload(
                decision=AdaptationDecisionType.REPLAN_GOAL,
                level=AdaptationLevel.GOAL,
                confidence=1.0,
                reason="User explicitly requested a goal change.",
                evidence=["Explicit user query requesting goal change."],
                requires_user_approval=True,
            )
        elif any(k in q_lower for k in ["only have 45 min", "less time", "only have 30 min", "only have 1 hour", "reduce time"]):
            return AdaptationDecisionPayload(
                decision=AdaptationDecisionType.ADJUST_TIMELINE,
                level=AdaptationLevel.PLAN,
                confidence=1.0,
                reason="User explicitly changed daily time availability constraint.",
                evidence=["Explicit user query updating daily time budget."],
            )
        elif any(k in q_lower for k in ["make plan easier", "easier plan", "too hard"]):
            return AdaptationDecisionPayload(
                decision=AdaptationDecisionType.REDUCE_WORKLOAD,
                level=AdaptationLevel.PHASE,
                confidence=0.95,
                reason="User explicitly requested reduced difficulty / workload.",
                evidence=["Explicit user feedback requesting workload reduction."],
            )

        # 2. Cooldown check for automatic background adaptation
        if self.cooldown_mgr.is_cooldown_active(u_id):
            logger.info("[DECISION_ENGINE] Cooldown active for user %s; skipping automatic replan", u_id)
            return AdaptationDecisionPayload(
                decision=AdaptationDecisionType.MONITOR,
                level=AdaptationLevel.TASK,
                confidence=0.90,
                reason="Cooldown active; monitoring ongoing execution.",
            )

        # 3. System Adaptation Signals Evaluation (Minimal Change Principle)
        if adaptation_signals:
            for ad in adaptation_signals:
                if ad.adaptation_type == AdaptationSignalType.INSERT_PREREQUISITE:
                    return AdaptationDecisionPayload(
                        decision=AdaptationDecisionType.INSERT_PREREQUISITE,
                        level=AdaptationLevel.OBJECTIVE,
                        confidence=ad.confidence,
                        reason=ad.reason,
                        evidence=[ad.reason],
                        target_task_id=ad.target_task_id,
                    )
                elif ad.adaptation_type == AdaptationSignalType.REDUCE_WORKLOAD:
                    return AdaptationDecisionPayload(
                        decision=AdaptationDecisionType.REDUCE_WORKLOAD,
                        level=AdaptationLevel.PHASE,
                        confidence=ad.confidence,
                        reason=ad.reason,
                        evidence=[ad.reason],
                        target_task_id=ad.target_task_id,
                    )
                elif ad.adaptation_type == AdaptationSignalType.INCREASE_WORKLOAD:
                    return AdaptationDecisionPayload(
                        decision=AdaptationDecisionType.INCREASE_WORKLOAD,
                        level=AdaptationLevel.PHASE,
                        confidence=ad.confidence,
                        reason=ad.reason,
                        evidence=[ad.reason],
                        target_task_id=ad.target_task_id,
                    )

        # 4. Default NO_CHANGE
        return AdaptationDecisionPayload(
            decision=AdaptationDecisionType.NO_CHANGE,
            level=AdaptationLevel.TASK,
            confidence=0.95,
            reason="Execution pace aligns with plan expectations.",
        )
