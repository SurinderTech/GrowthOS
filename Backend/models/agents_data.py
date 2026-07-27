"""
models/agents_data.py

SQLAlchemy models backing the four new agent workspaces added to the
GrowthOS Command Center dashboard: Resume Agent, Interview Agent,
Project Agent, and Networking Agent.

These follow the same conventions as models/dashboard.py (UUID primary
keys, CASCADE delete on the owning user, JSON columns for flexible
AI-generated content).
"""

from sqlalchemy import Column, String, Integer, Boolean, JSON, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from Backend.db.base import Base

import uuid


# ── Resume Agent ──────────────────────────────────────────────────────────────

class ResumeAnalysis(Base):
    """One AI analysis pass over a resume the user pasted in."""
    __tablename__ = "resume_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    resume_text = Column(Text, nullable=False)
    ats_score = Column(Integer, default=0)          # 0-100
    strengths = Column(JSON, default=list)          # list[str]
    improvements = Column(JSON, default=list)       # list[str]
    summary = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Interview Agent ───────────────────────────────────────────────────────────

class InterviewSession(Base):
    """A mock-interview session: a target role, a generated question set,
    the user's answers, and per-answer + overall AI feedback."""
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    role = Column(String(200), nullable=False)
    questions = Column(JSON, default=list)          # list[str]
    answers = Column(JSON, default=dict)            # {"0": {"answer": str, "feedback": str, "score": int}, ...}
    status = Column(String(20), default="in_progress")  # in_progress | completed
    overall_score = Column(Integer, nullable=True)
    overall_feedback = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


# ── Project Agent ─────────────────────────────────────────────────────────────

class Project(Base):
    """A project the user is building — tracked from idea to shipped."""
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="idea")     # idea | in_progress | completed
    github_url = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ── Networking Agent ───────────────────────────────────────────────────────────

class Contact(Base):
    """A person in the user's networking pipeline (recruiter, mentor, peer)."""
    __tablename__ = "contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(200), nullable=False)
    role = Column(String(200), nullable=True)
    company = Column(String(200), nullable=True)
    platform = Column(String(50), default="LinkedIn")
    status = Column(String(20), default="to_reach")  # to_reach | contacted | replied | connected
    notes = Column(Text, nullable=True)
    last_message = Column(Text, nullable=True)       # last AI-drafted outreach message

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
