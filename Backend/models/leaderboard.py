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

    SCALE DESIGN (supports 1M+ users):
    ------------------------------------
    cached_score   — pre-computed Growth Score, updated atomically on every
                     award_xp() call. The leaderboard query is:
                       SELECT ... ORDER BY cached_score DESC
                     with a covering index. No Python-side re-computation on read.

    field_key      — denormalized classification (e.g. 'exam:jee').
                     Written once when onboarding completes, re-written if user
                     changes their profile. Enables WHERE field_key = ? leaderboard
                     query without joining user_onboarding.

    batch_key      — denormalized cohort key (e.g. 'batch:jee:2027').
                     Same pattern as field_key.

    previous_weekly_rank — snapshot taken at week boundary for rank movement.
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

    # ── SCALE COLUMNS ─────────────────────────────────────────────────────────

    # Pre-computed canonical Growth Score — the single source of truth for ranking.
    # Formula: (streak × 20) + (correct × 5) + (challenges × 30) + bonus_xp
    # Updated in-place on every award_xp() call. O(1) write, O(1) index scan on read.
    cached_score = Column(BigInteger, default=0, nullable=False, index=True)

    # Denormalized user classification for direct SQL leaderboard filtering.
    # e.g. 'exam:jee', 'student:cs', 'freelancer:web', 'creator', 'general'
    # NULL until onboarding is completed.
    field_key = Column(String(100), nullable=True, index=True)

    # Denormalized batch cohort key.
    # e.g. 'batch:jee:2027', 'batch:student:cs', 'batch:freelancer'
    batch_key = Column(String(150), nullable=True, index=True)

    # Rank at the start of the current week — for showing ↑↓4 / ↓3 movement.
    # Updated by weekly scheduler or on-demand when rank is first requested.
    previous_weekly_rank = Column(Integer, nullable=True)

    # ── END SCALE COLUMNS ───────────────────────────────────────────────────

    last_xp_earned_at = Column(DateTime(timezone=True), nullable=True)
    updated_at        = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        # Composite index: field leaderboard sorted by score (covers ORDER BY)
        Index("idx_uxp_field_score", "field_key", "cached_score"),
        # Composite index: batch leaderboard sorted by score
        Index("idx_uxp_batch_score", "batch_key", "cached_score"),
        # Global leaderboard (just score DESC)
        Index("idx_uxp_global_score", "cached_score"),
    )


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
