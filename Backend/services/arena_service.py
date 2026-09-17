"""
services/arena_service.py

All Arena business logic. The backend is authoritative for:
  - battle state
  - timers (starts_at / ends_at)
  - ELO
  - XP
  - scores
  - matchmaking

Frontend only renders what this service returns.
"""

from __future__ import annotations

import uuid
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session

from Backend.models.user import User
from Backend.models.onboarding import UserOnboarding
from Backend.models.leaderboard import UserXP, LeaderboardEvent
from Backend.models.challenges import Challenge, ChallengeParticipant
from Backend.models.arena import (
    ArenaProfile, Battle, BattlePlayer, BattleTeam, BattleRound,
    BattleTask, BattleSubmission, EloHistory, XpTransaction, MatchmakingQueue,
    AIOpponent, Boss, BossInstance, BossRun, BossSubmission, ArenaSeason
)
from Backend.services.leaderboard_service import get_user_field

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Question Bank — MCQ questions for AI Duels and seeded battles
# _correct is stored under config["_correct"] and NEVER sent to the client.
# ─────────────────────────────────────────────────────────────────────────────

_QUESTION_BANK = [
    {
        "question": "What does RAG stand for in modern AI systems?",
        "options": ["Random Access Generation", "Retrieval-Augmented Generation", "Recurrent Attention Gating", "Recursive Agent Graph"],
        "_correct": 1,
        "topic": "ai",
    },
    {
        "question": "Which data structure gives O(1) average-case lookup time?",
        "options": ["Binary Tree", "Linked List", "Hash Table", "Stack"],
        "_correct": 2,
        "topic": "cs",
    },
    {
        "question": "In the Transformer architecture, what does 'attention' compute?",
        "options": ["Gradient norms", "Weighted sum of value vectors", "Dropout masks", "Positional encodings"],
        "_correct": 1,
        "topic": "ai",
    },
    {
        "question": "Which sorting algorithm has the best worst-case time complexity?",
        "options": ["QuickSort", "BubbleSort", "MergeSort", "SelectionSort"],
        "_correct": 2,
        "topic": "cs",
    },
    {
        "question": "What is the primary purpose of a vector database in an AI system?",
        "options": ["Store SQL schemas", "Cache HTTP responses", "Retrieve semantically similar embeddings", "Run Python scripts"],
        "_correct": 2,
        "topic": "ai",
    },
    {
        "question": "Which HTTP status code means 'resource not found'?",
        "options": ["200", "401", "404", "500"],
        "_correct": 2,
        "topic": "web",
    },
    {
        "question": "In Python, what does the `yield` keyword create?",
        "options": ["A class instance", "An async coroutine", "A generator function", "A decorator"],
        "_correct": 2,
        "topic": "python",
    },
    {
        "question": "What does 'idempotent' mean in the context of HTTP methods?",
        "options": ["The request is encrypted", "Multiple identical requests have the same effect as one", "The request requires authentication", "The response is cached"],
        "_correct": 1,
        "topic": "web",
    },
    {
        "question": "Which of these is NOT a SOLID principle?",
        "options": ["Single Responsibility", "Open/Closed", "DRY (Don't Repeat Yourself)", "Liskov Substitution"],
        "_correct": 2,
        "topic": "cs",
    },
    {
        "question": "In a neural network, what is 'backpropagation' used for?",
        "options": ["Forward inference", "Data augmentation", "Computing gradients to update weights", "Tokenizing input text"],
        "_correct": 2,
        "topic": "ai",
    },
]


def sanitize_task_for_client(task: BattleTask) -> dict:
    """
    Strip the server-only '_correct' field before sending task to browser.
    NEVER expose the correct answer to the client.
    """
    cfg = dict(task.config or {})
    cfg.pop("_correct", None)  # remove server-only field
    return {
        "id":        str(task.id),
        "type":      task.task_type,
        "order":     task.order,
        "max_score": task.max_score,
        "question":  cfg.get("question"),
        "options":   cfg.get("options", []),
        "topic":     cfg.get("topic"),
        "ends_at":   task.ends_at.isoformat() if task.ends_at else None,
    }


def _generate_battle_tasks(
    battle: Battle,
    battle_round: BattleRound,
    db: Session,
    num_tasks: int = 5,
) -> list:
    """
    Pick `num_tasks` questions from the bank and create BattleTask rows.
    Returns the created BattleTask objects.
    Called during create_ai_duel() and _seed_live_battles().
    """
    import random
    questions = random.sample(_QUESTION_BANK, min(num_tasks, len(_QUESTION_BANK)))
    tasks = []
    for i, q in enumerate(questions, start=1):
        task = BattleTask(
            battle_id=battle.id,
            round_id=battle_round.id,
            task_type="mcq",
            order=i,
            max_score=100,
            ends_at=battle.ends_at,
            # _correct is stored inside config but NEVER sent to client
            config={
                "question": q["question"],
                "options":  q["options"],
                "_correct": q["_correct"],
                "topic":    q["topic"],
            },
        )
        db.add(task)
        tasks.append(task)
    db.flush()
    return tasks

