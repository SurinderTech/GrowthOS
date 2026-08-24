"""
Backend/nova/adaptive/diff_calculator.py

Plan Diff Calculator for NOVA Adaptive Engine.
Calculates structured differences (added, removed, modified, moved) between Plan v1 and Plan v2.
"""

from __future__ import annotations

import logging
from typing import List

from Backend.nova.planner.types import PlanPhaseItem, PlanningPayload, TaskItem
from Backend.nova.adaptive.types import PlanDiffItem, PlanDiffPayload

logger = logging.getLogger("growthos.nova.adaptive.diff_calculator")


class PlanDiffCalculator:
    """
    Computes structured plan diffs between plan versions.
    """

    def compute_diff(
        self,
        old_plan: Optional[PlanningPayload],
        new_plan: PlanningPayload,
    ) -> PlanDiffPayload:
        """
        Calculates diff items comparing old_plan and new_plan.
        """
        old_ver = old_plan.plan_version if old_plan else 1
        new_ver = new_plan.plan_version if new_plan else old_ver + 1

        diff_items: List[PlanDiffItem] = []

        if not old_plan:
            diff_items.append(
                PlanDiffItem(
                    action_type="added",
                    item_type="plan",
                    title=f"Created Plan v{new_ver}",
                    description=f"Initial plan creation for goal '{new_plan.goal_title}'",
                    reason="Initial plan generation.",
                )
            )
            return PlanDiffPayload(old_version=old_ver, new_version=new_ver, diffs=diff_items, summary="Initial plan generated.")

        # Extract task titles
        old_tasks: set[str] = set()
        for p in old_plan.phases:
            for ms in p.milestones:
                for obj in ms.objectives:
                    for t in obj.tasks:
                        old_tasks.add(t.title.strip().lower())

        new_tasks: set[str] = set()
        for p in new_plan.phases:
            for ms in p.milestones:
                for obj in ms.objectives:
                    for t in obj.tasks:
                        new_tasks.add(t.title.strip().lower())

        # Added tasks
        added = new_tasks - old_tasks
        for t_name in added:
            diff_items.append(
                PlanDiffItem(
                    action_type="added",
                    item_type="task",
                    title=t_name.title(),
                    description="New task added to plan.",
                    reason="Targeted adaptation or prerequisite insertion.",
                )
            )

        # Removed tasks
        removed = old_tasks - new_tasks
        for t_name in removed:
            diff_items.append(
                PlanDiffItem(
                    action_type="removed",
                    item_type="task",
                    title=t_name.title(),
                    description="Obsolete task removed from plan.",
                    reason="Scope reduction or goal realignment.",
                )
            )

        summary_text = f"Plan updated from v{old_ver} to v{new_ver} ({len(added)} tasks added, {len(removed)} tasks removed)."
        logger.info("[PLAN_DIFF] Computed diff for Plan v%d -> v%d: %s", old_ver, new_ver, summary_text)

        return PlanDiffPayload(old_version=old_ver, new_version=new_ver, diffs=diff_items, summary=summary_text)
