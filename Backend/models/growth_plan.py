"""
models/growth_plan.py
SQLAlchemy ORM models for the Growth Plan system.
Separate from dashboard.py's GrowthPlan — this is the full execution roadmap model.
"""

from sqlalchemy import (
    Column, String, Integer, Boolean, JSON,
    DateTime, ForeignKey, Text, Float, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from Backend.db.base import Base
import uuid
import enum


class PhaseStatus(str, enum.Enum):
    locked    = "locked"
    active    = "active"
    completed = "completed"


class TaskDifficulty(str, enum.Enum):
    easy   = "easy"
    medium = "medium"
    hard   = "hard"


class TaskType(str, enum.Enum):
    challenge = "challenge"
    revision  = "revision"
    build     = "build"
    mcq       = "mcq"
    reading   = "reading"


# ── UserGrowthPlan ────────────────────────────────────────────────────────────
# Top-level plan — one active plan per user at a time
class UserGrowthPlan(Base):
    __tablename__ = "user_growth_plans"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Goal info — pulled from onboarding
    goal        = Column(String(200), nullable=False)        # e.g. "Crack JEE 2026"
    goal_icon   = Column(String(10),  nullable=True)         # emoji
    category    = Column(String(100), nullable=True)         # "Competitive Exam" | "Career" etc.
    timeline    = Column(String(50),  nullable=True)         # "6 months"
    start_date  = Column(String(20),  nullable=True)         # "Jan 2026"
    target_date = Column(String(20),  nullable=True)         # "Jun 2026"

    # Progress
    overall_progress = Column(Integer, default=0)            # 0-100
    current_phase_id = Column(Integer, default=1)            # 1-4
    total_xp         = Column(Integer, default=0)
    streak           = Column(Integer, default=0)
    rank             = Column(Integer, nullable=True)

    # Weekly activity — JSON array of {day, done, total}
    weekly_graph = Column(JSON, default=list)

    # Smart AI message
    smart_message_type = Column(String(20), default="info")   # info | warning | success
    smart_message_text = Column(Text, nullable=True)

    is_active    = Column(Boolean, default=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user   = relationship("User", back_populates="user_growth_plans")
    phases = relationship("GrowthPhase", back_populates="plan",
                          cascade="all, delete-orphan",
                          order_by="GrowthPhase.phase_number")


# ── GrowthPhase ───────────────────────────────────────────────────────────────
# Each plan has 4 phases: Foundation → Intermediate → Advanced → Mastery
class GrowthPhase(Base):
    __tablename__ = "growth_phases"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id      = Column(UUID(as_uuid=True), ForeignKey("user_growth_plans.id", ondelete="CASCADE"), nullable=False)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    phase_number = Column(Integer, nullable=False)           # 1, 2, 3, 4
    label        = Column(String(50), nullable=False)        # "Phase 1"
    theme        = Column(String(100), nullable=False)       # "Foundation"
    status       = Column(String(20), default="locked")      # locked | active | completed
    progress     = Column(Integer, default=0)                # 0-100

    xp_total     = Column(Integer, default=0)
    xp_earned    = Column(Integer, default=0)

    # Milestone
    milestone         = Column(String(200), nullable=True)
    milestone_reward  = Column(String(300), nullable=True)

    # Skills for this phase — JSON array of {name, level, progress}
    skills = Column(JSON, default=list)

    # Relationships
    plan  = relationship("UserGrowthPlan", back_populates="phases")
    tasks = relationship("GrowthTask", back_populates="phase",
                         cascade="all, delete-orphan",
                         order_by="GrowthTask.created_at")


# ── GrowthTask ────────────────────────────────────────────────────────────────
# Individual actionable tasks inside each phase
class GrowthTask(Base):
    __tablename__ = "growth_tasks"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phase_id   = Column(UUID(as_uuid=True), ForeignKey("growth_phases.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title      = Column(String(300), nullable=False)
    xp         = Column(Integer, default=50)
    difficulty = Column(String(20), default="medium")        # easy | medium | hard
    task_type  = Column(String(30), default="challenge")     # challenge | revision | build | mcq | reading
    completed  = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    phase = relationship("GrowthPhase", back_populates="tasks")