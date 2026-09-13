"""
models/arena.py

GrowthOS Arena — DB models for:
  - arena_profiles      (ELO, level, XP, stats per user)
  - battles             (game instance with server-authoritative timer)
  - battle_players      (participants + scores)
  - battle_teams        (for 2v2/Squad)
  - battle_rounds       (for multi-round / Battle Royale)
  - battle_submissions  (all submitted answers)
  - elo_history         (every ELO change, auditable)
  - matchmaking_queue   (live matchmaking state)
  - ai_opponents        (Rookie / Engineer / Architect bots)
  - bosses              (Boss definitions)
  - boss_instances      (live season-level boss event)
  - boss_runs           (individual player run against a boss instance)
  - arena_seasons       (Season 01, Season 02, ...)
  - xp_transactions     (audit trail — never overwrite total)
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, BigInteger, Boolean, DateTime,
    Text, ForeignKey, JSON, Float, Index, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from Backend.db.base import Base


# ─────────────────────────────────────────────────────────────────────────────
# Arena Profile — one row per user, upserted on first arena access
# ─────────────────────────────────────────────────────────────────────────────

class ArenaProfile(Base):
    """
    Stores competitive stats for a user.
    ELO starts at 800. Level derived from arena_xp.
    """
    __tablename__ = "arena_profiles"

    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    arena_elo    = Column(Integer, default=800, nullable=False)
    arena_xp     = Column(BigInteger, default=0, nullable=False)
    level        = Column(Integer, default=1, nullable=False)

    wins         = Column(Integer, default=0, nullable=False)
    losses       = Column(Integer, default=0, nullable=False)
    draws        = Column(Integer, default=0, nullable=False)

    current_streak = Column(Integer, default=0, nullable=False)
    best_streak    = Column(Integer, default=0, nullable=False)

    # Skill sub-scores — updated after each battle, 0-100
    skill_problem_solving = Column(Integer, default=0, nullable=False)
    skill_coding          = Column(Integer, default=0, nullable=False)
    skill_debugging       = Column(Integer, default=0, nullable=False)
    skill_system_design   = Column(Integer, default=0, nullable=False)
    skill_ai_engineering  = Column(Integer, default=0, nullable=False)
    skill_speed           = Column(Integer, default=0, nullable=False)
    skill_accuracy        = Column(Integer, default=0, nullable=False)
    skill_collaboration   = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])


# ─────────────────────────────────────────────────────────────────────────────
# Battles — server-authoritative game instances
# ─────────────────────────────────────────────────────────────────────────────

BATTLE_STATUSES = ["waiting", "lobby", "countdown", "live", "evaluating", "completed", "cancelled"]
BATTLE_MODES    = ["1v1", "2v2", "squad", "battle_royale", "ai_duel", "boss_raid"]


class Battle(Base):
    """
    One row per game instance.
    starts_at / ends_at are the authoritative timer — frontend derives countdown from ends_at.
    """
    __tablename__ = "battles"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id", ondelete="SET NULL"), nullable=True)

    mode         = Column(String(30), nullable=False, default="1v1")   # battle mode
    challenge_format = Column(String(30), nullable=False, default="mcq") # mcq|coding|reasoning|mixed|boss
    status       = Column(String(20), nullable=False, default="waiting")
    title        = Column(String(300), nullable=True)   # display title, copied from challenge

    # Server-authoritative timer
    starts_at    = Column(DateTime(timezone=True), nullable=True)
    ends_at      = Column(DateTime(timezone=True), nullable=True)

    current_round = Column(Integer, default=1)
    total_rounds  = Column(Integer, default=1)
    server_seed   = Column(String(64), nullable=True)   # for fair RNG

    # config JSON — stores round definitions, challenge tasks, scoring rules
    config       = Column(JSON, default=dict)

    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    players     = relationship("BattlePlayer", back_populates="battle", cascade="all, delete-orphan")
    teams       = relationship("BattleTeam",   back_populates="battle", cascade="all, delete-orphan")
    rounds      = relationship("BattleRound",  back_populates="battle", cascade="all, delete-orphan")
    submissions = relationship("BattleSubmission", back_populates="battle", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_battles_status_mode", "status", "mode"),
        Index("idx_battles_ends_at",     "ends_at"),
    )


class BattlePlayer(Base):
    """One row per player per battle."""
    __tablename__ = "battle_players"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    battle_id  = Column(UUID(as_uuid=True), ForeignKey("battles.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id    = Column(UUID(as_uuid=True), ForeignKey("battle_teams.id", ondelete="SET NULL"), nullable=True)

    # ai_duel: store opponent config id; None for human players
    ai_opponent_id = Column(UUID(as_uuid=True), ForeignKey("ai_opponents.id", ondelete="SET NULL"), nullable=True)

    status     = Column(String(20), default="waiting")  # waiting|ready|live|eliminated|finished
    score      = Column(Integer, default=0)
    rank       = Column(Integer, nullable=True)

    joined_at    = Column(DateTime(timezone=True), server_default=func.now())
    ready_at     = Column(DateTime(timezone=True), nullable=True)
    finished_at  = Column(DateTime(timezone=True), nullable=True)
    is_ai        = Column(Boolean, default=False)

    battle = relationship("Battle", back_populates="players")
    user   = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_bp_battle_user", "battle_id", "user_id", unique=True),
    )


class BattleTeam(Base):
    """Teams for 2v2 / Squad modes."""
    __tablename__ = "battle_teams"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    battle_id   = Column(UUID(as_uuid=True), ForeignKey("battles.id", ondelete="CASCADE"), nullable=False)
    team_name   = Column(String(100), nullable=False)
    total_score = Column(Integer, default=0)
    rank        = Column(Integer, nullable=True)

    battle  = relationship("Battle", back_populates="teams")
    players = relationship("BattlePlayer", foreign_keys=[BattlePlayer.team_id],
                           primaryjoin="BattleTeam.id == BattlePlayer.team_id")


class BattleRound(Base):
    """One row per round — supports multi-round & Battle Royale."""
    __tablename__ = "battle_rounds"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    battle_id    = Column(UUID(as_uuid=True), ForeignKey("battles.id", ondelete="CASCADE"), nullable=False)
    round_number = Column(Integer, nullable=False)
    challenge_format = Column(String(30), nullable=False, default="mcq")
    status       = Column(String(20), default="pending")   # pending|live|completed
    starts_at    = Column(DateTime(timezone=True), nullable=True)
    ends_at      = Column(DateTime(timezone=True), nullable=True)
    config       = Column(JSON, default=dict)   # questions, tasks, rubric etc.

    battle = relationship("Battle", back_populates="rounds")

    __table_args__ = (
        Index("idx_br_battle_round", "battle_id", "round_number"),
    )


class BattleSubmission(Base):
    """
    Every answer a user submits during a battle.
    submitted_at is set by server — never trusted from client.
    """
    __tablename__ = "battle_submissions"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    battle_id   = Column(UUID(as_uuid=True), ForeignKey("battles.id", ondelete="CASCADE"), nullable=False)
    round_id    = Column(UUID(as_uuid=True), ForeignKey("battle_rounds.id", ondelete="SET NULL"), nullable=True)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    submission_type = Column(String(30), nullable=False)  # mcq|reasoning|code|file
    content         = Column(Text, nullable=True)         # raw submitted answer / code
    selected_option = Column(Integer, nullable=True)      # for MCQ: 0-3
    language        = Column(String(20), nullable=True)   # for code

    # Server-set timestamps (client cannot fake these)
    submitted_at       = Column(DateTime(timezone=True), server_default=func.now())
    evaluation_status  = Column(String(20), default="pending")  # pending|evaluated|failed
    score              = Column(Integer, nullable=True)
    is_correct         = Column(Boolean, nullable=True)
    evaluation_detail  = Column(JSON, default=dict)   # rubric_scores, explanation, etc.

    battle = relationship("Battle", back_populates="submissions")
    user   = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_bs_battle_user", "battle_id", "user_id"),
        Index("idx_bs_submitted_at", "submitted_at"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# ELO History — full audit trail
# ─────────────────────────────────────────────────────────────────────────────

class EloHistory(Base):
    __tablename__ = "elo_history"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    battle_id       = Column(UUID(as_uuid=True), ForeignKey("battles.id", ondelete="SET NULL"), nullable=True)
    rating_before   = Column(Integer, nullable=False)
    rating_after    = Column(Integer, nullable=False)
    rating_change   = Column(Integer, nullable=False)
    opponent_elo    = Column(Integer, nullable=True)
    result          = Column(String(10), nullable=False)  # win|loss|draw
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_elo_user_created", "user_id", "created_at"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# XP Transactions — audit trail, never overwrite totals
# ─────────────────────────────────────────────────────────────────────────────

class XpTransaction(Base):
    __tablename__ = "xp_transactions"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount     = Column(Integer, nullable=False)
    source     = Column(String(50), nullable=False)  # battle|boss|challenge|bonus
    battle_id  = Column(UUID(as_uuid=True), ForeignKey("battles.id", ondelete="SET NULL"), nullable=True)
    note       = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_xp_user_source", "user_id", "source"),
        # Idempotency: one XP award per battle per user
        Index("idx_xp_user_battle", "user_id", "battle_id"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Matchmaking Queue
# ─────────────────────────────────────────────────────────────────────────────

class MatchmakingQueue(Base):
    __tablename__ = "matchmaking_queue"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    mode             = Column(String(30), nullable=False, default="1v1")
    challenge_format = Column(String(30), nullable=True)
    elo              = Column(Integer, nullable=False, default=800)
    party_id         = Column(UUID(as_uuid=True), nullable=True)
    status           = Column(String(20), default="searching")  # searching|matched|cancelled
    battle_id        = Column(UUID(as_uuid=True), ForeignKey("battles.id", ondelete="SET NULL"), nullable=True)
    joined_at        = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_mm_mode_elo_status", "mode", "elo", "status"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# AI Opponents
# ─────────────────────────────────────────────────────────────────────────────

class AIOpponent(Base):
    __tablename__ = "ai_opponents"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name         = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(200), nullable=False)
    emoji        = Column(String(10), default="🤖")
    description  = Column(Text, nullable=True)
    elo          = Column(Integer, nullable=False, default=800)
    accuracy_min = Column(Float, default=0.65)   # 0-1
    accuracy_max = Column(Float, default=0.90)
    speed_level  = Column(Integer, default=2)    # 1=slow 3=fast
    mistake_rate = Column(Float, default=0.15)
    difficulty   = Column(Integer, default=3)    # 1-10
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────────────────────────────────
# Boss System
# ─────────────────────────────────────────────────────────────────────────────

class Boss(Base):
    """Reusable Boss definition."""
    __tablename__ = "bosses"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(200), nullable=False)
    emoji       = Column(String(10), default="🤖")
    description = Column(Text, nullable=True)
    total_hp    = Column(Integer, default=10000)
    difficulty  = Column(Integer, default=5)   # 1-10
    phases      = Column(JSON, default=list)   # [{phase_num, title, description, attack_type}]
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    instances = relationship("BossInstance", back_populates="boss")


class BossInstance(Base):
    """
    A live, season-level boss event.
    current_hp is the shared HP that all players chip away at.
    """
    __tablename__ = "boss_instances"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    boss_id     = Column(UUID(as_uuid=True), ForeignKey("bosses.id", ondelete="CASCADE"), nullable=False)
    season_id   = Column(UUID(as_uuid=True), ForeignKey("arena_seasons.id", ondelete="SET NULL"), nullable=True)
    total_hp    = Column(Integer, nullable=False)
    current_hp  = Column(Integer, nullable=False)
    status      = Column(String(20), default="active")  # active|defeated|expired
    starts_at   = Column(DateTime(timezone=True), nullable=False)
    ends_at     = Column(DateTime(timezone=True), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    boss   = relationship("Boss", back_populates="instances")
    runs   = relationship("BossRun", back_populates="boss_instance")
    season = relationship("ArenaSeason", back_populates="boss_instances", foreign_keys="BossInstance.season_id")

    __table_args__ = (
        Index("idx_bi_status_ends", "status", "ends_at"),
    )


class BossRun(Base):
    """One player's run against a boss instance."""
    __tablename__ = "boss_runs"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    boss_instance_id = Column(UUID(as_uuid=True), ForeignKey("boss_instances.id", ondelete="CASCADE"), nullable=False)
    user_id          = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id          = Column(UUID(as_uuid=True), nullable=True)
    damage_dealt     = Column(Integer, default=0)
    score            = Column(Integer, default=0)
    current_phase    = Column(Integer, default=1)
    status           = Column(String(20), default="active")  # active|completed|failed
    started_at       = Column(DateTime(timezone=True), server_default=func.now())
    ended_at         = Column(DateTime(timezone=True), nullable=True)

    boss_instance = relationship("BossInstance", back_populates="runs")
    user          = relationship("User", foreign_keys=[user_id])
    submissions   = relationship("BossSubmission", back_populates="run", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_boss_runs_user_inst", "user_id", "boss_instance_id"),
    )


