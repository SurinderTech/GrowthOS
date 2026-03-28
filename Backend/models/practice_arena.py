"""
models/practice_arena.py
Additional models for Practice Arena — coding submissions, exam sessions, activity log.
"""

from sqlalchemy import Column, String, Integer, Boolean, JSON, DateTime, ForeignKey, Text, Date, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from Backend.db.base import Base
import uuid


class CodingProblem(Base):
    """
    Stores coding problems. Generated once by Gemini, reused forever.
    """
    __tablename__ = "coding_problems"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title       = Column(String(200), nullable=False)
    difficulty  = Column(String(20), nullable=False)   # easy | medium | hard
    skill       = Column(String(100), nullable=True)   # Arrays | Stack | Trees etc.
    description = Column(Text, nullable=False)
    constraints = Column(JSON, default=list)           # ["2 ≤ n ≤ 10⁴", ...]
    examples    = Column(JSON, default=list)           # [{input, output, explain}]
    starter_python     = Column(Text, nullable=True)
    starter_cpp        = Column(Text, nullable=True)
    starter_javascript = Column(Text, nullable=True)
    created_by  = Column(String(20), default="ai")
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    submissions = relationship("CodingSubmission", back_populates="problem")


class CodingSubmission(Base):
    """
    Every code submission a user makes.
    """
    __tablename__ = "coding_submissions"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    problem_id  = Column(UUID(as_uuid=True), ForeignKey("coding_problems.id"), nullable=False)
    language    = Column(String(20), nullable=False)   # python | cpp | javascript
    code        = Column(Text, nullable=False)
    result      = Column(String(20), nullable=False)   # accepted | wrong_answer | error
    runtime_ms  = Column(Integer, nullable=True)
    submitted_at= Column(DateTime(timezone=True), server_default=func.now())

    problem = relationship("CodingProblem", back_populates="submissions")
    user    = relationship("User")


class ExamSession(Base):
    """
    One row per JEE/NEET exam attempt.
    """
    __tablename__ = "exam_sessions"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exam_type     = Column(String(50), default="jee")    # jee | neet | custom
    answers       = Column(JSON, default=dict)            # {question_id: selected_option_index}
    score         = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    wrong_count   = Column(Integer, default=0)
    unattempted   = Column(Integer, default=0)
    time_taken_s  = Column(Integer, default=0)
    completed     = Column(Boolean, default=False)
    session_date  = Column(Date, nullable=False)
    completed_at  = Column(DateTime(timezone=True), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class PracticeActivityLog(Base):
    """
    One row per day per user — tracks daily submission count for the activity graph.
    """
    __tablename__ = "practice_activity_log"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    log_date        = Column(Date, nullable=False)
    submission_count= Column(Integer, default=0)
    xp_earned       = Column(Integer, default=0)

    user = relationship("User")


class RecentSubmission(Base):
    """
    Unified log of all submissions (MCQ, Coding, Numeric, Exam) for the recent feed.
    """
    __tablename__ = "recent_submissions"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(200), nullable=False)   # "Two Sum", "FastAPI MCQ #3"
    result      = Column(String(50), nullable=False)    # "Accepted" | "Wrong Answer"
    lang        = Column(String(30), nullable=False)    # "Python" | "MCQ" | "Numeric"
    is_correct  = Column(Boolean, default=False)
    submitted_at= Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")