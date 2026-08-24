"""
Backend/nova/rag/types.py

Strongly typed Pydantic data models for NOVA RAG & Vector Retrieval Layer.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DocumentVisibility(str, Enum):
    PRIVATE_USER = "private_user"
    GROWTHOS_PUBLIC = "growthos_public"
    APPROVED_SHARED = "approved_shared"


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
    ARCHIVED = "archived"


class SufficiencyLevel(str, Enum):
    SUFFICIENT = "sufficient"
    INSUFFICIENT = "insufficient"
    HYBRID = "hybrid"


class KnowledgeDocument(BaseModel):
    """Metadata model representing an ingested knowledge document or note."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    title: str
    source: str = "user_upload"
    source_type: str = "note"  # "note" | "pdf" | "guide" | "course"
    content_type: str = "text/plain"
    visibility: DocumentVisibility = DocumentVisibility.PRIVATE_USER
    status: DocumentStatus = DocumentStatus.READY
    hash_fingerprint: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    doc_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class KnowledgeChunk(BaseModel):
    """Granular text chunk with vector embedding and source tracking."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    chunk_text: str
    chunk_index: int = 0
    embedding: List[float] = Field(default_factory=list)
    embedding_model: str = "nova-bge-small-384"
    embedding_dimension: int = 384
    embedding_version: str = "v1"
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    chunk_metadata: Dict[str, Any] = Field(default_factory=dict)


class KnowledgeRetrievalQuery(BaseModel):
    """Parameters for vector semantic search."""
    query_text: str
    user_id: Optional[str] = None
    top_k: int = 5
    min_score: float = 0.40
    subject_filter: Optional[str] = None
    topic_filter: Optional[str] = None
    document_id_filter: Optional[str] = None
    embedding_model: str = "nova-bge-small-384"
    embedding_dimension: int = 384
    embedding_version: str = "v1"


class KnowledgeRetrievalResult(BaseModel):
    """Scored candidate chunk returned by RAG search."""
    chunk_id: str
    document_id: str
    title: str
    source: str
    chunk_text: str
    score: float
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    visibility: DocumentVisibility = DocumentVisibility.PRIVATE_USER


class KnowledgeContextPayload(BaseModel):
    """Complete RAG payload injected into NovaState."""
    query_text: str
    results: List[KnowledgeRetrievalResult] = Field(default_factory=list)
    sufficiency: SufficiencyLevel = SufficiencyLevel.INSUFFICIENT
    web_fallback_used: bool = False
    summary: Optional[str] = None
    execution_time_ms: float = 0.0
