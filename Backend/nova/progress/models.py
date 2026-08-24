"""
Backend/nova/progress/models.py

SQLAlchemy ORM models for NOVA Execution & Progress Intelligence Engine.
Stores persistent execution events, progress snapshots, intelligence signals, and adaptation signals.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID

from Backend.db.base import Base


class NovaExecutionEventModel(Base):
    """Raw execution event database record."""

    __tablename__ = "nova_execution_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(String(100), nullable=False, index=True)
    plan_id = Column(String(100), nullable=True, index=True)
    goal_id = Column(String(100), nullable=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    duration_seconds = Column(Integer, default=0)
    completion_percentage = Column(Float, default=100.0)
    difficulty_rating = Column(String(50), nullable=True)
    user_feedback = Column(Text, nullable=True)
    idempotency_key = Column(String(100), nullable=True, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NovaProgressSnapshotModel(Base):
    """Hierarchical progress snapshot database record."""

    __tablename__ = "nova_progress_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(String(100), nullable=True, index=True)
    goal_progress_pct = Column(Float, default=0.0)
    plan_progress_pct = Column(Float, default=0.0)
    actual_vs_estimated_ratio = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NovaProgressSignalModel(Base):
    """Detected progress signal database record."""

    __tablename__ = "nova_progress_signals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    signal_type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    confidence = Column(Float, default=0.90)
    evidence_json = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NovaAdaptationSignalModel(Base):
    """Adaptation signal database record emitted to Step 9 Planner."""

    __tablename__ = "nova_adaptation_signals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    adaptation_type = Column(String(50), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    confidence = Column(Float, default=0.85)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
