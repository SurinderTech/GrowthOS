"""
models/practice.py
SQLAlchemy models for Practice Arena.
Same pattern as models/dashboard.py — uses your existing Base, UUID, etc.
"""

from sqlalchemy import Column, String, Integer, Boolean, JSON, DateTime, ForeignKey, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from Backend.db.base import Base
import uuid


class PracticeQuestion(Base):
    """
    Stores ALL generated questions permanently.
    Generated ONCE by Gemini, reused forever for same user_type + topic.
    Never call Gemini twice for the same user_type + topic + difficulty.
    """
    __tablename__ = "practice_questions"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who this question is for
    user_type     = Column(String(50), nullable=False)   # student | freelancer | exam_aspirant | etc.
    topic         = Column(String(200), nullable=False)  # "Python", "FastAPI", "Physics", "Polity", etc.
    subtopic      = Column(String(200), nullable=True)   # "Loops", "Newton's Laws", "Fundamental Rights"

    # Question content
    difficulty    = Column(String(20), nullable=False)   # easy | medium | hard
    q_type        = Column(String(20), nullable=False)   # mcq | short | numeric | coding | statement

    question_text = Column(Text, nullable=False)
    options       = Column(JSON, nullable=True)          # ["A. ...", "B. ...", "C. ...", "D. ..."] or null
    correct_answer= Column(String(500), nullable=True)   # "B" for MCQ, numeric value, or null for short
    explanation   = Column(Text, nullable=False)

    created_by    = Column(String(20), default="ai")     # "ai" | "admin"
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class UserPracticeSession(Base):
    """
    One row per practice session attempt.
    """
    __tablename__ = "user_practice_sessions"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    topic         = Column(String(200), nullable=True)
    correct_count = Column(Integer, default=0)
    total_count   = Column(Integer, default=0)
    accuracy_pct  = Column(Integer, default=0)
    session_date  = Column(Date, nullable=False)

    completed_at  = Column(DateTime(timezone=True), server_default=func.now())

    answers       = relationship("UserPracticeAnswer", back_populates="session", cascade="all, delete-orphan")
    user          = relationship("User", back_populates="practice_sessions")


class UserPracticeAnswer(Base):
    """
    Every individual answer a user submits.
    """
    __tablename__ = "user_practice_answers"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id    = Column(UUID(as_uuid=True), ForeignKey("user_practice_sessions.id", ondelete="CASCADE"))
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id   = Column(UUID(as_uuid=True), ForeignKey("practice_questions.id"), nullable=False)

    user_answer   = Column(Text, nullable=True)
    is_correct    = Column(Boolean, default=False)
    time_taken_s  = Column(Integer, default=0)
    answered_at   = Column(DateTime(timezone=True), server_default=func.now())

    session       = relationship("UserPracticeSession", back_populates="answers")


class UserStreak(Base):
    """
    One row per user. Updated every time they complete a session.
    """
    __tablename__ = "user_streaks"

    user_id            = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    current_streak     = Column(Integer, default=0)
    longest_streak     = Column(Integer, default=0)
    last_practice_date = Column(Date, nullable=True)
    practiced_today    = Column(Boolean, default=False)
    updated_at         = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="streak")


class UserSkillProgress(Base):
    """
    Tracks % progress per topic per user.
    Updated after each correct answer.
    """
    __tablename__ = "user_skill_progress"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic       = Column(String(200), nullable=False)
    progress_pct= Column(Integer, default=0)  # 0–100
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="skill_progress")