# ─────────────────────────────────────────────────────────────────────────────
# ELO Engine (Standard formula, K=32)
# ─────────────────────────────────────────────────────────────────────────────

K_FACTOR = 32

def _expected_score(player_elo: int, opponent_elo: int) -> float:
    return 1.0 / (1.0 + 10 ** ((opponent_elo - player_elo) / 400))

def calculate_elo_change(player_elo: int, opponent_elo: int, result: str) -> Tuple[int, int]:
    """
    result: 'win' | 'loss' | 'draw'
    Returns (new_elo, delta)
    """
    score = {"win": 1.0, "draw": 0.5, "loss": 0.0}[result]
    expected = _expected_score(player_elo, opponent_elo)
    delta = round(K_FACTOR * (score - expected))
    new_elo = max(100, player_elo + delta)
    return new_elo, delta


# ─────────────────────────────────────────────────────────────────────────────
# Arena Profile
# ─────────────────────────────────────────────────────────────────────────────

def get_or_create_arena_profile(user_id: UUID, db: Session) -> ArenaProfile:
    """Upsert arena profile. ELO starts at 800, level 1."""
    profile = db.query(ArenaProfile).filter(ArenaProfile.user_id == user_id).first()
    if not profile:
        profile = ArenaProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def compute_level_from_xp(xp: int) -> Tuple[int, int]:
    """
    Returns (level, xp_percent_in_level).
    Level thresholds: 0, 500, 1200, 2100, 3200, ... (quadratic growth)
    """
    level = 1
    threshold = 0
    while True:
        next_threshold = threshold + (level * 500)
        if xp < next_threshold:
            xp_in_level = xp - threshold
            xp_needed   = next_threshold - threshold
            pct = int((xp_in_level / xp_needed) * 100)
            return level, pct
        threshold = next_threshold
        level += 1


def get_global_rank(user_id: UUID, db: Session) -> Optional[int]:
    """
    Returns user's rank by arena_elo among all arena_profiles.
    """
    profile = db.query(ArenaProfile).filter(ArenaProfile.user_id == user_id).first()
    if not profile:
        return None
    higher_count = db.query(func.count(ArenaProfile.user_id)).filter(
        ArenaProfile.arena_elo > profile.arena_elo
    ).scalar() or 0
    return higher_count + 1


