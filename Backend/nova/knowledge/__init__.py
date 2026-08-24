"""
Backend/nova/knowledge/__init__.py

NOVA Knowledge & RAG Engine Package Alias.
Re-exports from Backend.nova.rag for seamless backwards compatibility.
"""

from Backend.nova.rag import (
    KnowledgeDocument,
    KnowledgeChunk,
    KnowledgeRetrievalQuery,
    KnowledgeRetrievalResult,
    KnowledgeContextPayload,
    DocumentVisibility,
    DocumentStatus,
    SufficiencyLevel,
    UserDocument,
    DocumentChunk,
    EmbeddingProvider,
    cosine_similarity,
    DocumentIngestor,
    KnowledgeRepository,
    RetrievalSufficiencyEvaluator,
    KnowledgeManager,
    get_knowledge_manager,
)

__all__ = [
    "KnowledgeDocument",
    "KnowledgeChunk",
    "KnowledgeRetrievalQuery",
    "KnowledgeRetrievalResult",
    "KnowledgeContextPayload",
    "DocumentVisibility",
    "DocumentStatus",
    "SufficiencyLevel",
    "UserDocument",
    "DocumentChunk",
    "EmbeddingProvider",
    "cosine_similarity",
    "DocumentIngestor",
    "KnowledgeRepository",
    "RetrievalSufficiencyEvaluator",
    "KnowledgeManager",
    "get_knowledge_manager",
]
