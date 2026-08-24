"""
Backend/nova/memory/retriever.py

Provider-agnostic Memory Retriever for NOVA.
Fetches candidate memories from repository and applies multi-signal ranking.
Designed as a pluggable abstraction so vector search / embeddings can be added seamlessly in future steps.
"""

from __future__ import annotations

import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from Backend.nova.memory.types import (
    MemoryRecord,
    MemoryStatus,
    MemoryType,
    RetrievalQuery,
)
from Backend.nova.memory.repository import MemoryRepository
from Backend.nova.memory.ranker import MemoryRanker
from Backend.nova.memory.policies import MemoryPolicies

logger = logging.getLogger("growthos.nova.memory.retriever")


class MemoryRetriever:
    """
    Coordinates memory lookup from repository and ranking based on query parameters.
    """

    def __init__(self, repository: MemoryRepository, ranker: MemoryRanker):
        self.repo = repository
        self.ranker = ranker

    def retrieve(
        self,
        db: Session,
        query: RetrievalQuery,
    ) -> List[MemoryRecord]:
        """
        Retrieves, ranks, and policy-filters relevant user memories.
        """
        try:
            status_filter = None if query.include_archived else MemoryStatus.ACTIVE

            # 1. Fetch candidates from repository
            candidates: List[MemoryRecord] = []
            if query.query_text:
                candidates = self.repo.find_similar_or_related_memories(
                    db,
                    user_id=query.user_id,
                    query=query.query_text,
                    limit=30,
                )

            # If search query returned few candidates or no query provided, list active memories
            if len(candidates) < 5:
                all_active = self.repo.list_user_memories(
                    db,
                    user_id=query.user_id,
                    status=status_filter,
                    limit=30,
                )
                # Deduplicate by ID
                seen_ids = {c.id for c in candidates}
                for mem in all_active:
                    if mem.id not in seen_ids:
                        candidates.append(mem)
                        seen_ids.add(mem.id)

            # 2. Filter by minimum confidence if specified
            if query.min_confidence > 0.0:
                candidates = [c for c in candidates if c.confidence >= query.min_confidence]

            # 3. Filter by memory types if specified
            if query.memory_types:
                type_set = set(query.memory_types)
                candidates = [c for c in candidates if c.memory_type in type_set]

            # 4. Rank candidates using multi-signal ranker
            ranked = self.ranker.rank_memories(
                memories=candidates,
                query_text=query.query_text,
                limit=query.limit,
            )

            # 5. Apply retrieval policy cap
            final_memories = MemoryPolicies.apply_retrieval_policy(ranked, limit=query.limit)

            # 6. Touch last_accessed timestamp in background
            if final_memories:
                retrieved_ids = [m.id for m in final_memories]
                self.repo.touch_last_accessed(db, retrieved_ids, user_id=query.user_id)

            return final_memories
        except Exception as exc:
            logger.error("Failed memory retrieval: %s", exc)
            return []
