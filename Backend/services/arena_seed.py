"""
services/arena_seed.py

Idempotent seed data for Arena development.
Creates bots, season, boss, and sample battles only if they don't exist.
Production: distinguish seeded data from real events using is_seeded flag in config JSON.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from sqlalchemy.orm import Session

from Backend.models.arena import (
    AIOpponent, Boss, BossInstance, ArenaSeason, Battle, BattleRound
)
from Backend.models.challenges import Challenge

log = logging.getLogger(__name__)


def seed_arena(db: Session):
    """
    Called from startup(). Fully idempotent — safe to call every restart.
    """
    _seed_ai_opponents(db)
    season = _seed_season(db)
    boss_inst = _seed_boss(db, season)
    _seed_live_battles(db)
    log.info("[Arena Seed] Complete.")


# ─────────────────────────────────────────────────────────────────────────────
# AI Opponents
# ─────────────────────────────────────────────────────────────────────────────

_BOTS = [
    {
        "name": "rookie_bot",
        "display_name": "Rookie Bot",
        "emoji": "🟢",
        "description": "A beginner-level AI. Good for warming up. Makes frequent mistakes.",
        "elo": 300,
        "accuracy_min": 0.55,
        "accuracy_max": 0.72,
        "speed_level": 1,
        "mistake_rate": 0.30,
        "difficulty": 2,
    },
    {
        "name": "engineer_bot",
        "display_name": "Engineer Bot",
        "emoji": "🟡",
        "description": "Mid-level AI. Solid fundamentals. Occasional mistakes under pressure.",
        "elo": 800,
        "accuracy_min": 0.78,
        "accuracy_max": 0.88,
        "speed_level": 2,
        "mistake_rate": 0.12,
        "difficulty": 5,
    },
    {
        "name": "architect_bot",
        "display_name": "Architect Bot",
        "emoji": "🔴",
        "description": "Elite AI. Near-perfect accuracy. Extremely difficult to beat. Theoretically beatable.",
        "elo": 1500,
        "accuracy_min": 0.92,
        "accuracy_max": 0.98,
        "speed_level": 3,
        "mistake_rate": 0.03,
        "difficulty": 9,
    },
]


def _seed_ai_opponents(db: Session):
    for bot in _BOTS:
        existing = db.query(AIOpponent).filter(AIOpponent.name == bot["name"]).first()
        if not existing:
            db.add(AIOpponent(**bot))
            log.info(f"[Seed] Created AI opponent: {bot['display_name']}")
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Season
# ─────────────────────────────────────────────────────────────────────────────

def _seed_season(db: Session) -> ArenaSeason:
    existing = db.query(ArenaSeason).filter(
        ArenaSeason.name == "Season 01: Rise of the Machines"
    ).first()
    if existing:
        return existing

    now = datetime.now(timezone.utc)
    season = ArenaSeason(
        name="Season 01: Rise of the Machines",
        tagline="The builders' league. Real skills. Real pressure.",
        starts_at=now,
        ends_at=now + timedelta(days=30),
        is_active=True,
        config={"is_seeded": True, "theme": "dark_tech"},
    )
    db.add(season)
    db.commit()
    db.refresh(season)
    log.info("[Seed] Created Season 01")
    return season


# ─────────────────────────────────────────────────────────────────────────────
# Boss
# ─────────────────────────────────────────────────────────────────────────────

def _seed_boss(db: Session, season: ArenaSeason) -> BossInstance:
    # Create boss definition if not exists
    boss = db.query(Boss).filter(Boss.name == "The Hallucination Monster").first()
    if not boss:
        boss = Boss(
            name="The Hallucination Monster",
            emoji="🧟",
            description=(
                "Your RAG system is hallucinating. Documents are being retrieved incorrectly. "
                "The model is making up facts. Defeat the monster before it spreads misinformation."
            ),
            total_hp=10000,
            difficulty=7,
            phases=[
                {
                    "phase": 1,
                    "title": "Retrieval Failure",
                    "description": "The retriever is returning irrelevant documents. Diagnose and fix the ranking logic.",
                    "attack_type": "bad_retrieval",
                },
                {
                    "phase": 2,
                    "title": "Poisoned Documents",
                    "description": "3 conflicting documents have been injected. Find the correct source.",
                    "attack_type": "poisoned_docs",
                },
                {
                    "phase": 3,
                    "title": "Ambiguous Queries",
                    "description": "Users are asking ambiguous questions. The system must ask clarification or refuse.",
                    "attack_type": "ambiguous",
                },
                {
                    "phase": 4,
                    "title": "Adversarial Prompts",
                    "description": "The attacker is injecting instructions into documents. Defend your pipeline.",
                    "attack_type": "adversarial",
                },
                {
                    "phase": 5,
                    "title": "Final Evaluation",
                    "description": "Prove your RAG system works end-to-end under real conditions.",
                    "attack_type": "final",
                },
            ],
        )
        db.add(boss)
        db.commit()
        db.refresh(boss)
        log.info("[Seed] Created Boss: The Hallucination Monster")

    # Create live instance for this season if not exists
    existing_inst = db.query(BossInstance).filter(
        BossInstance.boss_id == boss.id,
        BossInstance.season_id == season.id,
    ).first()
    if existing_inst:
        return existing_inst

    now = datetime.now(timezone.utc)
    inst = BossInstance(
        boss_id=boss.id,
        season_id=season.id,
        total_hp=boss.total_hp,
        current_hp=boss.total_hp,
        status="active",
        starts_at=now,
        ends_at=now + timedelta(days=7),
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    log.info(f"[Seed] Created BossInstance for season {season.name}")
    return inst


# ─────────────────────────────────────────────────────────────────────────────
# Sample Live Battles (dev only)
# ─────────────────────────────────────────────────────────────────────────────

_SAMPLE_BATTLES = [
    {
        "title": "Knowledge Clash",
        "mode": "2v2",
        "challenge_format": "mcq",
        "duration_m": 20,
        "config": {
            "is_seeded": True,
            "topic": "Computer Science · AI · Tech",
            "correct_option": 1,
            "points_per_question": 100,
            "questions": [
                {
                    "id": "q1",
                    "text": "What does RAG stand for in AI systems?",
                    "options": [
                        "Random Access Generation",
                        "Retrieval-Augmented Generation",
                        "Recurrent Attention Gating",
                        "Recursive Agent Graph",
                    ],
                    "correct": 1,
                }
            ],
        },
    },
    {
        "title": "AI Agent Sprint",
        "mode": "squad",
        "challenge_format": "reasoning",
        "duration_m": 40,
        "config": {
            "is_seeded": True,
            "topic": "Build a working AI agent with given tools",
        },
    },
    {
        "title": "The Dev Survival",
        "mode": "battle_royale",
        "challenge_format": "mixed",
        "duration_m": 45,
        "config": {
            "is_seeded": True,
            "topic": "MCQs + Coding + Debug + Build",
        },
    },
]


def _seed_live_battles(db: Session):
    now = datetime.now(timezone.utc)

    for spec in _SAMPLE_BATTLES:
        existing = db.query(Battle).filter(
            Battle.title == spec["title"],
            Battle.status.in_(["live", "lobby"]),
        ).first()
        if existing:
            continue

        duration = spec.get("duration_m", 30)
        battle = Battle(
            title=spec["title"],
            mode=spec["mode"],
            challenge_format=spec["challenge_format"],
            status="live",
            starts_at=now - timedelta(minutes=5),
            ends_at=now + timedelta(minutes=duration),
            config=spec["config"],
        )
        db.add(battle)
        db.flush()

        # Add a round
        r = BattleRound(
            battle_id=battle.id,
            round_number=1,
            challenge_format=spec["challenge_format"],
            status="live",
            starts_at=battle.starts_at,
            ends_at=battle.ends_at,
            config=spec["config"],
        )
        db.add(r)
        log.info(f"[Seed] Created live battle: {spec['title']}")

    db.commit()
