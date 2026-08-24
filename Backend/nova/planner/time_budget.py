"""
Backend/nova/planner/time_budget.py

Time Budget Evaluator for NOVA Planning Engine.
Evaluates workload feasibility against user's daily study time budget and flags overloaded schedules.
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.planner.types import TaskItem

logger = logging.getLogger("growthos.nova.planner.time_budget")


def extract_daily_budget_mins(state: Optional[NovaState] = None) -> int:
    """Extracts daily study time budget in minutes from user context."""
    if not state or not state.user or not state.user.daily_time:
        return 60

    dt_str = state.user.daily_time.lower()
    if "15" in dt_str:
        return 15
    elif "30" in dt_str:
        return 30
    elif "2 hour" in dt_str or "120" in dt_str:
        return 120
    elif "1 hour" in dt_str or "60" in dt_str:
        return 60
    elif "3 hour" in dt_str or "180" in dt_str:
        return 180
    else:
        return 60


class TimeBudgetEvaluator:
    """
    Evaluates plan workload against daily time budget.
    """

    def evaluate_workload(
        self,
        tasks: List[TaskItem],
        state: Optional[NovaState] = None,
    ) -> Tuple[int, int, str, List[str]]:
        """
        Calculates total plan workload, daily budget, feasibility status, and workload recommendations.
        """
        daily_budget = extract_daily_budget_mins(state)
        total_mins = sum(t.estimated_minutes for t in tasks)

        # Estimate daily load assuming a 14-day execution horizon
        est_daily_load = total_mins / 14.0
        assumptions: List[str] = [
            f"Daily study budget: {daily_budget} minutes/day.",
            f"Target execution pace: ~{round(est_daily_load)} minutes/day across 14 days."
        ]

        if est_daily_load <= daily_budget:
            status = "feasible"
        elif est_daily_load <= daily_budget * 1.3:
            status = "tight"
            assumptions.append("Workload is tight; consider focusing on core learning tasks first.")
        else:
            status = "overloaded"
            assumptions.append("Total workload exceeds daily budget; plan timeline extended for sustainability.")

        logger.info("[TIME_BUDGET] Evaluated plan workload: total=%d mins, daily_budget=%d mins, status=%s", total_mins, daily_budget, status)
        return total_mins, daily_budget, status, assumptions
