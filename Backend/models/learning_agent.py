"""
Backend/models/learning_agent.py
SQLAlchemy ORM models for Learning Agent (Calibration, Plans, Missions, Topics, Resources, Notes, AI Tutor Chat).
"""

from sqlalchemy import Column, String, Integer, Boolean, JSON, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime

from Backend.db.base import Base


class UserLearningMemory(Base):
    __tablename__ = "user_learning_memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    learning_style = Column(String(50), nullable=True)       # videos | documentation | books | project_based | mixed
    stuck_strategy = Column(String(50), nullable=True)       # watch_explanation | read_docs | ask_ai | solve_myself
    learning_priority = Column(String(50), nullable=True)    # learn_fast | deep_understanding | interview_prep | build_projects
    revision_preference = Column(String(50), nullable=True)  # daily | weekly | ai_decide
    calibration_completed = Column(Boolean, default=False)
    target_topic = Column(String(200), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")


class UserLearningPlan(Base):
    __tablename__ = "user_learning_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(255), nullable=False)
    target_role = Column(String(255), nullable=True)
    current_week = Column(Integer, default=1)
    current_day = Column(Integer, default=1)
    total_weeks = Column(Integer, default=4)
    progress_percent = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    missions = relationship("LearningMission", back_populates="plan", cascade="all, delete-orphan")
    topics = relationship("LearningTopic", back_populates="plan", cascade="all, delete-orphan")


class LearningMission(Base):
    __tablename__ = "learning_missions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("user_learning_plans.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    week_number = Column(Integer, default=1)
    day_number = Column(Integer, default=1)
    week_title = Column(String(255), nullable=False)
    estimated_minutes = Column(Integer, default=45)
    completed = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    plan = relationship("UserLearningPlan", back_populates="missions")
    tasks = relationship("LearningMissionTask", back_populates="mission", cascade="all, delete-orphan")


class LearningMissionTask(Base):
    __tablename__ = "learning_mission_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("learning_missions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    topic_key = Column(String(100), nullable=True)
    text = Column(Text, nullable=False)
    completed = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    mission = relationship("LearningMission", back_populates="tasks")


class LearningTopic(Base):
    __tablename__ = "learning_topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("user_learning_plans.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    topic_key = Column(String(100), nullable=False)  # e.g., 't1', 't2'
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)

    code_snippet = Column(JSON, nullable=True)         # {"language": "typescript", "code": "..."}
    practice_questions = Column(JSON, default=list)    # [{"question": "...", "answer": "..."}]
    completed = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    plan = relationship("UserLearningPlan", back_populates="topics")


class LearningResource(Base):
    __tablename__ = "learning_resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("user_learning_plans.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    topic_key = Column(String(100), nullable=True)
    type = Column(String(50), nullable=False)  # video | doc | article | project
    title = Column(String(255), nullable=False)
    source = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False)
    duration_or_time = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class LearningNote(Base):
    __tablename__ = "learning_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_key = Column(String(100), nullable=False)

    note_text = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LearningTutorMessage(Base):
    __tablename__ = "learning_tutor_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    sender = Column(String(20), nullable=False)  # user | nova
    text = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