class BossSubmission(Base):
    """Answer submitted during a boss run."""
    __tablename__ = "boss_submissions"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id          = Column(UUID(as_uuid=True), ForeignKey("boss_runs.id", ondelete="CASCADE"), nullable=False)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    phase           = Column(Integer, nullable=False, default=1)
    submission_type = Column(String(30), nullable=False, default="reasoning")
    content         = Column(Text, nullable=True)
    submitted_at    = Column(DateTime(timezone=True), server_default=func.now())
    damage_dealt    = Column(Integer, default=0)
    score           = Column(Integer, default=0)
    is_correct      = Column(Boolean, nullable=True)
    evaluation_detail = Column(JSON, default=dict)

    run  = relationship("BossRun", back_populates="submissions")
    user = relationship("User", foreign_keys=[user_id])


# ─────────────────────────────────────────────────────────────────────────────
# Arena Seasons
# ─────────────────────────────────────────────────────────────────────────────

class ArenaSeason(Base):
    __tablename__ = "arena_seasons"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(String(200), nullable=False)
    tagline    = Column(String(300), nullable=True)
    starts_at  = Column(DateTime(timezone=True), nullable=False)
    ends_at    = Column(DateTime(timezone=True), nullable=False)
    is_active  = Column(Boolean, default=True)
    config     = Column(JSON, default=dict)  # theme, bonuses, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    boss_instances = relationship(
        "BossInstance",
        back_populates="season",
        foreign_keys="[BossInstance.season_id]",
    )

    __table_args__ = (
        Index("idx_seasons_active", "is_active", "ends_at"),
    )
