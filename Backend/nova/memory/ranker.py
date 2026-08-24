"""
Backend/nova/memory/ranker.py

Multi-Signal Memory Ranker for NOVA.
Ranks retrieved user memories by calculating a composite score based on:
1. Relevance to current query/context
2. Importance weighting
3. Source confidence weighting
4. Recency decay factor
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import List, Optional

from Backend.nova.memory.types import MemoryRecord, MemorySource


class MemoryRanker:
    """
    Ranks memories from most useful to least useful using explainable multi-signal scoring.
    """

    def __init__(
        self,
        weight_relevance: float = 0.40,
        weight_importance: float = 0.25,
        weight_confidence: float = 0.20,
        weight_recency: float = 0.15,
        half_life_days: float = 14.0,
    ):
        self.w_rel = weight_relevance
        self.w_imp = weight_importance
        self.w_conf = weight_confidence
        self.w_rec = weight_recency
        self.half_life_days = half_life_days

    def calculate_recency_score(self, memory: MemoryRecord, now: Optional[datetime] = None) -> float:
        """Calculates exponential recency decay score between 0.0 and 1.0."""
        ref_time = now or datetime.now(timezone.utc)
        try:
            timestamp_str = memory.updated_at or memory.created_at
            created_dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            age_days = max(0.0, (ref_time - created_dt).total_seconds() / 86400.0)
            decay = math.exp(-math.log(2) * (age_days / self.half_life_days))
            return max(0.0, min(1.0, decay))
        except Exception:
            return 0.5

    def calculate_relevance_score(self, memory: MemoryRecord, query_text: Optional[str] = None) -> float:
        """Calculates token overlap relevance score between query and memory content."""
        if not query_text or not query_text.strip():
            return 0.5  # Neutral score when no query filter provided

        query_words = set(w.lower().strip(",.!?") for w in query_text.split() if len(w.strip()) > 2)
        if not query_words:
            return 0.5

        content_words = set(w.lower().strip(",.!?") for w in memory.content.split())
        overlap = query_words.intersection(content_words)

        # Ratio of matched query terms
        score = len(overlap) / float(len(query_words))
        return min(1.0, score)

    def score_memory(self, memory: MemoryRecord, query_text: Optional[str] = None, now: Optional[datetime] = None) -> float:
        """Computes composite final score for a memory record."""
        rel_score = self.calculate_relevance_score(memory, query_text)
        imp_score = max(0.0, min(1.0, memory.importance))
        conf_score = max(0.0, min(1.0, memory.confidence))
        rec_score = self.calculate_recency_score(memory, now)

        composite = (
            (self.w_rel * rel_score) +
            (self.w_imp * imp_score) +
            (self.w_conf * conf_score) +
            (self.w_rec * rec_score)
        )
        return round(composite, 4)

    def rank_memories(
        self,
        memories: List[MemoryRecord],
        query_text: Optional[str] = None,
        limit: int = 5,
    ) -> List[MemoryRecord]:
        """
        Ranks memories in descending order of usefulness and returns top N items.
        """
        if not memories:
            return []

        now = datetime.now(timezone.utc)
        scored_pairs = [
            (self.score_memory(m, query_text=query_text, now=now), m)
            for m in memories
        ]

        # Sort descending by score
        scored_pairs.sort(key=lambda x: x[0], reverse=True)
        return [pair[1] for pair in scored_pairs[:limit]]
