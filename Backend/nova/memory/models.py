"""
Backend/nova/memory/models.py

SQLAlchemy ORM model for UserMemories.
Persists durable user memory records in PostgreSQL/Supabase under table `user_memories`.
"""

import uuid
from sqlalchemy import Column, String, Float, JSON, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from Backend.db.base import Base


class UserMemory(Base):
    __tablename__ = "user_memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    memory_type = Column(String(30), default="semantic", nullable=False, index=True)
    content = Column(Text, nullable=False)
    source = Column(String(30), default="explicit_user", nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)
    importance = Column(Float, default=0.5, nullable=False)
    status = Column(String(20), default="active", nullable=False, index=True)

    metadata_json = Column(JSON, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship back to User
    user = relationship("User", backref="memories")
