"""
models/leaderboard.py
SQLAlchemy models for XP tracking and real-time leaderboard events.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from Backend.db.base import Base


class UserXP(Base):
    """
    Stores cumulative XP per user.
    Updated whenever user earns XP from any source:
      - practice session correct answers
      - streak milestones
      - task completions
      - challenge completions
    """
    __tablename__ = "user_xp"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Total accumulated XP (used for leaderboard ranking)
    total_xp = Column(BigInteger, default=0, nullable=False)

    # XP earned in specific windows (recalculated periodically)
    daily_xp   = Column(Integer, default=0, nullable=False)
    weekly_xp  = Column(Integer, default=0, nullable=False)
    monthly_xp = Column(Integer, default=0, nullable=False)

    # Convenience counters (updated alongside XP)
    challenges_completed = Column(Integer, default=0, nullable=False)
    tasks_completed      = Column(Integer, default=0, nullable=False)
    practice_sessions    = Column(Integer, default=0, nullable=False)
    total_correct        = Column(Integer, default=0, nullable=False)

    last_xp_earned_at = Column(DateTime(timezone=True), nullable=True)
    updated_at        = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", foreign_keys=[user_id])


class LeaderboardEvent(Base):
    """
    Real-time activity feed events pushed via SSE.
    Examples:
      - "Priya earned +50 XP from practice"
      - "Rahul completed 'Two Sum' challenge"
      - "Aman hit a 30-day streak!"
    """
    __tablename__ = "leaderboard_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who triggered the event
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_name  = Column(String(200), nullable=True)   # denormalized for fast SSE delivery

    # Field key so we only push events to users in the same field
    # e.g. "exam:jee", "student:cs", "freelancer", "entrepreneur", "creator"
    field_key  = Column(String(100), nullable=False, index=True)

    event_type = Column(String(50), nullable=False)   # "xp_earned" | "challenge_done" | "streak" | "rank_up"
    message    = Column(String(500), nullable=False)   # Human-readable notification text
    xp_delta   = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_lb_events_field_created", "field_key", "created_at"),
    )
