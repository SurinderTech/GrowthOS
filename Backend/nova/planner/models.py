"""
Backend/nova/planner/models.py

SQLAlchemy ORM models for NOVA Planning & Goal Decomposition Engine.
Provides persistent storage for Goals, Plans, Phases, Milestones, Tasks, and Dependencies.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from Backend.db.base import Base


class NovaGoalModel(Base):
    """User goal record."""

    __tablename__ = "nova_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="career", index=True)
    target_outcome = Column(Text, nullable=True)
    target_date = Column(String(50), nullable=True)
    priority = Column(String(20), default="high")
    status = Column(String(50), default="active", index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    plans = relationship("NovaPlanModel", back_populates="goal", cascade="all, delete-orphan")


class NovaPlanModel(Base):
    """Decomposed plan instance for a goal."""

    __tablename__ = "nova_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("nova_goals.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, default=1)
    status = Column(String(50), default="active", index=True)
    total_estimated_mins = Column(Integer, default=0)
    daily_time_budget_mins = Column(Integer, default=60)
    time_feasibility = Column(String(50), default="feasible")
    confidence = Column(Float, default=0.90)
    assumptions_json = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    goal = relationship("NovaGoalModel", back_populates="plans")
    phases = relationship("NovaPlanPhaseModel", back_populates="plan", cascade="all, delete-orphan")


class NovaPlanPhaseModel(Base):
    """Plan phase."""

    __tablename__ = "nova_plan_phases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("nova_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    phase_number = Column(Integer, default=1)
    title = Column(String(255), nullable=False)
    theme = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    plan = relationship("NovaPlanModel", back_populates="phases")
    milestones = relationship("NovaMilestoneModel", back_populates="phase", cascade="all, delete-orphan")


class NovaMilestoneModel(Base):
    """Plan milestone."""

    __tablename__ = "nova_milestones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phase_id = Column(UUID(as_uuid=True), ForeignKey("nova_plan_phases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    phase = relationship("NovaPlanPhaseModel", back_populates="milestones")
    tasks = relationship("NovaTaskModel", back_populates="milestone", cascade="all, delete-orphan")


class NovaTaskModel(Base):
    """Executable task item."""

    __tablename__ = "nova_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    milestone_id = Column(UUID(as_uuid=True), ForeignKey("nova_milestones.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(50), default="learn", index=True)
    priority = Column(String(20), default="medium")
    estimated_minutes = Column(Integer, default=30)
    difficulty = Column(String(50), default="intermediate")
    status = Column(String(50), default="pending", index=True)
    completion_criteria = Column(Text, nullable=True)
    resource_ids_json = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    milestone = relationship("NovaMilestoneModel", back_populates="tasks")


class NovaTaskDependencyModel(Base):
    """Explicit task prerequisite dependency link."""

    __tablename__ = "nova_task_dependencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("nova_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    depends_on_task_id = Column(UUID(as_uuid=True), ForeignKey("nova_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    dependency_type = Column(String(50), default="prerequisite")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
