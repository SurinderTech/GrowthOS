"""
Backend/nova/knowledge/types.py

Backwards-compatibility module re-exporting type definitions from Backend.nova.rag.types.
"""

from Backend.nova.rag.types import (
    DocumentVisibility,
    DocumentStatus,
    SufficiencyLevel,
    KnowledgeDocument,
    KnowledgeChunk,
    KnowledgeRetrievalQuery,
    KnowledgeRetrievalResult,
    KnowledgeContextPayload,
)

__all__ = [
    "DocumentVisibility",
    "DocumentStatus",
    "SufficiencyLevel",
    "KnowledgeDocument",
    "KnowledgeChunk",
    "KnowledgeRetrievalQuery",
    "KnowledgeRetrievalResult",
    "KnowledgeContextPayload",
]
