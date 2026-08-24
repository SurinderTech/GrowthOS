"""
Backend/nova/planner/resource_integrator.py

Resource Integrator for NOVA Planning Engine.
Integrates with Step 7 ResourceManager to associate recommended resource IDs with plan tasks.
"""

from __future__ import annotations

import logging
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.planner.types import TaskItem
from Backend.nova.resources import get_resource_manager

logger = logging.getLogger("growthos.nova.planner.resource_integrator")


class ResourceIntegrator:
    """
    Associates Step 7 resources with executable plan tasks.
    """

    def attach_resources_to_tasks(
        self,
        tasks: List[TaskItem],
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
        state: Optional[NovaState] = None,
    ) -> List[TaskItem]:
        """
        Attaches recommended resource IDs from Step 7 to learning/practice tasks.
        """
        mgr = get_resource_manager()

        for t in tasks:
            if t.task_type in ("learn", "practice") and not t.resource_ids:
                try:
                    payload = mgr.discover_evaluate_and_recommend(
                        query_text=t.title,
                        db=db,
                        user_id=user_id,
                        state=state,
                    )
                    bundle = payload.recommended_bundle
                    if bundle.primary:
                        t.resource_ids.append(bundle.primary.resource.id)
                    if bundle.practice and bundle.practice != bundle.primary:
                        t.resource_ids.append(bundle.practice.resource.id)
                except Exception as exc:
                    logger.debug("[RESOURCE_INTEGRATOR] Resource attachment failed safely: %s", exc)

        logger.info("[RESOURCE_INTEGRATOR] Resource attachment completed for %d tasks", len(tasks))
        return tasks
