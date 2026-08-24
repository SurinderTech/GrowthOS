"""
Backend/nova/memory/policies.py

Memory Governance & Policies for NOVA.
Defines write, update, retrieval, and forget rules.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from Backend.nova.memory.types import (
    MemoryCandidate,
    MemoryRecord,
    MemorySource,
    MemoryStatus,
    MemoryType,
)
from Backend.nova.memory.repository import MemoryRepository

logger = logging.getLogger("growthos.nova.memory.policies")


class MemoryPolicies:
    """Encapsulates write, update, retrieval, and forget policies."""

    DEFAULT_SOURCE_CONFIDENCE: Dict[MemorySource, float] = {
        MemorySource.EXPLICIT_USER: 1.0,
        MemorySource.SYSTEM_OBSERVED: 0.85,
        MemorySource.SYSTEM_DERIVED: 0.70,
        MemorySource.LLM_INFERRED: 0.50,
    }

    MIN_CONFIDENCE_THRESHOLD: float = 0.30
    MAX_RETRIEVAL_LIMIT: int = 10

    @classmethod
    def resolve_confidence(cls, source: MemorySource, explicit_confidence: Optional[float] = None) -> float:
        """Enforces explicit confidence hierarchy mapping."""
        if explicit_confidence is not None:
            return max(0.0, min(1.0, float(explicit_confidence)))
        return cls.DEFAULT_SOURCE_CONFIDENCE.get(source, 0.5)

    @classmethod
    def apply_write_policy(
        cls,
        db: Session,
        repository: MemoryRepository,
        user_id: str,
        candidate: MemoryCandidate,
    ) -> Optional[MemoryRecord]:
        """
        Validates candidate memory against write policy:
        1. Resolves & checks confidence threshold.
        2. Checks for existing duplicate active memories.
        3. Persists if valid.
        """
        conf = cls.resolve_confidence(candidate.source, candidate.confidence)
        if conf < cls.MIN_CONFIDENCE_THRESHOLD:
            logger.info("Memory candidate rejected due to low confidence (%.2f < %.2f)", conf, cls.MIN_CONFIDENCE_THRESHOLD)
            return None

        clean_content = candidate.content.strip()
        if not clean_content:
            return None

        # Check existing active memories for exact or duplicate match
        existing_memories = repository.list_user_memories(
            db, user_id=user_id, memory_type=candidate.memory_type, status=MemoryStatus.ACTIVE
        )

        for mem in existing_memories:
            if mem.content.lower() == clean_content.lower():
                # Duplicate detected: update confidence/importance if higher, update timestamp
                new_conf = max(mem.confidence, conf)
                new_imp = max(mem.importance, candidate.importance)
                updated = repository.update_memory(
                    db,
                    memory_id=mem.id,
                    user_id=user_id,
                    updates={"confidence": new_conf, "importance": new_imp, "metadata": candidate.metadata},
                )
                logger.info("Duplicate memory updated rather than recreated ID=%s", mem.id)
                return updated

        # Create new record
        return repository.create_memory(
            db,
            user_id=user_id,
            content=clean_content,
            memory_type=candidate.memory_type,
            source=candidate.source,
            confidence=conf,
            importance=candidate.importance,
            status=MemoryStatus.ACTIVE,
            metadata=candidate.metadata,
        )

    @classmethod
    def apply_update_policy(
        cls,
        db: Session,
        repository: MemoryRepository,
        user_id: str,
        target_memory_id: str,
        new_content: str,
        supersede_old: bool = True,
    ) -> Optional[MemoryRecord]:
        """
        Handles memory updates and contradiction resolution.
        If supersede_old is True, marks old memory as SUPERSEDED and creates new record.
        """
        old_mem = repository.get_memory(db, memory_id=target_memory_id, user_id=user_id)
        if not old_mem:
            return None

        if supersede_old:
            repository.update_memory(
                db, memory_id=old_mem.id, user_id=user_id, updates={"status": MemoryStatus.SUPERSEDED}
            )
            return repository.create_memory(
                db,
                user_id=user_id,
                content=new_content,
                memory_type=old_mem.memory_type,
                source=old_mem.source,
                confidence=old_mem.confidence,
                importance=old_mem.importance,
                status=MemoryStatus.ACTIVE,
                metadata={"supersedes_id": old_mem.id},
            )
        else:
            return repository.update_memory(
                db, memory_id=old_mem.id, user_id=user_id, updates={"content": new_content}
            )

    @classmethod
    def apply_retrieval_policy(
        cls,
        memories: List[MemoryRecord],
        limit: int = 5,
    ) -> List[MemoryRecord]:
        """Limits returned memories to avoid prompt bloat."""
        capped_limit = min(limit, cls.MAX_RETRIEVAL_LIMIT)
        return memories[:capped_limit]

    @classmethod
    def apply_forget_policy(
        cls,
        db: Session,
        repository: MemoryRepository,
        user_id: str,
        memory_id: str,
        hard_delete: bool = False,
    ) -> bool:
        """Executes authorized deletion or archiving of memory."""
        return repository.delete_or_archive_memory(db, memory_id=memory_id, user_id=user_id, hard_delete=hard_delete)