def get_arena_profile_data(user_id: UUID, db: Session) -> dict:
    profile = get_or_create_arena_profile(user_id, db)
    level, xp_pct = compute_level_from_xp(profile.arena_xp)
    total_games = profile.wins + profile.losses + profile.draws
    win_rate = round((profile.wins / total_games * 100) if total_games else 0)
    rank = get_global_rank(user_id, db)
    total_players = db.query(func.count(ArenaProfile.user_id)).scalar() or 1
    rank_pct = round(rank / total_players * 100) if rank else 100

    return {
        "arena_elo":      profile.arena_elo,
        "arena_xp":       profile.arena_xp,
        "level":          level,
        "xp_percent":     xp_pct,
        "wins":           profile.wins,
        "losses":         profile.losses,
        "draws":          profile.draws,
        "win_rate":       win_rate,
        "current_streak": profile.current_streak,
        "best_streak":    profile.best_streak,
        "global_rank":    rank,
        "rank_percent":   rank_pct,
        "skills": {
            "problem_solving": profile.skill_problem_solving,
            "coding":          profile.skill_coding,
            "debugging":       profile.skill_debugging,
            "system_design":   profile.skill_system_design,
            "ai_engineering":  profile.skill_ai_engineering,
            "speed":           profile.skill_speed,
            "accuracy":        profile.skill_accuracy,
            "collaboration":   profile.skill_collaboration,
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# Live / Upcoming
# ─────────────────────────────────────────────────────────────────────────────

def get_live_battles(db: Session, limit: int = 8) -> List[dict]:
    """Real live battles from DB with status='live' and ends_at in the future."""
    now = datetime.now(timezone.utc)
    battles = (
        db.query(Battle)
        .filter(Battle.status == "live", Battle.ends_at > now)
        .order_by(Battle.starts_at.asc())
        .limit(limit)
        .all()
    )
    result = []
    for b in battles:
        player_count = db.query(func.count(BattlePlayer.id)).filter(
            BattlePlayer.battle_id == b.id
        ).scalar() or 0
        result.append({
            "id":         str(b.id),
            "title":      b.title or "Arena Battle",
            "mode":       b.mode,
            "format":     b.challenge_format,
            "status":     b.status,
            "starts_at":  b.starts_at.isoformat() if b.starts_at else None,
            "ends_at":    b.ends_at.isoformat() if b.ends_at else None,
            "players":    player_count,
            "challenge_id": str(b.challenge_id) if b.challenge_id else None,
        })
    return result


def get_upcoming_events(db: Session, limit: int = 8) -> List[dict]:
    """Challenges that haven't started yet (starts_at in the future)."""
    now = datetime.now(timezone.utc)
    challenges = (
        db.query(Challenge)
        .filter(
            Challenge.is_active == True,
            Challenge.starts_at > now,
        )
        .order_by(Challenge.starts_at.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":         str(c.id),
            "title":      c.title,
            "type":       c.challenge_type,
            "difficulty": c.difficulty,
            "starts_at":  c.starts_at.isoformat(),
            "ends_at":    c.ends_at.isoformat(),
            "duration_m": c.time_minutes,
            "xp":         c.xp_reward,
            "tags":       c.tags,
        }
        for c in challenges
    ]


def get_platform_stats(db: Session) -> dict:
    """Real platform stats — no hardcoded numbers."""
    now = datetime.now(timezone.utc)

    active_in_queue = db.query(func.count(MatchmakingQueue.id)).filter(
        MatchmakingQueue.status == "searching"
    ).scalar() or 0

    active_in_battle = db.query(func.count(BattlePlayer.id)).filter(
        BattlePlayer.status == "live"
    ).scalar() or 0

    live_challenge_count = db.query(func.count(Battle.id)).filter(
        Battle.status == "live"
    ).scalar() or 0

    total_completed = db.query(func.count(ChallengeParticipant.id)).filter(
        ChallengeParticipant.completed == True
    ).scalar() or 0

    return {
        "players_online":      active_in_queue + active_in_battle,
        "live_battles":        live_challenge_count,
        "challenges_solved":   total_completed,
    }


# ─────────────────────────────────────────────────────────────────────────────
# AI Opponents
# ─────────────────────────────────────────────────────────────────────────────

def get_ai_opponents(db: Session) -> List[dict]:
    bots = db.query(AIOpponent).filter(AIOpponent.is_active == True).order_by(AIOpponent.elo.asc()).all()
    return [
        {
            "id":          str(b.id),
            "name":        b.name,
            "display_name": b.display_name,
            "emoji":       b.emoji,
            "description": b.description,
            "elo":         b.elo,
            "difficulty":  b.difficulty,
            "accuracy_max": b.accuracy_max,
            "speed_level":  b.speed_level,
        }
        for b in bots
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Active Season
# ─────────────────────────────────────────────────────────────────────────────

def get_active_season(db: Session) -> Optional[dict]:
    now = datetime.now(timezone.utc)
    season = (
        db.query(ArenaSeason)
        .filter(ArenaSeason.is_active == True, ArenaSeason.ends_at > now)
        .order_by(ArenaSeason.starts_at.desc())
        .first()
    )
    if not season:
        return None
    return {
        "id":        str(season.id),
        "name":      season.name,
        "tagline":   season.tagline,
        "starts_at": season.starts_at.isoformat(),
        "ends_at":   season.ends_at.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Active Boss Instance
# ─────────────────────────────────────────────────────────────────────────────

def get_active_boss(db: Session) -> Optional[dict]:
    now = datetime.now(timezone.utc)
    inst = (
        db.query(BossInstance)
        .filter(BossInstance.status == "active", BossInstance.ends_at > now)
        .order_by(BossInstance.starts_at.desc())
        .first()
    )
    if not inst:
        return None

    boss = inst.boss
    fighter_count = db.query(func.count(BossRun.id)).filter(
        BossRun.boss_instance_id == inst.id
    ).scalar() or 0

    hp_pct = int((inst.current_hp / inst.total_hp) * 100) if inst.total_hp > 0 else 0

    return {
        "instance_id":  str(inst.id),
        "boss_id":      str(boss.id),
        "name":         boss.name,
        "emoji":        boss.emoji,
        "description":  boss.description,
        "total_hp":     inst.total_hp,
        "current_hp":   inst.current_hp,
        "hp_percent":   hp_pct,
        "difficulty":   boss.difficulty,
        "phases":       boss.phases,
        "ends_at":      inst.ends_at.isoformat(),
        "fighters":     fighter_count,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Matchmaking
# ─────────────────────────────────────────────────────────────────────────────

def join_matchmaking(user_id: UUID, mode: str, challenge_format: str, db: Session) -> dict:
    """
    Idempotently add user to matchmaking queue.
    After joining, attempt to find a match immediately.
    """
    profile = get_or_create_arena_profile(user_id, db)

    # Remove any stale queue entry
    db.query(MatchmakingQueue).filter(
        MatchmakingQueue.user_id == user_id
    ).delete()

    entry = MatchmakingQueue(
        user_id=user_id,
        mode=mode,
        challenge_format=challenge_format,
        elo=profile.arena_elo,
        status="searching",
    )
    db.add(entry)
    db.commit()

    # Try to find a match now
    match = _attempt_match(user_id, mode, profile.arena_elo, db)
    if match:
        return {"status": "matched", "battle_id": str(match.id)}
    return {"status": "searching", "queue_position": _get_queue_position(user_id, mode, db)}


def leave_matchmaking(user_id: UUID, db: Session):
    db.query(MatchmakingQueue).filter(
        MatchmakingQueue.user_id == user_id
    ).delete()
    db.commit()


def get_matchmaking_status(user_id: UUID, db: Session) -> dict:
    entry = db.query(MatchmakingQueue).filter(MatchmakingQueue.user_id == user_id).first()
    if not entry:
        return {"status": "not_in_queue"}

    if entry.status == "matched" and entry.battle_id:
        return {"status": "matched", "battle_id": str(entry.battle_id)}

    # Try again in case a new player joined the queue
    profile = get_or_create_arena_profile(user_id, db)
    match = _attempt_match(user_id, entry.mode, profile.arena_elo, db)
    if match:
        return {"status": "matched", "battle_id": str(match.id)}

    return {
        "status": "searching",
        "mode":   entry.mode,
        "elo":    entry.elo,
        "queue_position": _get_queue_position(user_id, entry.mode, db),
    }


def _get_queue_position(user_id: UUID, mode: str, db: Session) -> int:
    entry = db.query(MatchmakingQueue).filter(MatchmakingQueue.user_id == user_id).first()
    if not entry:
        return 0
    earlier = db.query(func.count(MatchmakingQueue.id)).filter(
        MatchmakingQueue.mode == mode,
        MatchmakingQueue.status == "searching",
        MatchmakingQueue.joined_at < entry.joined_at,
    ).scalar() or 0
    return earlier + 1


def _attempt_match(user_id: UUID, mode: str, player_elo: int, db: Session) -> Optional[Battle]:
    """
    Find a compatible opponent in the queue within ELO ±150 range.
    If found, create a battle and remove both from queue.
    Respects challenge_format from the queue entry (Fix 6).
    """
    elo_range = 150

    # Get current user's queue entry to know their requested format
    my_entry = db.query(MatchmakingQueue).filter(
        MatchmakingQueue.user_id == user_id,
        MatchmakingQueue.status == "searching",
    ).first()
    my_format = (my_entry.challenge_format if my_entry else None) or "mcq"

    opponent_entry = (
        db.query(MatchmakingQueue)
        .filter(
            MatchmakingQueue.mode == mode,
            MatchmakingQueue.status == "searching",
            MatchmakingQueue.user_id != user_id,
            MatchmakingQueue.elo.between(player_elo - elo_range, player_elo + elo_range),
        )
        .order_by(MatchmakingQueue.joined_at.asc())
        .first()
    )
    if not opponent_entry:
        return None

    # Use the format both players agreed on (prefer match; fallback to my format)
    chosen_format = (opponent_entry.challenge_format or my_format) or "mcq"

    # Create battle
    now = datetime.now(timezone.utc)
    battle = Battle(
        mode=mode,
        challenge_format=chosen_format,   # FIX 6: was hardcoded "mcq"
        status="lobby",
        title=f"{mode.upper()} Battle",
        starts_at=now + timedelta(seconds=30),
        ends_at=now + timedelta(minutes=20),
    )
    db.add(battle)
    db.flush()

    # Add players
    for uid in [user_id, opponent_entry.user_id]:
        bp = BattlePlayer(battle_id=battle.id, user_id=uid, status="ready")
        db.add(bp)

    # Generate tasks if MCQ format
    if chosen_format == "mcq":
        battle_round = BattleRound(
            battle_id=battle.id,
            round_number=1,
            challenge_format=chosen_format,
            status="lobby",
            starts_at=battle.starts_at,
            ends_at=battle.ends_at,
            config={},
        )
        db.add(battle_round)
        db.flush()
        _generate_battle_tasks(battle, battle_round, db, num_tasks=5)

    # Update queue entries
    for uid in [user_id, opponent_entry.user_id]:
        db.query(MatchmakingQueue).filter(
            MatchmakingQueue.user_id == uid
        ).update({"status": "matched", "battle_id": battle.id})

    db.commit()
    db.refresh(battle)
    return battle


# ─────────────────────────────────────────────────────────────────────────────
# Battle Operations
# ─────────────────────────────────────────────────────────────────────────────

def get_battle_state(battle_id: UUID, user_id: UUID, db: Session) -> dict:
    battle = db.query(Battle).filter(Battle.id == battle_id).first()
    if not battle:
        raise ValueError("Battle not found")

    # Auto-transition lobby/waiting battle to live if starts_at has arrived or for AI duels
    if battle.status in ["waiting", "lobby"]:
        now = datetime.now(timezone.utc)
        is_past_start = False
        if battle.starts_at:
            sa = battle.starts_at
            if sa.tzinfo is None:
                sa = sa.replace(tzinfo=timezone.utc)
            if now >= sa:
                is_past_start = True

        if battle.mode == "ai_duel" or is_past_start:
            battle.status = "live"
            db.commit()
            db.refresh(battle)

    # Authorization check
    participant = db.query(BattlePlayer).filter(
        BattlePlayer.battle_id == battle_id,
        BattlePlayer.user_id == user_id,
    ).first()
    if not participant:
        raise PermissionError("You are not part of this battle")

    players = db.query(BattlePlayer).filter(BattlePlayer.battle_id == battle_id).all()
    player_data = []
    for p in players:
        if p.is_ai:
            bot = db.query(AIOpponent).filter(AIOpponent.id == p.ai_opponent_id).first() if p.ai_opponent_id else None
            name = bot.display_name if bot else "AI Opponent"
        else:
            u = db.query(User).filter(User.id == p.user_id).first()
            name = (u.name or u.email.split("@")[0]) if u else "Player"
        player_data.append({
            "user_id": str(p.user_id) if p.user_id else f"ai:{p.ai_opponent_id}",
            "name":    name,
            "status":  p.status,
            "score":   p.score or 0,
            "rank":    p.rank,
            "is_ai":   p.is_ai,
        })

    # FIX 4: Query BattleTask rows and return sanitized list (no _correct exposed)
    tasks_raw = (
        db.query(BattleTask)
        .filter(BattleTask.battle_id == battle_id)
        .order_by(BattleTask.order)
        .all()
    )
    tasks = [sanitize_task_for_client(t) for t in tasks_raw]

    return {
        "id":            str(battle.id),
        "battle_id":     str(battle.id),
        "mode":          battle.mode,
        "format":        battle.challenge_format,
        "status":        battle.status,
        "title":         battle.title,
        "starts_at":     battle.starts_at.isoformat() if battle.starts_at else None,
        "ends_at":       battle.ends_at.isoformat() if battle.ends_at else None,
        "current_round": battle.current_round,
        "total_rounds":  battle.total_rounds,
        "players":       player_data,
        "tasks":         tasks,          # FIX 4: was missing; frontend does `if (d.tasks) setTasks(d.tasks)`
    }


def submit_battle_answer(
    battle_id: UUID,
    user_id: UUID,
    submission_type: str,
    content: str,
    selected_option: Optional[int],
    language: Optional[str],
    db: Session,
    task_id: Optional[str] = None,
) -> dict:
    """
    Server receives submission and validates the deadline.
    submitted_at is set by server — client timestamp is ignored.
    Authoritative scoring flow:
        Submission → Evaluation → Score → BattlePlayer.score += score → commit
    """
    battle = db.query(Battle).filter(Battle.id == battle_id).first()
    if not battle:
        raise ValueError("Battle not found")

    # Authorization
    participant = db.query(BattlePlayer).filter(
        BattlePlayer.battle_id == battle_id,
        BattlePlayer.user_id == user_id,
    ).first()
    if not participant:
        raise PermissionError("Not a participant")

    # Deadline enforcement
    now = datetime.now(timezone.utc)
    if battle.ends_at and now > battle.ends_at:
        raise ValueError("Battle has ended — submission rejected")

    if battle.status not in ("live", "lobby"):
        raise ValueError(f"Battle is not accepting submissions (status={battle.status})")

    # Resolve task object (used for correct answer lookup and max_score)
    task = None
    if task_id:
        try:
            task = db.query(BattleTask).filter(BattleTask.id == UUID(task_id)).first()
        except Exception:
            pass

    # Idempotency: check for duplicate submission per task
    if task_id:
        existing = db.query(BattleSubmission).filter(
            BattleSubmission.battle_id == battle_id,
            BattleSubmission.user_id == user_id,
            BattleSubmission.task_id == UUID(task_id),
        ).first()
        if existing:
            raise ValueError("Answer for this task already submitted")
    elif submission_type == "mcq":
        existing = db.query(BattleSubmission).filter(
            BattleSubmission.battle_id == battle_id,
            BattleSubmission.user_id == user_id,
            BattleSubmission.submission_type == "mcq",
        ).first()
        if existing:
            raise ValueError("MCQ answer already submitted")

    # ── Evaluate ──────────────────────────────────────────────────────────────
    score = 0
    is_correct = None
    eval_status = "evaluated"

    if submission_type == "mcq" and selected_option is not None:
        # Correct answer is stored in task.config["_correct"] (server-only key)
        correct = None
        if task:
            correct = task.config.get("_correct")
        if correct is None:
            # Fallback: legacy battle.config path
            correct = battle.config.get("correct_option")

        if correct is not None:
            is_correct = (int(selected_option) == int(correct))
            if is_correct:
                base_score = task.max_score if task else battle.config.get("points_per_question", 100)
                elapsed    = (now - battle.starts_at).total_seconds() if battle.starts_at else 0
                total_dur  = (battle.ends_at - battle.starts_at).total_seconds() if battle.starts_at and battle.ends_at else 1
                time_ratio = max(0.0, 1.0 - elapsed / max(1.0, total_dur))
                score      = base_score + int(time_ratio * 50)  # up to 50 speed bonus
        eval_status = "evaluated"

    elif submission_type == "reasoning":
        # FIX 8: Reasoning is NOT evaluated immediately — mark pending, score stays 0
        # A future AI rubric pass will update score and mark evaluated.
        score = 0
        is_correct = None
        eval_status = "pending"  # was wrongly set to "evaluated" before

    # ── Persist submission ────────────────────────────────────────────────────
    sub = BattleSubmission(
        battle_id=battle_id,
        task_id=UUID(task_id) if task_id else None,
        user_id=user_id,
        submission_type=submission_type,
        content=content,
        selected_option=selected_option,
        language=language,
        score=score,
        is_correct=is_correct,
        evaluation_status=eval_status,
    )
    db.add(sub)

    # FIX 2: Always update participant.score (MCQ branch was missing this)
    if submission_type == "mcq":
        participant.score = (participant.score or 0) + score
    # Reasoning: score stays 0 until evaluated — don't add to participant yet

    db.commit()
    db.refresh(sub)

    return {
        "submission_id": str(sub.id),
        "score":         sub.score,
        "is_correct":    sub.is_correct,
        "status":        sub.evaluation_status,
        "player_total":  participant.score,
    }


def get_battle_results(battle_id: UUID, user_id: UUID, db: Session) -> dict:
    battle = db.query(Battle).filter(Battle.id == battle_id).first()
    if not battle:
        raise ValueError("Battle not found")

    players = (
        db.query(BattlePlayer)
        .filter(BattlePlayer.battle_id == battle_id)
        .order_by(BattlePlayer.score.desc())
        .all()
    )

    # Assign ranks
    for i, p in enumerate(players):
        p.rank = i + 1
    db.commit()

    my_player = next((p for p in players if str(p.user_id) == str(user_id)), None)

    leaderboard = []
    for p in players:
        u = db.query(User).filter(User.id == p.user_id).first()
        leaderboard.append({
            "rank":    p.rank,
            "name":    u.name if u else "Player",
            "score":   p.score,
            "user_id": str(p.user_id),
            "is_you":  str(p.user_id) == str(user_id),
        })

    my_profile = get_or_create_arena_profile(user_id, db)
    return {
        "battle_id": str(battle_id),
        "status":    battle.status,
        "my_rank":   my_player.rank if my_player else None,
        "my_score":  my_player.score if my_player else 0,
        "my_elo":    my_profile.arena_elo,
        "leaderboard": leaderboard,
    }


def get_battle_leaderboard(battle_id: UUID, db: Session) -> List[dict]:
    players = (
        db.query(BattlePlayer)
        .filter(BattlePlayer.battle_id == battle_id)
        .order_by(BattlePlayer.score.desc())
        .all()
    )
    result = []
    for i, p in enumerate(players):
        u = db.query(User).filter(User.id == p.user_id).first()
        result.append({
            "rank":    i + 1,
            "name":    u.name if u else "Player",
            "score":   p.score,
            "user_id": str(p.user_id),
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Battle Completion + ELO + XP
# ─────────────────────────────────────────────────────────────────────────────

def finalize_battle(battle_id: UUID, db: Session):
    """
    Called when ends_at is reached or all players submitted.
    Calculates final ranks, ELO changes, XP, skill updates.
    This should be called from a background task or WebSocket server-tick.
    """
    battle = db.query(Battle).filter(Battle.id == battle_id).first()
    if not battle or battle.status == "completed":
        return

    battle.status = "completed"

    players = (
        db.query(BattlePlayer)
        .filter(BattlePlayer.battle_id == battle_id, BattlePlayer.is_ai == False)
        .order_by(BattlePlayer.score.desc())
        .all()
    )

    for i, p in enumerate(players):
        p.rank = i + 1
        p.status = "finished"
        p.finished_at = datetime.now(timezone.utc)

    db.flush()

    # ELO + XP for 1v1 (exactly 2 human players)
    if battle.mode == "1v1" and len(players) == 2:
        a, b = players[0], players[1]
        pa = get_or_create_arena_profile(a.user_id, db)
        pb = get_or_create_arena_profile(b.user_id, db)

        if a.score > b.score:
            result_a, result_b = "win", "loss"
        elif a.score < b.score:
            result_a, result_b = "loss", "win"
        else:
            result_a, result_b = "draw", "draw"

        new_elo_a, delta_a = calculate_elo_change(pa.arena_elo, pb.arena_elo, result_a)
        new_elo_b, delta_b = calculate_elo_change(pb.arena_elo, pa.arena_elo, result_b)

        # Update profiles
        for profile, result, new_elo, delta in [
            (pa, result_a, new_elo_a, delta_a),
            (pb, result_b, new_elo_b, delta_b),
        ]:
            old_elo = profile.arena_elo
            profile.arena_elo = new_elo
            if result == "win":
                profile.wins += 1
                profile.current_streak += 1
                profile.best_streak = max(profile.best_streak, profile.current_streak)
            elif result == "loss":
                profile.losses += 1
                profile.current_streak = 0
            else:
                profile.draws += 1

            db.add(EloHistory(
                user_id=profile.user_id,
                battle_id=battle.id,
                rating_before=old_elo,
                rating_after=new_elo,
                rating_change=delta,
                opponent_elo=pb.arena_elo if profile == pa else pa.arena_elo,
                result=result,
            ))

        # XP awards (idempotent check by battle_id)
        for player, result in [(a, result_a), (b, result_b)]:
            xp_amount = {"win": 300, "draw": 150, "loss": 75}[result]
            already = db.query(XpTransaction).filter(
                XpTransaction.user_id == player.user_id,
                XpTransaction.battle_id == battle.id,
            ).first()
            if not already:
                xp_tx = XpTransaction(
                    user_id=player.user_id,
                    battle_id=battle.id,
                    amount=xp_amount,
                    source="battle",
                    note=f"1v1 battle - {result}",
                )
                db.add(xp_tx)
                # Update arena_profile XP
                p_profile = pa if player == a else pb
                p_profile.arena_xp += xp_amount
                lvl, _ = compute_level_from_xp(p_profile.arena_xp)
                p_profile.level = lvl

    db.commit()
    return {
        "battle_id": str(battle_id),
        "status": "completed",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Boss Run
# ─────────────────────────────────────────────────────────────────────────────

def start_boss_run(boss_instance_id: UUID, user_id: UUID, db: Session) -> dict:
    """Start a player's run against a boss instance."""
    inst = db.query(BossInstance).filter(
        BossInstance.id == boss_instance_id,
        BossInstance.status == "active",
    ).first()
    if not inst:
        raise ValueError("Boss instance not found or inactive")

    # Idempotent: resume existing run if already active
    existing = db.query(BossRun).filter(
        BossRun.boss_instance_id == boss_instance_id,
        BossRun.user_id == user_id,
        BossRun.status == "active",
    ).first()
    if existing:
        return {
            "run_id":      str(existing.id),
            "boss_name":   inst.boss.name,
            "current_hp":  inst.current_hp,
            "total_hp":    inst.total_hp,
            "current_phase": existing.current_phase,
            "ends_at":     inst.ends_at.isoformat(),
        }

    run = BossRun(
        boss_instance_id=boss_instance_id,
        user_id=user_id,
        status="active",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return {
        "run_id":      str(run.id),
        "boss_name":   inst.boss.name,
        "current_hp":  inst.current_hp,
        "total_hp":    inst.total_hp,
        "current_phase": run.current_phase,
        "ends_at":     inst.ends_at.isoformat(),
    }


def submit_boss_answer(
    run_id: UUID,
    user_id: UUID,
    phase: int,
    submission_type: str,
    content: str,
    db: Session,
) -> dict:
    """
    Player submits answer during boss run.
    Evaluates and deals damage to boss HP.
    """
    run = db.query(BossRun).filter(BossRun.id == run_id, BossRun.user_id == user_id).first()
    if not run:
        raise ValueError("Run not found")
    if run.status != "active":
        raise ValueError("Run is not active")

    inst = run.boss_instance
    now = datetime.now(timezone.utc)
    if now > inst.ends_at:
        run.status = "failed"
        db.commit()
        raise ValueError("Boss raid has ended")

    # Simple scoring: reasoning quality → damage
    # For Phase 1: word count proxy, minimum 50 chars for partial credit
    base_damage = 0
    is_correct = False
    if len(content.strip()) >= 50:
        base_damage = 200 + min(len(content.strip()) // 10, 300)
        is_correct = True

    sub = BossSubmission(
        run_id=run_id,
        user_id=user_id,
        phase=phase,
        submission_type=submission_type,
        content=content,
        damage_dealt=base_damage,
        score=base_damage,
        is_correct=is_correct,
        evaluation_detail={"note": "Phase 1 evaluation"},
    )
    db.add(sub)

    # Apply damage to shared boss HP
    inst.current_hp = max(0, inst.current_hp - base_damage)
    run.damage_dealt += base_damage
    run.score += base_damage

    # Check boss defeated
    if inst.current_hp <= 0:
        inst.status = "defeated"
        run.status = "completed"
        run.ended_at = now

        # Award XP for boss kill
        already = db.query(XpTransaction).filter(
            XpTransaction.user_id == user_id,
            XpTransaction.source == "boss",
            XpTransaction.note.contains(str(run_id)),
        ).first()
        if not already:
            db.add(XpTransaction(
                user_id=user_id,
                amount=500,
                source="boss",
                note=f"Boss defeated — run {run_id}",
            ))
            profile = get_or_create_arena_profile(user_id, db)
            profile.arena_xp += 500
            lvl, _ = compute_level_from_xp(profile.arena_xp)
            profile.level = lvl

    # Advance phase if multiple phases exist
    boss_phases = inst.boss.phases or []
    if phase < len(boss_phases) and is_correct:
        run.current_phase = phase + 1

    db.commit()

    return {
        "damage_dealt":    base_damage,
        "total_damage":    run.damage_dealt,
        "boss_hp":         inst.current_hp,
        "boss_hp_percent": int((inst.current_hp / inst.total_hp) * 100) if inst.total_hp else 0,
        "boss_defeated":   inst.status == "defeated",
        "current_phase":   run.current_phase,
        "run_status":      run.status,
    }


# ─────────────────────────────────────────────────────────────────────────────
# AI Duel — create a battle against a bot
# ─────────────────────────────────────────────────────────────────────────────

def create_ai_duel(user_id: UUID, opponent_id: UUID, db: Session) -> dict:
    """
    Create a 1v1 battle against an AI opponent.
    FIX 1: Creates BattleRound + BattleTask rows so the battle is genuinely playable.
    """
    bot = db.query(AIOpponent).filter(AIOpponent.id == opponent_id).first()
    if not bot:
        raise ValueError("AI opponent not found")

    # Prevent duplicate active duels
    existing = db.query(Battle).join(BattlePlayer).filter(
        BattlePlayer.user_id == user_id,
        Battle.mode == "ai_duel",
        Battle.status.in_(["waiting", "lobby", "live"]),
    ).first()
    if existing:
        return {
            "battle_id": str(existing.id),
            "opponent":  bot.display_name,
            "starts_at": existing.starts_at.isoformat() if existing.starts_at else None,
            "ends_at":   existing.ends_at.isoformat() if existing.ends_at else None,
            "resuming":  True,
        }

    now = datetime.now(timezone.utc)
    battle = Battle(
        mode="ai_duel",
        challenge_format="mcq",
        status="lobby",
        title=f"AI Duel vs {bot.display_name}",
        starts_at=now + timedelta(seconds=5),
        ends_at=now + timedelta(minutes=15),
        config={
            "opponent_name": bot.display_name,
            "opponent_elo":  bot.elo,
            "is_ai_duel":    True,
        }
    )
    db.add(battle)
    db.flush()

    # Human player
    db.add(BattlePlayer(
        battle_id=battle.id, user_id=user_id, status="ready", is_ai=False
    ))

    # AI player row — user_id=None (nullable)
    db.add(BattlePlayer(
        battle_id=battle.id,
        user_id=None,
        ai_opponent_id=opponent_id,
        status="ready",
        is_ai=True,
        score=0,
    ))
    db.flush()

    # FIX 1: Create BattleRound + BattleTasks — without these the battle screen shows nothing
    battle_round = BattleRound(
        battle_id=battle.id,
        round_number=1,
        challenge_format="mcq",
        status="lobby",
        starts_at=battle.starts_at,
        ends_at=battle.ends_at,
        config={"bot": bot.display_name},
    )
    db.add(battle_round)
    db.flush()

    _generate_battle_tasks(battle, battle_round, db, num_tasks=5)

    db.commit()
    db.refresh(battle)

    return {
        "battle_id": str(battle.id),
        "opponent":  bot.display_name,
        "starts_at": battle.starts_at.isoformat(),
        "ends_at":   battle.ends_at.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Challenge Recommendation
# ─────────────────────────────────────────────────────────────────────────────

def get_recommended_challenge(user_id: UUID, db: Session) -> Optional[dict]:
    """
    Recommend next challenge based on user's weakest skill area.
    Integrates with existing challenge + onboarding data.
    """
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
    field = get_user_field(ob)
    profile = get_or_create_arena_profile(user_id, db)

    # Find weakest skill
    skills = {
        "problem_solving": profile.skill_problem_solving,
        "coding":          profile.skill_coding,
        "debugging":       profile.skill_debugging,
        "system_design":   profile.skill_system_design,
        "ai_engineering":  profile.skill_ai_engineering,
    }
    weakest = min(skills, key=skills.get)

    now = datetime.now(timezone.utc)
    completed_ids = {
        str(p.challenge_id)
        for p in db.query(ChallengeParticipant).filter(
            ChallengeParticipant.user_id == user_id,
            ChallengeParticipant.completed == True,
        ).all()
    }

    # Find an uncompleted, active challenge
    candidates = db.query(Challenge).filter(
        Challenge.is_active == True,
        Challenge.ends_at > now,
        Challenge.field_tag.in_([field, "all"]),
    ).all()

    uncompleted = [c for c in candidates if str(c.id) not in completed_ids]
    if not uncompleted:
        uncompleted = candidates

    ch = uncompleted[0] if uncompleted else None
    if not ch:
        return None

    return {
        "id":            str(ch.id),
        "title":         ch.title,
        "description":   ch.description,
        "difficulty":    ch.difficulty,
        "duration_m":    ch.time_minutes,
        "xp":            ch.xp_reward,
        "reason":        f"Your {weakest.replace('_', ' ')} score needs work",
        "weakness_area": weakest,
    }
