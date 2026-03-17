"""
models/dashboard.py
SQLAlchemy models for growth plan, tasks, and insights.
"""

from sqlalchemy import Column, String, Integer, Boolean, JSON, DateTime, ForeignKey, Text, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.base import Base


import uuid


class GrowthPlan(Base):
    __tablename__ = "growth_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(200), nullable=False)
    summary = Column(Text, nullable=True)
    months = Column(JSON, default=list)       # Full 3-month milestone JSON
    is_active = Column(Boolean, default=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="growth_plans")
    tasks = relationship("DailyTask", back_populates="plan", cascade="all, delete-orphan")


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("growth_plans.id", ondelete="CASCADE"), nullable=True)

    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    priority = Column(String(20), default="medium")   # high | medium | low
    estimated_minutes = Column(Integer, default=30)
    category = Column(String(50), nullable=True)
    task_date = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="tasks")
    plan = relationship("GrowthPlan", back_populates="tasks")


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    insight = Column(Text, nullable=False)
    insight_type = Column(String(50), default="growth")   # growth | daily | warning | milestone
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="insights")