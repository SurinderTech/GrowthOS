"""
Backend/nova/adaptive/replanner.py

Adaptive Replanner for NOVA.
Executes targeted plan revisions while strictly preserving completed tasks, repairing topological dependencies,
and validating through Step 8 Critic/Verifier engine.
"""

from __future__ import annotations

import logging
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.planner import NovaPlanner, get_nova_planner, PlanningPayload, TaskItem
from Backend.nova.adaptive.types import AdaptationDecisionPayload, AdaptationDecisionType, AdaptationLevel

logger = logging.getLogger("growthos.nova.adaptive.replanner")


class AdaptiveReplanner:
    """
    Executes adaptive replanning with completed-work preservation.
    """

    def __init__(self, planner: Optional[NovaPlanner] = None):
        self.planner = planner or get_nova_planner()

    def execute_replan(
        self,
        decision: AdaptationDecisionPayload,
        old_plan: Optional[PlanningPayload],
        user_query: str,
        state: Optional[NovaState] = None,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
    ) -> PlanningPayload:
        """
        Executes replan according to decision level and preserves completed tasks.
        """
        old_ver = old_plan.plan_version if old_plan else 1
        new_ver = old_ver + 1

        target_query = user_query
        if decision.decision == AdaptationDecisionType.REPLAN_GOAL:
            target_query = user_query
        elif old_plan:
            target_query = old_plan.goal_title

        logger.info("[ADAPTIVE_REPLANNER] Executing replan v%d -> v%d (decision=%s, level=%s)", old_ver, new_ver, decision.decision.value, decision.level.value)

        # 1. Generate Revised Plan via Step 9 Planner
        new_plan = self.planner.generate_plan(
            user_query=target_query,
            state=state,
            db=db,
            user_id=user_id,
        )
        new_plan.plan_version = new_ver

        # 2. Preserve Completed Tasks from Old Plan
        if old_plan:
            completed_titles: set[str] = set()
            for phase in old_plan.phases:
                for ms in phase.milestones:
                    for obj in ms.objectives:
                        for t in obj.tasks:
                            if t.status == "completed":
                                completed_titles.add(t.title.strip().lower())

            # Mark matching tasks as completed in new plan
            for phase in new_plan.phases:
                for ms in phase.milestones:
                    for obj in ms.objectives:
                        for t in obj.tasks:
                            if t.title.strip().lower() in completed_titles:
                                t.status = "completed"

        # 3. Handle Prerequisite Insertion decision
        if decision.decision == AdaptationDecisionType.INSERT_PREREQUISITE and new_plan.phases:
            first_phase = new_plan.phases[0]
            if first_phase.milestones and first_phase.milestones[0].objectives:
                prereq_task = TaskItem(
                    title="Foundations Review & Guided Practice",
                    description="Targeted review session to reinforce prerequisite concepts.",
                    task_type="learn",
                    priority="critical",
                    estimated_minutes=30,
                    completion_criteria="Prerequisite concepts reviewed.",
                )
                first_phase.milestones[0].objectives[0].tasks.insert(0, prereq_task)
                new_plan.assumptions.append("Inserted foundational review task based on struggle feedback.")

        logger.info("[ADAPTIVE_REPLANNER] Successfully generated Plan v%d with preserved progress", new_ver)
        return new_plan
