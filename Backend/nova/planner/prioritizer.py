"""
Backend/nova/planner/prioritizer.py

Priority Calculator for NOVA Planning Engine.
Calculates task priority levels (CRITICAL, HIGH, MEDIUM, LOW) based on dependency blocking,
goal importance, and deadline proximity.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Set

from Backend.nova.planner.types import PriorityLevel, TaskDependency, TaskItem

logger = logging.getLogger("growthos.nova.planner.prioritizer")


class PriorityCalculator:
    """
    Computes priority levels for executable tasks.
    """

    def calculate_task_priorities(
        self,
        tasks: List[TaskItem],
        dependencies: Optional[List[TaskDependency]] = None,
    ) -> List[TaskItem]:
        """
        Assigns priority levels based on dependency blocking count and task type.
        """
        blocking_counts: Dict[str, int] = {t.id: 0 for t in tasks}

        if dependencies:
            for d in dependencies:
                # d.depends_on_task_id blocks d.task_id
                blocking_counts[d.depends_on_task_id] = blocking_counts.get(d.depends_on_task_id, 0) + 1

        for t in tasks:
            b_cnt = blocking_counts.get(t.id, 0)
            if b_cnt >= 2 or t.title.lower().startswith("foundations"):
                t.priority = PriorityLevel.CRITICAL
            elif b_cnt == 1 or t.task_type in ("learn", "practice"):
                t.priority = PriorityLevel.HIGH
            elif t.task_type in ("build", "revise"):
                t.priority = PriorityLevel.MEDIUM
            else:
                t.priority = PriorityLevel.LOW

        logger.info("[PRIORITY_CALCULATOR] Prioritized %d tasks", len(tasks))
        return tasks
