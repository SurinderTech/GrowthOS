"""
models/community.py
SQLAlchemy models for Community — batch-based social feed.
"""

import uuid
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text,
    ForeignKey, JSON, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from Backend.db.base import Base


class CommunityPost(Base):
    """
    A post/message in the community feed.
    Visible only to users in the same batch_key cohort.

    batch_key examples:
      "batch:jee:2026"          — JEE 2026 aspirants
      "batch:neet:2026"         — NEET 2026 aspirants
      "batch:upsc"              — All UPSC aspirants
      "batch:student:cs"        — CS students (all semesters)
      "batch:student:mbbs"      — MBBS students
      "batch:freelancer"        — All freelancers
      "batch:entrepreneur"      — Entrepreneurs / startup founders
      "batch:creator"           — Content creators
      "batch:general"           — Fallback for uncategorized
    """
    __tablename__ = "community_posts"

    id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id   = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    batch_key = Column(String(150), nullable=False, index=True)

    content   = Column(Text, nullable=False)
    post_type = Column(String(30), default="text")   # text | achievement | challenge | milestone

    # Denormalized author info for fast feed rendering
    author_name  = Column(String(200), nullable=True)
    author_badge = Column(String(100), nullable=True)  # e.g. "🔥 32 Day Streak"

    reaction_count = Column(Integer, default=0)
    reply_count    = Column(Integer, default=0)

    is_pinned  = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user      = relationship("User", foreign_keys=[user_id])
    reactions = relationship(
        "CommunityReaction",
        back_populates="post",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_cp_batch_created", "batch_key", "created_at"),
    )


class CommunityReaction(Base):
    """
    A like/reaction on a community post. One per user per post.
    """
    __tablename__ = "community_reactions"

    id      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    emoji   = Column(String(10), default="🔥")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post = relationship("CommunityPost", back_populates="reactions")
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_reaction_post_user"),
        Index("idx_reaction_post", "post_id"),
    )
