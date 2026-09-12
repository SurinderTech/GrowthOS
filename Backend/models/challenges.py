"""
models/challenges.py
SQLAlchemy models for Challenge engine.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text,
    ForeignKey, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from Backend.db.base import Base


class Challenge(Base):
    """
    A challenge definition. Created once, many users participate.
    Challenges are profile-matched — field_tag determines which users see them.
    """
    __tablename__ = "challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title       = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    hints       = Column(JSON, default=list)      # list of hint strings
    tags        = Column(JSON, default=list)       # ["Arrays", "Physics", "Biology"]

    # Classification — matches user field_key from leaderboard service
    # Examples: "exam:jee", "exam:neet", "student:cs", "freelancer", "entrepreneur", "creator", "all"
    field_tag   = Column(String(100), nullable=False, index=True)

    difficulty  = Column(String(20), nullable=False, default="Medium")  # Easy|Medium|Hard|Expert
    challenge_type = Column(String(20), nullable=False, default="daily")  # daily|weekly|monthly|special

    xp_reward   = Column(Integer, default=80, nullable=False)
    bonus_xp    = Column(Integer, default=20, nullable=False)
    time_minutes= Column(Integer, default=25, nullable=False)

    streak_impact = Column(Boolean, default=True)
    battle_mode   = Column(Boolean, default=False)
    community_mode= Column(Boolean, default=False)
    weekend_bonus = Column(Boolean, default=False)

    # Lifecycle
    starts_at   = Column(DateTime(timezone=True), nullable=False)
    ends_at     = Column(DateTime(timezone=True), nullable=False)
    is_active   = Column(Boolean, default=True)

    # AI-generated content
    ai_generated = Column(Boolean, default=False)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    participants = relationship(
        "ChallengeParticipant",
        back_populates="challenge",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_challenges_field_type_active", "field_tag", "challenge_type", "is_active"),
    )


class ChallengeParticipant(Base):
    """
    Tracks one user's participation/submission for one challenge.
    """
    __tablename__ = "challenge_participants"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(
        UUID(as_uuid=True),
        ForeignKey("challenges.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id      = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    joined_at    = Column(DateTime(timezone=True), server_default=func.now())
    completed    = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    score        = Column(Integer, default=0)        # XP earned from this challenge
    time_taken_s = Column(Integer, nullable=True)    # seconds taken to complete

    challenge = relationship("Challenge", back_populates="participants")
    user      = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_cp_challenge_user", "challenge_id", "user_id", unique=True),
        Index("idx_cp_user_completed", "user_id", "completed"),
    )
