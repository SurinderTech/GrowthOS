"""
Backend/nova/memory/repository.py

Data Access Layer for NOVA Memory Infrastructure.
Guarantees strict user_id isolation for every persistence operation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from Backend.nova.memory.models import UserMemory
from Backend.nova.memory.types import (
    MemoryRecord,
    MemoryType,
    MemorySource,
    MemoryStatus,
)

logger = logging.getLogger("growthos.nova.memory.repository")


class MemoryRepository:
    """
    Persistence layer managing CRUD operations on UserMemory entities.
    Strictly enforces user_id boundaries across all queries.
    """

    @staticmethod
    def _to_record(model: UserMemory) -> MemoryRecord:
        """Converts SQLAlchemy model to serializable Pydantic MemoryRecord."""
        return MemoryRecord(
            id=str(model.id),
            user_id=str(model.user_id),
            memory_type=MemoryType(model.memory_type) if model.memory_type in MemoryType._value2member_map_ else MemoryType.SEMANTIC,
            content=model.content,
            source=MemorySource(model.source) if model.source in MemorySource._value2member_map_ else MemorySource.EXPLICIT_USER,
            confidence=float(model.confidence or 1.0),
            importance=float(model.importance or 0.5),
            status=MemoryStatus(model.status) if model.status in MemoryStatus._value2member_map_ else MemoryStatus.ACTIVE,
            metadata=model.metadata_json or {},
            created_at=model.created_at.isoformat() if model.created_at else datetime.now(timezone.utc).isoformat(),
            updated_at=model.updated_at.isoformat() if model.updated_at else datetime.now(timezone.utc).isoformat(),
            last_accessed_at=model.last_accessed_at.isoformat() if model.last_accessed_at else None,
        )

    def create_memory(
        self,
        db: Session,
        *,
        user_id: UUID | str,
        content: str,
        memory_type: MemoryType | str = MemoryType.SEMANTIC,
        source: MemorySource | str = MemorySource.EXPLICIT_USER,
        confidence: float = 1.0,
        importance: float = 0.5,
        status: MemoryStatus | str = MemoryStatus.ACTIVE,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MemoryRecord:
        """Creates and persists a new memory record."""
        user_uuid = UUID(str(user_id))
        m_type = memory_type.value if isinstance(memory_type, MemoryType) else str(memory_type)
        m_src = source.value if isinstance(source, MemorySource) else str(source)
        m_status = status.value if isinstance(status, MemoryStatus) else str(status)

        model = UserMemory(
            user_id=user_uuid,
            content=content.strip(),
            memory_type=m_type,
            source=m_src,
            confidence=max(0.0, min(1.0, float(confidence))),
            importance=max(0.0, min(1.0, float(importance))),
            status=m_status,
            metadata_json=metadata or {},
        )
        db.add(model)
        db.commit()
        db.refresh(model)
        return self._to_record(model)

    def get_memory(self, db: Session, memory_id: UUID | str, user_id: UUID | str) -> Optional[MemoryRecord]:
        """Fetches a specific memory record by ID with user_id isolation."""
        try:
            mem_uuid = UUID(str(memory_id))
            user_uuid = UUID(str(user_id))
            model = db.query(UserMemory).filter(
                UserMemory.id == mem_uuid,
                UserMemory.user_id == user_uuid,
            ).first()
            return self._to_record(model) if model else None
        except Exception as exc:
            logger.debug("Failed get_memory: %s", exc)
            return None

    def list_user_memories(
        self,
        db: Session,
        user_id: UUID | str,
        *,
        memory_type: Optional[MemoryType | str] = None,
        status: Optional[MemoryStatus | str] = MemoryStatus.ACTIVE,
        limit: int = 50,
    ) -> List[MemoryRecord]:
        """Lists memories for a user filtered by optional type and status."""
        try:
            user_uuid = UUID(str(user_id))
            q = db.query(UserMemory).filter(UserMemory.user_id == user_uuid)

            if memory_type:
                m_type = memory_type.value if isinstance(memory_type, MemoryType) else str(memory_type)
                q = q.filter(UserMemory.memory_type == m_type)

            if status:
                m_status = status.value if isinstance(status, MemoryStatus) else str(status)
                q = q.filter(UserMemory.status == m_status)

            models = q.order_by(UserMemory.updated_at.desc()).limit(limit).all()
            return [self._to_record(m) for m in models]
        except Exception as exc:
            logger.debug("Failed list_user_memories: %s", exc)
            return []

    def update_memory(
        self,
        db: Session,
        memory_id: UUID | str,
        user_id: UUID | str,
        updates: Dict[str, Any],
    ) -> Optional[MemoryRecord]:
        """Updates attributes of an existing memory record."""
        try:
            mem_uuid = UUID(str(memory_id))
            user_uuid = UUID(str(user_id))
            model = db.query(UserMemory).filter(
                UserMemory.id == mem_uuid,
                UserMemory.user_id == user_uuid,
            ).first()

            if not model:
                return None

            if "content" in updates:
                model.content = str(updates["content"]).strip()
            if "confidence" in updates:
                model.confidence = max(0.0, min(1.0, float(updates["confidence"])))
            if "importance" in updates:
                model.importance = max(0.0, min(1.0, float(updates["importance"])))
            if "status" in updates:
                val = updates["status"]
                model.status = val.value if isinstance(val, MemoryStatus) else str(val)
            if "metadata" in updates:
                merged = dict(model.metadata_json or {})
                merged.update(updates["metadata"])
                model.metadata_json = merged

            model.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(model)
            return self._to_record(model)
        except Exception as exc:
            logger.error("Failed update_memory: %s", exc)
            db.rollback()
            return None

    def delete_or_archive_memory(
        self,
        db: Session,
        memory_id: UUID | str,
        user_id: UUID | str,
        hard_delete: bool = False,
    ) -> bool:
        """Archives or permanently deletes a memory record."""
        try:
            mem_uuid = UUID(str(memory_id))
            user_uuid = UUID(str(user_id))
            model = db.query(UserMemory).filter(
                UserMemory.id == mem_uuid,
                UserMemory.user_id == user_uuid,
            ).first()

            if not model:
                return False

            if hard_delete:
                db.delete(model)
            else:
                model.status = MemoryStatus.ARCHIVED.value
                model.updated_at = datetime.now(timezone.utc)

            db.commit()
            return True
        except Exception as exc:
            logger.error("Failed delete_or_archive_memory: %s", exc)
            db.rollback()
            return False

    def find_similar_or_related_memories(
        self,
        db: Session,
        user_id: UUID | str,
        query: str,
        *,
        memory_type: Optional[MemoryType | str] = None,
        limit: int = 20,
    ) -> List[MemoryRecord]:
        """
        Keyword and token matching retriever for finding related memories.
        Extensible abstraction for future vector/pgvector embedding search.
        """
        try:
            user_uuid = UUID(str(user_id))
            q = db.query(UserMemory).filter(
                UserMemory.user_id == user_uuid,
                UserMemory.status == MemoryStatus.ACTIVE.value,
            )

            if memory_type:
                m_type = memory_type.value if isinstance(memory_type, MemoryType) else str(memory_type)
                q = q.filter(UserMemory.memory_type == m_type)

            # Basic text matching (ilike token match)
            words = [w.strip() for w in query.split() if len(w.strip()) > 2]
            if words:
                conditions = [UserMemory.content.ilike(f"%{w}%") for w in words[:5]]
                q = q.filter(or_(*conditions))

            models = q.limit(limit).all()
            return [self._to_record(m) for m in models]
        except Exception as exc:
            logger.debug("Failed find_similar_or_related_memories: %s", exc)
            return []

    def touch_last_accessed(self, db: Session, memory_ids: List[str], user_id: UUID | str) -> None:
        """Updates last_accessed_at timestamp for a batch of retrieved memories."""
        try:
            user_uuid = UUID(str(user_id))
            valid_uuids = [UUID(m) for m in memory_ids]
            db.query(UserMemory).filter(
                UserMemory.id.in_(valid_uuids),
                UserMemory.user_id == user_uuid,
            ).update(
                {UserMemory.last_accessed_at: datetime.now(timezone.utc)},
                synchronize_session=False,
            )
            db.commit()
        except Exception as exc:
            logger.debug("Failed touch_last_accessed: %s", exc)
            db.rollback()
