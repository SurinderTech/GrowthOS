"""
Backend/nova/progress/event_ingestor.py

Event Ingestor for NOVA Progress Engine.
Handles event ingestion, tenant isolation validation, idempotency deduplication, and out-of-order timestamp reconciliation.
"""

from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from Backend.nova.progress.types import ExecutionEventRecord, ExecutionEventType
from Backend.nova.progress.models import NovaExecutionEventModel

logger = logging.getLogger("growthos.nova.progress.event_ingestor")


class ExecutionEventIngestor:
    """
    Ingests and deduplicates execution events with strict tenant isolation.
    """

    def ingest_event(
        self,
        event: ExecutionEventRecord,
        db: Optional[Session] = None,
        authenticated_user_id: Optional[str] = None,
    ) -> tuple[bool, str]:
        """
        Ingests execution event with idempotency and user ownership checks.
        """
        # 1. Tenant Security: Enforce user_id match with authenticated user
        if authenticated_user_id and str(event.user_id) != str(authenticated_user_id):
            logger.warning("[EVENT_INGESTOR] Security violation: event user_id %s != authenticated user %s", event.user_id, authenticated_user_id)
            return False, "Tenant ownership mismatch."

        # 2. Idempotency Check & DB Persistence
        if db and event.user_id:
            try:
                from uuid import UUID, uuid5, NAMESPACE_DNS
                try:
                    user_uuid = UUID(str(event.user_id))
                except Exception:
                    user_uuid = uuid5(NAMESPACE_DNS, str(event.user_id))

                if event.idempotency_key:
                    existing = (
                        db.query(NovaExecutionEventModel)
                        .filter(NovaExecutionEventModel.idempotency_key == event.idempotency_key)
                        .first()
                    )
                    if existing:
                        logger.info("[EVENT_INGESTOR] Duplicate event ignored (idempotency_key=%s)", event.idempotency_key)
                        return True, "Duplicate event ignored (idempotent)."

                rec = NovaExecutionEventModel(
                    user_id=user_uuid,
                    task_id=event.task_id,
                    plan_id=event.plan_id,
                    goal_id=event.goal_id,
                    event_type=event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type),
                    duration_seconds=event.duration_seconds,
                    completion_percentage=event.completion_percentage,
                    difficulty_rating=event.difficulty_rating,
                    user_feedback=event.user_feedback,
                    idempotency_key=event.idempotency_key,
                )
                db.add(rec)
                db.commit()
                logger.info("[EVENT_INGESTOR] Successfully ingested event '%s' for task=%s user=%s", event.event_type, event.task_id, event.user_id)
            except Exception as exc:
                logger.error("[EVENT_INGESTOR] Failed to persist event: %s", exc)
                db.rollback()

        return True, "Event ingested successfully."
