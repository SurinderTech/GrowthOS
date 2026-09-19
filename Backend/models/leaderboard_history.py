"""
models/leaderboard_history.py

WeeklyLeaderboardSnapshot: stores the top performers at end of each week.
Used for:
  - Weekly Champion badges on user profiles
  - Historical leaderboard browsing
  - Rank movement calculation (previous_rank vs current_rank)
"""

import uuid
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from Backend.db.base import Base


class WeeklyLeaderboardSnapshot(Base):
    """
    Records the top performers for a given scope/period at end of each week.

    scope examples:
      'global'           — all users
      'field:exam:jee'   — JEE aspirants
      'batch:jee:2027'   — JEE 2027 batch

    week_start / week_end: ISO date strings (e.g. '2026-09-07' / '2026-09-13')

    Stores top 10 positions per scope per week.
    At 1M users with 1000 scopes and 52 weeks = 520,000 rows/year — trivial.
    """
    __tablename__ = "weekly_leaderboard_snapshots"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    scope       = Column(String(200), nullable=False, index=True)
    week_start  = Column(String(20), nullable=False)   # '2026-09-07'
    week_end    = Column(String(20), nullable=False)   # '2026-09-13'

    # Position in this scope for this week
    rank        = Column(Integer, nullable=False)

    user_id     = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Denormalized for display even if user is later deleted
    user_name   = Column(String(200), nullable=True)
    user_image  = Column(String(500), nullable=True)
    score       = Column(BigInteger, nullable=False, default=0)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    user        = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        # One entry per scope+week+rank
        UniqueConstraint("scope", "week_start", "rank", name="uq_weekly_snap_scope_week_rank"),
        Index("idx_wls_scope_week", "scope", "week_start"),
        Index("idx_wls_user", "user_id"),
    )
