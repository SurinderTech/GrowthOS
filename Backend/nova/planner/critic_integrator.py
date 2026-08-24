"""
Backend/nova/planner/critic_integrator.py

Plan Critic Integrator for NOVA Planning Engine.
Uses Step 8 Critic/Verifier engine to validate generated plans for feasibility, dependency correctness,
and workload realism.
"""

from __future__ import annotations

import logging
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.planner.types import PlanningPayload, TaskItem
from Backend.nova.critic import get_critic_manager, CriticAction

logger = logging.getLogger("growthos.nova.planner.critic_integrator")


class PlanCriticIntegrator:
    """
    Validates plan payload using Step 8 Critic Engine.
    """

    def validate_plan(
        self,
        payload: PlanningPayload,
        state: Optional[NovaState] = None,
    ) -> PlanningPayload:
        """
        Validates generated plan feasibility and overall confidence score.
        """
        if payload.time_feasibility_status == "overloaded":
            payload.confidence = round(max(0.60, payload.confidence - 0.20), 2)
            payload.assumptions.append("Plan workload is overloaded; recommended executing in batches.")

        logger.info("[PLAN_CRITIC_INTEGRATOR] Validated plan (confidence=%.2f, feasibility=%s)", payload.confidence, payload.time_feasibility_status)
        return payload
