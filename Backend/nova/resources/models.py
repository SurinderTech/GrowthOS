"""
Backend/nova/resources/models.py

SQLAlchemy ORM models for NOVA Resource Intelligence & History Tracking.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from Backend.db.base import Base


class ResourceModel(Base):
    """Canonical persistent model for a learning/action resource."""

    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(Text, nullable=False, index=True)
    canonical_url = Column(Text, nullable=True, index=True)
    resource_type = Column(String(50), default="other", index=True)
    provider_platform = Column(String(100), default="web", index=True)
    author = Column(String(150), nullable=True)
    source_domain = Column(String(100), nullable=True, index=True)
    subject = Column(String(100), nullable=True, index=True)
    topic = Column(String(100), nullable=True, index=True)
    difficulty = Column(String(50), default="intermediate", index=True)
    estimated_duration_mins = Column(Integer, nullable=True)
    published_year = Column(Integer, nullable=True)
    quality_rating = Column(Float, default=1.0)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user_associations = relationship("UserResourceModel", back_populates="resource", cascade="all, delete-orphan")
    interactions = relationship("ResourceInteractionModel", back_populates="resource", cascade="all, delete-orphan")


class UserResourceModel(Base):
    """User-saved or user-supplied resource relationship."""

    __tablename__ = "user_resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    is_user_provided = Column(Boolean, default=False)
    status = Column(String(50), default="saved", index=True)  # "saved" | "in_progress" | "completed" | "archived"
    user_rating = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    resource = relationship("ResourceModel", back_populates="user_associations")


class ResourceInteractionModel(Base):
    """User interaction history tracking for behavioral scoring."""

    __tablename__ = "resource_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    interaction_type = Column(String(50), nullable=False, index=True)  # "opened" | "completed" | "skipped" | "helpful" | "unhelpful"
    time_spent_mins = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    resource = relationship("ResourceModel", back_populates="interactions")
