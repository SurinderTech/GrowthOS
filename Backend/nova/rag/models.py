"""
Backend/nova/rag/models.py

SQLAlchemy ORM models for Knowledge Base documents and chunks (tables: user_documents, document_chunks).
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator
from pgvector.sqlalchemy import Vector

from Backend.db.base import Base


class VectorType(TypeDecorator):
    """
    SQLAlchemy TypeDecorator for pgvector Vector(384).
    Uses pgvector.sqlalchemy.Vector(384) on PostgreSQL, and converts list[float] to string on SQLite.
    """
    impl = Vector(384)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(Vector(384))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name != "postgresql" and isinstance(value, (list, tuple)):
            return json.dumps(list(value))
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return []
        return value


class UserDocument(Base):
    """SQLAlchemy ORM model for user-uploaded or GrowthOS-provided documents."""

    __tablename__ = "user_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    source = Column(String(100), default="user_upload", index=True)
    source_type = Column(String(50), default="note", index=True)
    visibility = Column(String(50), default="private_user", index=True)
    status = Column(String(50), default="ready", index=True)
    hash_fingerprint = Column(String(64), nullable=True, index=True)
    subject = Column(String(100), nullable=True, index=True)
    topic = Column(String(100), nullable=True)
    doc_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """SQLAlchemy ORM model for granular text chunks and vector embeddings."""

    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("user_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, default=0)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(VectorType(), nullable=True)  # Native 384-dim pgvector column (with SQLite test fallback)
    embedding_json = Column(Text, nullable=True)  # Legacy fallback JSON text string
    page_number = Column(Integer, nullable=True)
    section_title = Column(String(255), nullable=True)
    chunk_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    document = relationship("UserDocument", back_populates="chunks")

    def set_embedding(self, vector: list[float]) -> None:
        """Sets native vector embedding list and legacy embedding_json string."""
        self.embedding = vector
        self.embedding_json = json.dumps(vector)

    def get_embedding(self) -> list[float]:
        """Returns float vector embedding list from pgvector column or fallback json text."""
        if self.embedding is not None:
            if isinstance(self.embedding, (list, tuple)):
                return list(self.embedding)
            elif isinstance(self.embedding, str):
                try:
                    return [float(x) for x in self.embedding.strip("[]").split(",") if x.strip()]
                except Exception:
                    pass
        if self.embedding_json:
            try:
                return json.loads(self.embedding_json)
            except Exception:
                pass
        return []
