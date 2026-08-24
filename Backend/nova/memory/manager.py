"""
Backend/nova/memory/manager.py

Memory Manager — Main lifecycle entry point for NOVA Memory Infrastructure.
Coordinates Repository, Policies, Extractor, Retriever, and Ranker into clean APIs:
- remember()
- retrieve()
- update()
- forget()
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from Backend.nova.memory.types import (
    MemoryCandidate,
    MemoryRecord,
    MemorySource,
    MemoryStatus,
    MemoryType,
    RetrievalQuery,
)
from Backend.nova.memory.repository import MemoryRepository
from Backend.nova.memory.policies import MemoryPolicies
from Backend.nova.memory.extractor import MemoryExtractor
from Backend.nova.memory.ranker import MemoryRanker
from Backend.nova.memory.retriever import MemoryRetriever
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

logger = logging.getLogger("growthos.nova.memory.manager")


class MemoryManager:
    """
    High-level orchestrator for NOVA's personal memory lifecycle.
    """

    def __init__(
        self,
        repository: Optional[MemoryRepository] = None,
        ranker: Optional[MemoryRanker] = None,
        retriever: Optional[MemoryRetriever] = None,
        extractor: Optional[MemoryExtractor] = None,
    ):
        self.repo = repository or MemoryRepository()
        self.ranker = ranker or MemoryRanker()
        self.retriever = retriever or MemoryRetriever(self.repo, self.ranker)
        self.extractor = extractor or MemoryExtractor()

    def remember(
        self,
        db: Session,
        *,
        user_id: UUID | str,
        content: str,
        memory_type: MemoryType | str = MemoryType.SEMANTIC,
        source: MemorySource | str = MemorySource.EXPLICIT_USER,
        confidence: Optional[float] = None,
        importance: float = 0.5,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[MemoryRecord]:
        """
        Stores a memory record after evaluating write policies and deduplication.
        """
        try:
            m_type = MemoryType(memory_type) if isinstance(memory_type, str) and memory_type in MemoryType._value2member_map_ else memory_type
            m_src = MemorySource(source) if isinstance(source, str) and source in MemorySource._value2member_map_ else source

            if not isinstance(m_type, MemoryType):
                m_type = MemoryType.SEMANTIC
            if not isinstance(m_src, MemorySource):
                m_src = MemorySource.EXPLICIT_USER

            resolved_conf = MemoryPolicies.resolve_confidence(m_src, confidence)
            candidate = MemoryCandidate(
                memory_type=m_type,
                content=content,
                source=m_src,
                confidence=resolved_conf,
                importance=importance,
                metadata=metadata or {},
            )

            return MemoryPolicies.apply_write_policy(db, self.repo, str(user_id), candidate)
        except Exception as exc:
            logger.error("MemoryManager.remember failed: %s", exc)
            return None

    def retrieve(
        self,
        db: Session,
        *,
        user_id: UUID | str,
        query_text: Optional[str] = None,
        memory_types: Optional[List[MemoryType | str]] = None,
        min_confidence: float = 0.0,
        limit: int = 5,
        include_archived: bool = False,
    ) -> List[MemoryRecord]:
        """
        Retrieves and ranks relevant user memories.
        """
        try:
            parsed_types: Optional[List[MemoryType]] = None
            if memory_types:
                parsed_types = [
                    t if isinstance(t, MemoryType) else MemoryType(t)
                    for t in memory_types if t in MemoryType._value2member_map_ or isinstance(t, MemoryType)
                ]

            q = RetrievalQuery(
                user_id=str(user_id),
                query_text=query_text,
                memory_types=parsed_types,
                min_confidence=min_confidence,
                limit=limit,
                include_archived=include_archived,
            )

            return self.retriever.retrieve(db, q)
        except Exception as exc:
            logger.error("MemoryManager.retrieve failed: %s", exc)
            return []

    def update(
        self,
        db: Session,
        *,
        user_id: UUID | str,
        memory_id: UUID | str,
        new_content: str,
        supersede_old: bool = True,
    ) -> Optional[MemoryRecord]:
        """
        Updates or supersedes an existing memory record.
        """
        try:
            return MemoryPolicies.apply_update_policy(
                db, self.repo, str(user_id), str(memory_id), new_content, supersede_old=supersede_old
            )
        except Exception as exc:
            logger.error("MemoryManager.update failed: %s", exc)
            return None

    def forget(
        self,
        db: Session,
        *,
        user_id: UUID | str,
        memory_id: UUID | str,
        hard_delete: bool = False,
    ) -> bool:
        """
        Archives or permanently deletes a user memory.
        """
        try:
            return MemoryPolicies.apply_forget_policy(
                db, self.repo, str(user_id), str(memory_id), hard_delete=hard_delete
            )
        except Exception as exc:
            logger.error("MemoryManager.forget failed: %s", exc)
            return False

    def extract_and_remember(
        self,
        db: Session,
        *,
        user_id: UUID | str,
        user_message: str,
        state: Optional[NovaState] = None,
    ) -> List[MemoryRecord]:
        """
        Extracts candidate memories from incoming message/state and persists valid items.
        """
        saved: List[MemoryRecord] = []
        try:
            candidates = self.extractor.extract_candidates(user_message, state)
            for c in candidates:
                rec = MemoryPolicies.apply_write_policy(db, self.repo, str(user_id), c)
                if rec:
                    saved.append(rec)
        except Exception as exc:
            logger.error("MemoryManager.extract_and_remember failed: %s", exc)
        return saved


# Global singleton instance
_default_memory_manager: Optional[MemoryManager] = None


def get_memory_manager() -> MemoryManager:
    global _default_memory_manager
    if _default_memory_manager is None:
        _default_memory_manager = MemoryManager()
    return _default_memory_manager
