"""
Backend/nova/progress/calculator.py

Progress Calculator for NOVA Progress Engine.
Calculates deterministic time ratios, partial completion percentages, and weighted hierarchical progress propagation.
"""

from __future__ import annotations

import logging
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.progress.types import ExecutionEventRecord, ProgressSnapshot

logger = logging.getLogger("growthos.nova.progress.calculator")


class ProgressCalculator:
    """
    Computes deterministic progress metrics and hierarchical progress propagation.
    """

    def compute_snapshot(
        self,
        events: List[ExecutionEventRecord],
        estimated_duration_mins: int = 60,
        state: Optional[NovaState] = None,
    ) -> ProgressSnapshot:
        """
        Computes progress metrics from execution events and state context.
        """
        snapshot = ProgressSnapshot()

        if not events:
            return snapshot

        latest_event = events[-1]
        snapshot.task_progress_pct = round(max(0.0, min(100.0, latest_event.completion_percentage)), 1)

        # Actual vs estimated time ratio calculation
        actual_mins = latest_event.duration_seconds / 60.0
        if estimated_duration_mins > 0 and actual_mins > 0:
            snapshot.actual_vs_estimated_ratio = round(actual_mins / estimated_duration_mins, 2)
        else:
            snapshot.actual_vs_estimated_ratio = 1.0

        # Hierarchical progress propagation
        snapshot.objective_progress_pct = snapshot.task_progress_pct
        snapshot.milestone_progress_pct = snapshot.task_progress_pct * 0.8
        snapshot.phase_progress_pct = snapshot.task_progress_pct * 0.5
        snapshot.plan_progress_pct = snapshot.task_progress_pct * 0.3
        snapshot.goal_progress_pct = snapshot.task_progress_pct * 0.2

        if state and state.current_goal and state.current_goal.overall_progress_pct:
            snapshot.goal_progress_pct = float(state.current_goal.overall_progress_pct)

        logger.info(
            "[PROGRESS_CALCULATOR] Computed snapshot: task=%.1f%%, ratio=%.2fx",
            snapshot.task_progress_pct,
            snapshot.actual_vs_estimated_ratio,
        )
        return snapshot
