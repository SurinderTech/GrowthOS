"""
Backend/nova/rag/evaluator.py

Retrieval Sufficiency Evaluator for NOVA RAG Engine.
Classifies vector search outputs into SUFFICIENT, INSUFFICIENT, or HYBRID levels to drive web fallback.
"""

from __future__ import annotations

import logging
from typing import List

from Backend.nova.rag.types import (
    KnowledgeRetrievalResult,
    SufficiencyLevel,
)

logger = logging.getLogger("growthos.nova.rag.evaluator")


class RetrievalSufficiencyEvaluator:
    """
    Evaluates whether vector search results contain sufficient relevant information.
    Triggers web search fallback when knowledge base content is missing, weak, or partial.
    """

    HIGH_THRESHOLD: float = 0.70
    MEDIUM_THRESHOLD: float = 0.45

    def evaluate(
        self,
        query_text: str,
        results: List[KnowledgeRetrievalResult],
    ) -> SufficiencyLevel:
        """
        Evaluates retrieval sufficiency for a given user query and candidates.
        """
        if not results:
            logger.info("[SUFFICIENCY_EVAL] Zero RAG candidates returned -> INSUFFICIENT")
            return SufficiencyLevel.INSUFFICIENT

        top_score = results[0].score
        q_lower = query_text.lower()

        hybrid_keywords = ["recently", "latest", "update", "newest", "current web", "2026"]
        wants_web_update = any(k in q_lower for k in hybrid_keywords)

        if wants_web_update and top_score >= self.MEDIUM_THRESHOLD:
            logger.info("[SUFFICIENCY_EVAL] RAG found (score=%.2f) but user requested recent updates -> HYBRID", top_score)
            return SufficiencyLevel.HYBRID

        if top_score >= self.HIGH_THRESHOLD:
            logger.info("[SUFFICIENCY_EVAL] Strong RAG match (score=%.2f) -> SUFFICIENT", top_score)
            return SufficiencyLevel.SUFFICIENT
        elif top_score >= self.MEDIUM_THRESHOLD:
            logger.info("[SUFFICIENCY_EVAL] Moderate RAG match (score=%.2f) -> HYBRID", top_score)
            return SufficiencyLevel.HYBRID
        else:
            logger.info("[SUFFICIENCY_EVAL] Weak RAG match (score=%.2f < %.2f) -> INSUFFICIENT", top_score, self.MEDIUM_THRESHOLD)
            return SufficiencyLevel.INSUFFICIENT
