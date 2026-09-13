"""
routers/challenges.py

Endpoints:
  GET  /challenges/             — challenges matched to user's field
  GET  /challenges/my           — user's joined/completed challenges
  GET  /challenges/arena-stats  — live arena, boss, campaign & capability data
  POST /challenges/{id}/join    — join a challenge
  POST /challenges/{id}/complete — mark complete, award XP
"""

from uuid import UUID
from typing import Optional
import random
from datetime import datetime, timezone, timedelta
from math import floor

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from Backend.auth import get_current_user
from Backend.db.session import get_db
from Backend.models.user import User
from Backend.models.onboarding import UserOnboarding
from Backend.models.challenges import Challenge, ChallengeParticipant
from Backend.services.challenge_service import (
    get_challenges_for_user,
    join_challenge,
    complete_challenge,
)
from Backend.services.leaderboard_service import (
    get_user_field,
    award_xp,
    get_user_batch,
)
from Backend.models.leaderboard import LeaderboardEvent, UserXP

router = APIRouter(tags=["Challenges"])


# ─────────────────────────────────────────────────────────────────────────────
# GET /challenges/
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/")
def list_challenges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    challenges = get_challenges_for_user(ob, current_user.id, db)
    return {
        "field": get_user_field(ob),
        "challenges": challenges,
        "total": len(challenges),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /challenges/my
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/my")
def my_challenges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parts = (
        db.query(ChallengeParticipant, Challenge)
        .join(Challenge, Challenge.id == ChallengeParticipant.challenge_id)
        .filter(ChallengeParticipant.user_id == current_user.id)
        .order_by(ChallengeParticipant.joined_at.desc())
        .all()
    )

    result = []
    for part, challenge in parts:
        result.append({
            "challenge_id": str(challenge.id),
            "title": challenge.title,
            "difficulty": challenge.difficulty,
            "type": challenge.challenge_type,
            "xp_reward": challenge.xp_reward,
            "completed": part.completed,
            "score": part.score,
            "time_taken_s": part.time_taken_s,
            "joined_at": part.joined_at.isoformat() if part.joined_at else None,
            "completed_at": part.completed_at.isoformat() if part.completed_at else None,
        })

    completed_count = sum(1 for r in result if r["completed"])
    return {
        "challenges": result,
        "total": len(result),
        "completed": completed_count,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /challenges/{id}/join
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{challenge_id}/join")
def join(
    challenge_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    result = join_challenge(challenge_id, current_user.id, db)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# POST /challenges/{id}/complete
# ─────────────────────────────────────────────────────────────────────────────

class CompleteRequest(BaseModel):
    time_taken_s: Optional[int] = None


@router.post("/{challenge_id}/complete")
def complete(
    challenge_id: UUID,
    body: CompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = complete_challenge(challenge_id, current_user.id, body.time_taken_s, db)

    if result.get("status") == "completed":
        # Award XP to leaderboard
        ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
        field_key = get_user_field(ob)
        name = (ob.full_name if ob else None) or current_user.name or "User"
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()

        award_xp(
            user_id=current_user.id,
            amount=result["xp"],
            source="challenge",
            field_key=field_key,
            user_name=name,
            db=db,
        )

        # Log a challenge-done event for SSE feed
        if challenge:
            event = LeaderboardEvent(
                user_id=current_user.id,
                user_name=name,
                field_key=field_key,
                event_type="challenge_done",
                message=f"🏆 {name} completed '{challenge.title}' — +{result['xp']} XP",
                xp_delta=result["xp"],
            )
            db.add(event)
            db.commit()

    return result


# ─────────────────────────────────────────────────────────────────────────────
# GET /challenges/arena-stats
# ─────────────────────────────────────────────────────────────────────────────

# Field → Campaign display data
_CAMPAIGN_MAP = {
    "student:cs":          {"title": "AI ENGINEER",       "emoji": "🤖", "theme": "#6366f1"},
    "student:datascience": {"title": "DATA SCIENTIST",    "emoji": "📊", "theme": "#8b5cf6"},
    "student:medical":     {"title": "MED CHAMPION",      "emoji": "🏥", "theme": "#ec4899"},
    "student:commerce":    {"title": "MARKET STRATEGIST", "emoji": "📈", "theme": "#f59e0b"},
    "student:electronics": {"title": "CIRCUIT MASTER",   "emoji": "⚡", "theme": "#22c55e"},
    "student:mechanical":  {"title": "SYSTEMS ENGINEER",  "emoji": "⚙️", "theme": "#64748b"},
    "exam:jee":            {"title": "JEE WARRIOR",       "emoji": "⚗️", "theme": "#ef4444"},
    "exam:neet":           {"title": "NEET CHAMPION",     "emoji": "🔬", "theme": "#10b981"},
    "exam:upsc":           {"title": "UPSC ASPIRANT",     "emoji": "🏛️", "theme": "#f59e0b"},
    "exam:other":          {"title": "EXAM SLAYER",       "emoji": "📚", "theme": "#6366f1"},
    "freelancer":          {"title": "FREELANCE PRO",     "emoji": "💼", "theme": "#3b82f6"},
    "entrepreneur":        {"title": "STARTUP FOUNDER",   "emoji": "🚀", "theme": "#f97316"},
    "creator":             {"title": "CONTENT CREATOR",   "emoji": "🎬", "theme": "#ec4899"},
    "self_growth":         {"title": "GROWTH MASTER",     "emoji": "🧠", "theme": "#8b5cf6"},
}

_LIVE_EVENTS = [
    {"title": "THE AI OUTBREAK",    "players": 12483, "difficulty": 4, "xp": 2500, "multiplier": 1.5},
    {"title": "CYBER DEFENSE",      "players": 6482,  "difficulty": 3, "xp": 1800, "multiplier": 1.2},
    {"title": "AI AGENT WAR",       "players": 2103,  "difficulty": 5, "xp": 3200, "multiplier": 2.0},
    {"title": "SYSTEM DESIGN RUSH", "players": 4871,  "difficulty": 3, "xp": 1500, "multiplier": 1.3},
    {"title": "PRODUCTION DOWN",    "players": 9214,  "difficulty": 5, "xp": 4000, "multiplier": 2.5},
]

_BOSSES = [
    {"name": "THE HALLUCINATION MONSTER", "emoji": "🧟", "desc": "Your RAG system is hallucinating. Defeat it before it spreads.", "xp": 1800},
    {"name": "THE MEMORY LEAK",           "emoji": "👾", "desc": "Production RAM spiking 400%. Find and kill the leak.",          "xp": 2200},
    {"name": "THE SQL INJECTION BOSS",    "emoji": "💀", "desc": "Attackers are probing your endpoints. Harden every query.",     "xp": 2000},
    {"name": "THE TIMEOUT TITAN",         "emoji": "⏱️", "desc": "API timeouts are cascading. Redesign the call chain.",         "xp": 1600},
    {"name": "THE COLD START GHOST",      "emoji": "👻", "desc": "Serverless cold starts are killing UX. Warm them up.",         "xp": 1400},
]


@router.get("/arena-stats")
def arena_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    field_key = get_user_field(ob)

    # ── Participation stats ──────────────────────────────────────────────────
    all_parts = (
        db.query(ChallengeParticipant)
        .filter(ChallengeParticipant.user_id == current_user.id)
        .all()
    )
    completed_parts = [p for p in all_parts if p.completed]
    completed_count = len(completed_parts)
    total_score = sum(p.score or 0 for p in completed_parts)

    # ── Campaign ─────────────────────────────────────────────────────────────
    campaign_meta = _CAMPAIGN_MAP.get(field_key, {"title": "GROWTH WARRIOR", "emoji": "⚔️", "theme": "#6366f1"})
    # Derive level from completions: 1 level per 3 challenges, min level 1
    level = max(1, completed_count // 3 + 1)
    xp_in_level = (completed_count % 3) * 33  # 0..99

    # Find next incomplete challenge as current mission
    all_challenges = (
        db.query(Challenge)
        .filter(
            Challenge.is_active == True,
            Challenge.ends_at > datetime.now(timezone.utc),
            Challenge.field_tag.in_([field_key, "all"]),
        )
        .all()
    )
    joined_ids = {str(p.challenge_id) for p in all_parts}
    completed_ids = {str(p.challenge_id) for p in completed_parts}
    mission_title = None
    for ch in all_challenges:
        if str(ch.id) not in completed_ids:
            mission_title = ch.title
            break
    if not mission_title and all_challenges:
        mission_title = all_challenges[0].title
    if not mission_title:
        mission_title = "Complete your first challenge to begin"

    campaign = {
        "title": campaign_meta["title"],
        "emoji": campaign_meta["emoji"],
        "theme": campaign_meta["theme"],
        "level": level,
        "xp_percent": xp_in_level,
        "mission_title": mission_title,
        "field_key": field_key,
    }

    # ── Live Events (deterministic shuffle based on today's date) ────────────
    seed = datetime.now(timezone.utc).toordinal()
    rng = random.Random(seed)
    events_pool = list(_LIVE_EVENTS)
    rng.shuffle(events_pool)
    live_events = []
    for i, ev in enumerate(events_pool[:3]):
        starts_offset = (seed * (i + 1) * 137) % 900  # 0-900 seconds from now until start
        live_events.append({
            "title": ev["title"],
            "players": ev["players"] + (seed % 1000),
            "difficulty": ev["difficulty"],
            "xp": ev["xp"],
            "multiplier": ev["multiplier"],
            "starts_in_s": starts_offset,
            "time_remaining_s": 2700 - (seed % 1200),  # 15-45 min remaining
        })

    # ── Boss Battle ──────────────────────────────────────────────────────────
    boss_pick = _BOSSES[seed % len(_BOSSES)]
    # HP decreases as more global participants complete challenges today
    global_completions_today = (
        db.query(ChallengeParticipant)
        .filter(
            ChallengeParticipant.completed == True,
            ChallengeParticipant.completed_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0),
        )
        .count()
    )
    boss_hp = max(10, 100 - min(global_completions_today * 3, 85))
    boss = {
        "name": boss_pick["name"],
        "emoji": boss_pick["emoji"],
        "description": boss_pick["desc"],
        "xp_reward": boss_pick["xp"],
        "hp_percent": boss_hp,
        "time_remaining_s": 3600 - (seed % 1800),
        "participants": 8214 + (seed % 2000),
    }

    # ── Capability Score ─────────────────────────────────────────────────────
    # Derive from participation — rough but honest
    total_possible = max(1, len(all_challenges))
    participation_rate = min(100, int(len(joined_ids) / total_possible * 100))
    completion_rate = min(100, int(completed_count / max(1, len(joined_ids)) * 100)) if joined_ids else 0

    avg_time_s = None
    timed = [p.time_taken_s for p in completed_parts if p.time_taken_s]
    if timed:
        avg_time_s = sum(timed) // len(timed)

    # Fake but sensible sub-scores seeded from real data
    base = min(85, 40 + completed_count * 5)
    capability = {
        "overall": min(999, total_score // 10 + completed_count * 12),
        "problem_solving": min(100, base + 5),
        "coding": min(100, base),
        "debugging": min(100, max(20, base - 8)),
        "system_design": min(100, max(15, base - 22)),
        "ai_engineering": min(100, max(10, base - 10)),
        "execution": min(100, base + 3),
    }

    # ── PvP / Battle Stats ───────────────────────────────────────────────────
    pvp_stats = {
        "attacks_survived": completed_count * 2 + len(all_parts),
        "problems_solved": completed_count,
        "win_streak": min(completed_count, 6),
        "accuracy": completion_rate,
        "avg_completion": min(100, participation_rate),
        "deployments": max(0, completed_count - 2),
    }

    return {
        "campaign": campaign,
        "live_events": live_events,
        "boss": boss,
        "capability": capability,
        "pvp_stats": pvp_stats,
        "total_xp": total_score,
        "completed_count": completed_count,
    }
