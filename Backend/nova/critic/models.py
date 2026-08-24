"""
Backend/nova/critic/models.py

SQLAlchemy ORM models for NOVA Critic Telemetry & Execution Tracing.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID

from Backend.db.base import Base


class CriticTelemetryModel(Base):
    """Telemetry and execution trace model for Critic decisions."""

    __tablename__ = "critic_telemetry"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(String(100), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    attempt_count = Column(Integer, default=1)
    route = Column(String(50), default="direct_answer", index=True)
    critic_action = Column(String(50), default="pass", index=True)
    overall_score = Column(Float, default=1.0)
    confidence = Column(Float, default=1.0)
    issues_json = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
