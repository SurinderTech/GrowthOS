"""
Backend/nova/rag/__init__.py

NOVA RAG & Knowledge Engine Package.
Provides dedicated exports for document ingestion, pgvector search, sufficiency evaluation, and web fallback.
"""

from Backend.nova.rag.types import (
    KnowledgeDocument,
    KnowledgeChunk,
    KnowledgeRetrievalQuery,
    KnowledgeRetrievalResult,
    KnowledgeContextPayload,
    DocumentVisibility,
    DocumentStatus,
    SufficiencyLevel,
)
from Backend.nova.rag.models import UserDocument, DocumentChunk
from Backend.nova.rag.embeddings import EmbeddingProvider, cosine_similarity
from Backend.nova.rag.ingestor import DocumentIngestor
from Backend.nova.rag.repository import KnowledgeRepository
from Backend.nova.rag.evaluator import RetrievalSufficiencyEvaluator
from Backend.nova.rag.manager import KnowledgeManager, get_knowledge_manager

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
