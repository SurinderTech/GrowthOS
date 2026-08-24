"""
Backend/nova/adaptive/manager.py

High-Level Adaptive Planning & Replanning Orchestrator for NOVA (Step 11).
Coordinates Adaptation Decisions, Minimal Change Escalation, Plan Versioning, Diff Calculation, and Database Persistence.
"""

from __future__ import annotations

import logging
import time
from typing import Optional, TYPE_CHECKING
from uuid import UUID
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.adaptive.types import (
    AdaptationDecisionType,
    AdaptivePayload,
)
from Backend.nova.adaptive.decision_engine import AdaptationDecisionEngine
from Backend.nova.adaptive.diff_calculator import PlanDiffCalculator
from Backend.nova.adaptive.replanner import AdaptiveReplanner
from Backend.nova.adaptive.cooldown import AdaptationCooldownManager

logger = logging.getLogger("growthos.nova.adaptive.manager")


class AdaptivePlanningManager:
    """
    High-level Orchestrator for Adaptive Planning and Replanning.
    """

    def __init__(
        self,
        decision_engine: Optional[AdaptationDecisionEngine] = None,
        diff_calculator: Optional[PlanDiffCalculator] = None,
        replanner: Optional[AdaptiveReplanner] = None,
        cooldown_mgr: Optional[AdaptationCooldownManager] = None,
    ):
        self.cooldown_mgr = cooldown_mgr or AdaptationCooldownManager()
        self.decision_engine = decision_engine or AdaptationDecisionEngine(cooldown_mgr=self.cooldown_mgr)
        self.diff_calculator = diff_calculator or PlanDiffCalculator()
        self.replanner = replanner or AdaptiveReplanner()

    def evaluate_and_replan(
        self,
        user_query: str,
        state: Optional[NovaState] = None,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
    ) -> AdaptivePayload:
        """
        Evaluates execution intelligence / user query and executes targeted replanning if justified.
        """
        start_time = time.monotonic()
        u_id = user_id or (state.user.user_id if state and state.user else "anonymous_user")
        old_plan = state.planning_payload if state else None
        curr_ver = old_plan.plan_version if old_plan else 1

        # Extract Step 10 progress signals if available
        prog_signals = state.progress_payload.active_signals if state and state.progress_payload else None
        adapt_signals = state.progress_payload.adaptation_signals if state and state.progress_payload else None

        # 1. Evaluate Adaptation Decision
        decision = self.decision_engine.evaluate_decision(
            user_query=user_query,
            progress_signals=prog_signals,
            adaptation_signals=adapt_signals,
            state=state,
            user_id=u_id,
        )

        if decision.decision in (AdaptationDecisionType.NO_CHANGE, AdaptationDecisionType.MONITOR):
            duration_ms = round((time.monotonic() - start_time) * 1000.0, 2)
            logger.info("[ADAPTIVE_MANAGER] Decision %s: No replan required for user=%s", decision.decision.value, u_id)
            return AdaptivePayload(
                user_id=u_id,
                current_version=curr_ver,
                decision=decision,
                execution_time_ms=duration_ms,
            )

        # 2. Execute Targeted Replanning
        is_major = decision.decision in (AdaptationDecisionType.REPLAN_GOAL, AdaptationDecisionType.REPLAN_PLAN)
        new_plan = self.replanner.execute_replan(
            decision=decision,
            old_plan=old_plan,
            user_query=user_query,
            state=state,
            db=db,
            user_id=u_id,
        )

        # Record replan in cooldown manager
        self.cooldown_mgr.record_replan(u_id)

        # 3. Calculate Structured Plan Diff
        diff_payload = self.diff_calculator.compute_diff(old_plan, new_plan)

        # 4. Attach New Plan to NovaState
        if state:
            state.planning_payload = new_plan

        # 5. Persist Revision & Diff Records in DB
        if db and u_id:
            self.persist_revision(db, u_id, old_plan, new_plan, decision, diff_payload)

        duration_ms = round((time.monotonic() - start_time) * 1000.0, 2)

        payload = AdaptivePayload(
            user_id=u_id,
            current_version=new_plan.plan_version,
            decision=decision,
            diff=diff_payload,
            new_plan_payload=new_plan,
            execution_time_ms=duration_ms,
        )

        logger.info(
            "[ADAPTIVE_MANAGER] Adaptive replanning completed for user=%s (v%d -> v%d in %.2fms)",
            u_id,
            curr_ver,
            new_plan.plan_version,
            duration_ms,
        )
        return payload

    def persist_revision(self, db: Session, user_id: str, old_plan, new_plan, decision, diff_payload) -> bool:
        """Persists plan revision and diff records into database."""
        if not db or not user_id:
            return False

        try:
            from Backend.nova.adaptive.models import NovaAdaptationDecisionModel, NovaPlanRevisionModel, NovaPlanDiffModel
            u_uuid = UUID(str(user_id))

            dec_rec = NovaAdaptationDecisionModel(
                user_id=u_uuid,
                decision=decision.decision.value,
                level=decision.level.value,
                confidence=decision.confidence,
                reason=decision.reason,
                evidence_json=decision.evidence,
            )
            db.add(dec_rec)

            rev_rec = NovaPlanRevisionModel(
                user_id=u_uuid,
                plan_id="active_plan",
                version=new_plan.plan_version,
                trigger_reason=decision.reason,
            )
            db.add(rev_rec)

            diff_rec = NovaPlanDiffModel(
                user_id=u_uuid,
                plan_id="active_plan",
                old_version=diff_payload.old_version,
                new_version=diff_payload.new_version,
                diffs_json=[d.model_dump() for d in diff_payload.diffs],
                summary=diff_payload.summary,
            )
            db.add(diff_rec)

            db.commit()
            logger.info("[ADAPTIVE_MANAGER] Persisted revision records for Plan v%d in DB", new_plan.plan_version)
            return True
        except Exception as exc:
            logger.debug("[ADAPTIVE_MANAGER] Failed to persist revision records: %s", exc)
            db.rollback()
            return False


# Global singleton instance
_default_adaptive_manager: Optional[AdaptivePlanningManager] = None


def get_adaptive_manager() -> AdaptivePlanningManager:
    global _default_adaptive_manager
    if _default_adaptive_manager is None:
        _default_adaptive_manager = AdaptivePlanningManager()
    return _default_adaptive_manager
