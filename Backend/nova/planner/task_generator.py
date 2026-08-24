"""
Backend/nova/planner/task_generator.py

Task Generator for NOVA Planning Engine.
Decomposes gap analysis items and goal objectives into structured Phases, Milestones, Objectives, and Tasks.
"""

from __future__ import annotations

import logging
import uuid
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.planner.types import (
    GapAnalysisItem,
    MilestoneItem,
    ObjectiveItem,
    PlanPhaseItem,
    PriorityLevel,
    TaskItem,
    TaskItemType,
)

logger = logging.getLogger("growthos.nova.planner.task_generator")


class TaskGenerator:
    """
    Decomposes gap items into strategic phases, milestones, objectives, and actionable tasks.
    """

    def generate_phases_and_tasks(
        self,
        goal_title: str,
        gap_items: List[GapAnalysisItem],
        state: Optional[NovaState] = None,
    ) -> List[PlanPhaseItem]:
        """
        Generates hierarchical PlanPhaseItem structure from gap analysis items.
        """
        phases: List[PlanPhaseItem] = []
        u_level = ((state.user.experience_level if state and state.user else None) or "beginner").lower()

        # Group gaps into Phase 1 (Foundations), Phase 2 (Core Concepts & Practice), Phase 3 (Projects & Mastery)
        phase1_tasks: List[TaskItem] = []
        phase2_tasks: List[TaskItem] = []
        phase3_tasks: List[TaskItem] = []

        for idx, gap in enumerate(gap_items):
            t_learn = TaskItem(
                title=f"Learn {gap.skill_or_topic}",
                description=f"Understand fundamental concepts and core principles of {gap.skill_or_topic}.",
                task_type=TaskItemType.LEARN,
                estimated_minutes=max(30, gap.effort_mins // 2),
                difficulty=u_level,
                completion_criteria=f"Mastered core concepts of {gap.skill_or_topic}.",
                prerequisites=gap.prerequisites,
            )
            t_practice = TaskItem(
                title=f"Practice {gap.skill_or_topic} Exercises",
                description=f"Solve targeted practice problems and hands-on exercises for {gap.skill_or_topic}.",
                task_type=TaskItemType.PRACTICE,
                estimated_minutes=max(30, gap.effort_mins // 2),
                difficulty=u_level,
                completion_criteria=f"Successfully completed practice exercises for {gap.skill_or_topic}.",
                prerequisites=[t_learn.title],
            )

            if idx < len(gap_items) // 3 or idx == 0:
                phase1_tasks.extend([t_learn, t_practice])
            elif idx < (len(gap_items) * 2) // 3:
                phase2_tasks.extend([t_learn, t_practice])
            else:
                phase3_tasks.extend([t_learn, t_practice])

        # Always add a portfolio build / capstone task in Phase 3
        phase3_tasks.append(
            TaskItem(
                title=f"Build {goal_title} Capstone Project",
                description=f"Construct an end-to-end practical project demonstrating complete mastery of {goal_title}.",
                task_type=TaskItemType.BUILD,
                estimated_minutes=120,
                difficulty="intermediate",
                completion_criteria="Functional project built and verified.",
            )
        )

        # Build Phase 1
        p1_obj = ObjectiveItem(title="Foundational Knowledge", description="Establish core prerequisites.", tasks=phase1_tasks)
        p1_ms = MilestoneItem(title="Foundation Phase", description="Complete basic concepts.", objectives=[p1_obj])
        phases.append(PlanPhaseItem(phase_number=1, title="Phase 1: Foundations & Core Concepts", theme="Foundations", milestones=[p1_ms]))

        # Build Phase 2
        p2_obj = ObjectiveItem(title="Practical Application", description="Apply skills through problem solving.", tasks=phase2_tasks)
        p2_ms = MilestoneItem(title="Application Phase", description="Master problem solving.", objectives=[p2_obj])
        phases.append(PlanPhaseItem(phase_number=2, title="Phase 2: Core Skills & Problem Solving", theme="Application", milestones=[p2_ms]))

        # Build Phase 3
        p3_obj = ObjectiveItem(title="Project & Portfolio", description="Build real-world proof of capability.", tasks=phase3_tasks)
        p3_ms = MilestoneItem(title="Mastery & Portfolio", description="Complete capstone project.", objectives=[p3_obj])
        phases.append(PlanPhaseItem(phase_number=3, title="Phase 3: Real-World Projects & Mastery", theme="Mastery", milestones=[p3_ms]))

        logger.info("[TASK_GENERATOR] Generated 3 phases with hierarchical tasks for goal='%s'", goal_title)
        return phases
