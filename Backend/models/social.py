"""
models/social.py

GrowthOS Social Layer:
  - UserFriendship: Game-style friend requests (pending → accepted)
  - UserPresence:   Heartbeat-based online/in_battle/offline status

Design notes for million-user scale:
  - Friendship lookup indexed on BOTH (requester, addressee) and (addressee, requester)
    so "get my friends" is a single indexed scan, not a full table scan.
  - Presence uses a single row per user (upsert on heartbeat).
  - "In Battle" is derived from the battles/battle_players tables — not stored here.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, ForeignKey,
    UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from Backend.db.base import Base


# ─────────────────────────────────────────────────────────────────────────────
# UserFriendship
# ─────────────────────────────────────────────────────────────────────────────

class UserFriendship(Base):
    """
    Game-style friend requests between two users.

    Status lifecycle:
      pending   → addressee has not responded
      accepted  → both are friends
      rejected  → addressee declined (requester can re-send after 7 days)
      blocked   → addressee blocked requester

    Friendship is BIDIRECTIONAL: once accepted, both users see each other.
    To check "are A and B friends?":
      WHERE (requester_id=A AND addressee_id=B AND status='accepted')
         OR (requester_id=B AND addressee_id=A AND status='accepted')
    (Covered by the two composite indexes below.)

    Scale note: with 1M users having avg 50 friends each = 50M rows.
    Indexed properly this handles that fine with PostgreSQL.
    """
    __tablename__ = "user_friendships"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_id  = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    addressee_id  = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status        = Column(String(20), nullable=False, default="pending")
    # pending | accepted | rejected | blocked

    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    requester     = relationship("User", foreign_keys=[requester_id])
    addressee     = relationship("User", foreign_keys=[addressee_id])

    __table_args__ = (
        # Prevent duplicate friend requests in the same direction
        UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_pair"),
        # Fast lookup: "all requests I sent"
        Index("idx_friendship_requester_status", "requester_id", "status"),
        # Fast lookup: "all requests I received"
        Index("idx_friendship_addressee_status", "addressee_id", "status"),
        # Valid status values
        CheckConstraint(
            "status IN ('pending','accepted','rejected','blocked')",
            name="ck_friendship_status",
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# UserPresence
# ─────────────────────────────────────────────────────────────────────────────

class UserPresence(Base):
    """
    Tracks the last-known presence of each user.

    Updated by a heartbeat from the frontend every 30 seconds.
    Status is derived as:
      - "online"    if last_seen_at < 90 seconds ago AND not in battle
      - "in_battle" if user has an active battle (checked via battle_players)
      - "offline"   otherwise

    One row per user (PK = user_id). Upserted on each heartbeat.

    Scale note: 1M rows = trivial for PostgreSQL with index on last_seen_at.
    """
    __tablename__ = "user_presence"

    user_id       = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    # "online" | "in_battle" | "offline" — cached, derived on heartbeat
    status        = Column(String(20), nullable=False, default="offline")
    last_seen_at  = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,   # allows efficient "who was online in last N minutes"
    )
    # If in_battle, store the battle_id for linking to arena
    current_battle_id = Column(UUID(as_uuid=True), nullable=True)

    user          = relationship("User", foreign_keys=[user_id])
