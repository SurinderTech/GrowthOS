"""
Backend/nova/planner/dependency_engine.py

Dependency Engine for NOVA Planning Engine.
Manages prerequisite relationships, validates DAG graphs, and computes topological task ordering.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Set, Tuple

from Backend.nova.planner.types import TaskDependency, TaskItem

logger = logging.getLogger("growthos.nova.planner.dependency_engine")


class DependencyEngine:
    """
    Validates dependency relationships and orders tasks topologically.
    """

    def extract_dependencies(self, tasks: List[TaskItem]) -> List[TaskDependency]:
        """Extracts explicit TaskDependency items from task prerequisites."""
        deps: List[TaskDependency] = []
        title_to_id: Dict[str, str] = {t.title.lower().strip(): t.id for t in tasks}

        for t in tasks:
            for prereq_title in t.prerequisites:
                p_norm = prereq_title.lower().strip()
                if p_norm in title_to_id:
                    deps.append(
                        TaskDependency(
                            task_id=t.id,
                            depends_on_task_id=title_to_id[p_norm],
                            dependency_type="prerequisite",
                        )
                    )
        return deps

    def sort_tasks_topologically(self, tasks: List[TaskItem]) -> List[TaskItem]:
        """
        Sorts tasks topologically based on prerequisites while preserving priority order.
        """
        if not tasks:
            return []

        deps = self.extract_dependencies(tasks)
        dep_graph: Dict[str, Set[str]] = {t.id: set() for t in tasks}
        task_map: Dict[str, TaskItem] = {t.id: t for t in tasks}

        for d in deps:
            if d.task_id in dep_graph:
                dep_graph[d.task_id].add(d.depends_on_task_id)

        sorted_tasks: List[TaskItem] = []
        visited: Set[str] = set()

        def visit(task_id: str, ancestors: Set[str]) -> None:
            if task_id in ancestors:
                logger.warning("[DEPENDENCY_ENGINE] Circular dependency detected involving task %s", task_id)
                return
            if task_id not in visited:
                visited.add(task_id)
                for prereq_id in dep_graph.get(task_id, set()):
                    visit(prereq_id, ancestors | {task_id})
                if task_id in task_map:
                    sorted_tasks.append(task_map[task_id])

        for t in tasks:
            if t.id not in visited:
                visit(t.id, set())

        logger.info("[DEPENDENCY_ENGINE] Topologically sorted %d tasks", len(sorted_tasks))
        return sorted_tasks
