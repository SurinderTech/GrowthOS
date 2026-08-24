"""
Backend/nova/adaptive/models.py

SQLAlchemy ORM models for NOVA Adaptive Planning & Replanning Engine.
Stores persistent adaptation decisions, plan revisions, plan diffs, and outcome evaluation tracking.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID

from Backend.db.base import Base


class NovaAdaptationDecisionModel(Base):
    """Adaptation decision database record."""

    __tablename__ = "nova_adaptation_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(String(100), nullable=True, index=True)
    decision = Column(String(50), nullable=False, index=True)
    level = Column(String(50), default="task", index=True)
    confidence = Column(Float, default=0.90)
    reason = Column(Text, nullable=False)
    evidence_json = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NovaPlanRevisionModel(Base):
    """Historical plan revision record tracking plan versioning."""

    __tablename__ = "nova_plan_revisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(String(100), nullable=False, index=True)
    parent_plan_id = Column(String(100), nullable=True)
    version = Column(Integer, default=1, index=True)
    trigger_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NovaPlanDiffModel(Base):
    """Structured plan difference record comparing Plan v1 and Plan v2."""

    __tablename__ = "nova_plan_diffs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(String(100), nullable=False, index=True)
    old_version = Column(Integer, default=1)
    new_version = Column(Integer, default=2)
    diffs_json = Column(JSON, default=list)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NovaAdaptationOutcomeModel(Base):
    """Adaptation outcome tracker for evaluating if an adaptation improved execution."""

    __tablename__ = "nova_adaptation_outcomes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    decision_id = Column(UUID(as_uuid=True), ForeignKey("nova_adaptation_decisions.id", ondelete="CASCADE"), nullable=False)
    completion_rate_before = Column(Float, default=0.0)
    completion_rate_after = Column(Float, default=0.0)
    outcome_status = Column(String(50), default="monitoring")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
