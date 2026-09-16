"""
services/challenge_service.py

Fetch or generate challenges matched to user's profile.
Uses Gemini to create domain-specific challenges when templates are stale/missing.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from Backend.models.challenges import Challenge, ChallengeParticipant
from Backend.models.onboarding import UserOnboarding
from Backend.services.leaderboard_service import get_user_field, _normalize


# ─────────────────────────────────────────────────────────────────────────────
# Challenge fetch
# ─────────────────────────────────────────────────────────────────────────────

def get_challenges_for_user(
    ob: Optional[UserOnboarding],
    user_id: UUID,
    db: Session,
    _seeded: bool = False,
) -> list[dict]:
    """
    Return challenges for the user:
      1. Challenges matching their field_key
      2. Challenges with field_tag = "all" (universal)
    Enriches each with user's participation status.
    """
    now = datetime.now(timezone.utc)
    field_key = get_user_field(ob)

    challenges = (
        db.query(Challenge)
        .filter(
            Challenge.is_active == True,
            Challenge.ends_at > now,
            Challenge.field_tag.in_([field_key, "all"]),
        )
        .order_by(Challenge.challenge_type, Challenge.created_at.desc())
        .all()
    )

    result = []
    for c in challenges:
        # Get user's participation
        part = db.query(ChallengeParticipant).filter(
            ChallengeParticipant.challenge_id == c.id,
            ChallengeParticipant.user_id == user_id,
        ).first()

        # Get top 3 solvers for this challenge
        top_solvers = (
            db.query(ChallengeParticipant)
            .filter(
                ChallengeParticipant.challenge_id == c.id,
                ChallengeParticipant.completed == True,
            )
            .order_by(
                ChallengeParticipant.time_taken_s.asc().nullslast()
            )
            .limit(3)
            .all()
        )

        solver_list = []
        for s in top_solvers:
            solver_user = s.user
            if solver_user:
                name = (
                    getattr(solver_user, "name", None)
                    or solver_user.email.split("@")[0]
                )
                solver_list.append({
                    "name": name,
                    "avatar": "".join(w[0].upper() for w in name.split()[:2]),
                    "time": _fmt_seconds(s.time_taken_s),
                    "xp": s.score,
                })

        # Count total participants
        total_participants = db.query(ChallengeParticipant).filter(
            ChallengeParticipant.challenge_id == c.id,
        ).count()

        # Time remaining
        delta = c.ends_at - now
        ends_in = _fmt_timedelta(delta)

        result.append({
            "id": str(c.id),
            "title": c.title,
            "description": c.description,
            "type": c.challenge_type,
            "domain": c.field_tag,
            "difficulty": c.difficulty,
            "xp": c.xp_reward,
            "bonusXp": c.bonus_xp,
            "timeMinutes": c.time_minutes,
            "participants": total_participants,
            "completed": part.completed if part else False,
            "joined": part is not None,
            "endsIn": ends_in,
            "streakImpact": c.streak_impact,
            "battleMode": c.battle_mode,
            "communityMode": c.community_mode,
            "weekendBonus": c.weekend_bonus,
            "topSolvers": solver_list,
            "hints": c.hints or [],
            "tags": c.tags or [],
            "myScore": part.score if part else 0,
            "myTimeTaken": part.time_taken_s if part else None,
        })

    # If no challenges exist for this field, seed some (only attempt once)
    if not result and not _seeded:
        _seed_challenges_for_field(field_key, ob, db)
        return get_challenges_for_user(ob, user_id, db, _seeded=True)

    return result


def join_challenge(challenge_id: UUID, user_id: UUID, db: Session) -> dict:
    existing = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.challenge_id == challenge_id,
        ChallengeParticipant.user_id == user_id,
    ).first()
    if existing:
        return {"status": "already_joined"}

    part = ChallengeParticipant(
        challenge_id=challenge_id,
        user_id=user_id,
        completed=False,
        score=0,
    )
    db.add(part)
    db.commit()
    return {"status": "joined"}


def complete_challenge(
    challenge_id: UUID,
    user_id: UUID,
    time_taken_s: Optional[int],
    db: Session,
) -> dict:
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        return {"error": "Challenge not found"}

    part = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.challenge_id == challenge_id,
        ChallengeParticipant.user_id == user_id,
    ).first()

    if not part:
        part = ChallengeParticipant(
            challenge_id=challenge_id,
            user_id=user_id,
        )
        db.add(part)

    if part.completed:
        return {"status": "already_completed", "xp": part.score}

    # Award XP (base + bonus for fast completion)
    xp = challenge.xp_reward
    if time_taken_s and time_taken_s < challenge.time_minutes * 60 * 0.7:
        xp += challenge.bonus_xp

    part.completed    = True
    part.completed_at = datetime.now(timezone.utc)
    part.score        = xp
    part.time_taken_s = time_taken_s

    db.commit()
    return {"status": "completed", "xp": xp}


# ─────────────────────────────────────────────────────────────────────────────
# Seed challenges for a field when none exist
# ─────────────────────────────────────────────────────────────────────────────

FIELD_CHALLENGE_TEMPLATES: dict[str, list[dict]] = {
    "exam:jee": [
        {
            "title": "JEE Physics — Kinematics Sprint",
            "description": "20 MCQs on kinematics: projectile motion, relative velocity, circular motion. JEE Advanced level.",
            "difficulty": "Hard", "xp": 100, "bonus": 25, "time": 15,
            "tags": ["Physics", "Kinematics", "MCQ"],
            "hints": ["Use v²=u²+2as for constant acceleration", "Break vectors into components"],
        },
        {
            "title": "JEE Chemistry — Organic Reactions",
            "description": "25 IUPAC naming + reaction mechanism questions. Focus on named reactions and mechanisms.",
            "difficulty": "Hard", "xp": 95, "bonus": 20, "time": 20,
            "tags": ["Chemistry", "Organic", "Mechanisms"],
            "hints": ["Markovnikov's rule applies for ionic addition", "SN2 has inversion of configuration"],
        },
        {
            "title": "JEE Maths — Calculus Challenge",
            "description": "15 integration and differentiation problems ranging from definite integrals to differential equations.",
            "difficulty": "Expert", "xp": 110, "bonus": 30, "time": 30,
            "tags": ["Maths", "Calculus", "Integration"],
            "hints": ["Try substitution first", "Integration by parts: ∫udv = uv - ∫vdu"],
        },
    ],
    "exam:neet": [
        {
            "title": "NEET Biology — Cell Division Deep Dive",
            "description": "30 NCERT-level MCQs on mitosis and meiosis. Focus on phases, genetic outcomes, and significance.",
            "difficulty": "Medium", "xp": 90, "bonus": 20, "time": 20,
            "tags": ["Biology", "Cell Division", "NCERT"],
            "hints": ["Meiosis I separates homologs", "G2 phase precedes mitosis"],
        },
        {
            "title": "NEET Chemistry — Equilibrium & pH",
            "description": "20 problems on chemical equilibrium, Le Chatelier's principle, and pH calculations.",
            "difficulty": "Hard", "xp": 100, "bonus": 25, "time": 25,
            "tags": ["Chemistry", "Equilibrium", "Calculations"],
            "hints": ["Kw = Ka × Kb = 10⁻¹⁴ at 25°C", "Buffer solutions resist pH changes"],
        },
        {
            "title": "NEET Physics — Current Electricity",
            "description": "25 MCQs covering Ohm's law, Kirchhoff's laws, Wheatstone bridge, and meters.",
            "difficulty": "Medium", "xp": 85, "bonus": 20, "time": 20,
            "tags": ["Physics", "Electricity", "Circuits"],
            "hints": ["Kirchhoff's current law: sum of currents at node = 0"],
        },
    ],
    "exam:upsc": [
        {
            "title": "UPSC Polity — Fundamental Rights Sprint",
            "description": "25 statement-based MCQs on Articles 12-35. UPSC Prelims pattern. SC interpretation focus.",
            "difficulty": "Hard", "xp": 95, "bonus": 25, "time": 20,
            "tags": ["Polity", "Fundamental Rights", "MCQ"],
            "hints": ["Art. 32 gives right to constitutional remedies", "Art. 19 has reasonable restrictions"],
        },
        {
            "title": "UPSC Current Affairs Weekly",
            "description": "30 questions on current events from the past 7 days: national, international, economy, environment.",
            "difficulty": "Medium", "xp": 85, "bonus": 15, "time": 25,
            "tags": ["Current Affairs", "GK", "Weekly"],
            "hints": ["Cover The Hindu editorials daily", "Focus on government schemes and reports"],
        },
        {
            "title": "UPSC History — Modern India",
            "description": "20 MCQs on the freedom movement, social reforms, and important personalities 1857-1947.",
            "difficulty": "Medium", "xp": 80, "bonus": 20, "time": 20,
            "tags": ["History", "Modern India", "Freedom Movement"],
            "hints": ["Non-Cooperation movement was 1920-22", "Gandhi-Irwin Pact was 1931"],
        },
    ],
    "student:cs": [
        {
            "title": "Two Sum — LeetCode Style",
            "description": "Given an array of integers and a target, return indices of two numbers that sum to target. O(n) required.",
            "difficulty": "Medium", "xp": 80, "bonus": 20, "time": 25,
            "tags": ["Arrays", "Hash Map", "DSA"],
            "hints": ["Think hash map for O(n)", "What complement do you need?"],
        },
        {
            "title": "Build a REST API Endpoint",
            "description": "Design and implement a RESTful user authentication endpoint with JWT. Include registration, login, and /me.",
            "difficulty": "Hard", "xp": 100, "bonus": 25, "time": 45,
            "tags": ["Backend", "API", "JWT", "REST"],
            "hints": ["Use bcrypt for password hashing", "JWT should include user_id and expiry"],
        },
        {
            "title": "System Design — URL Shortener",
            "description": "Design a URL shortener like bit.ly. Explain data model, API design, and scalability approach.",
            "difficulty": "Hard", "xp": 110, "bonus": 30, "time": 30,
            "tags": ["System Design", "Scalability", "Database"],
            "hints": ["Use base62 encoding for short codes", "Consider cache layer for popular URLs"],
        },
    ],
    "student:medical": [
        {
            "title": "Anatomy — Upper Limb Muscles",
            "description": "Identify origins, insertions, actions and innervations of 15 key upper limb muscles.",
            "difficulty": "Hard", "xp": 90, "bonus": 20, "time": 30,
            "tags": ["Anatomy", "Upper Limb", "Muscles"],
            "hints": ["Rotator cuff: SITS (Supraspinatus, Infraspinatus, Teres minor, Subscapularis)"],
        },
        {
            "title": "Biochemistry — Krebs Cycle",
            "description": "30 MCQs on the citric acid cycle: intermediates, enzymes, energy yield, and regulation.",
            "difficulty": "Medium", "xp": 85, "bonus": 20, "time": 25,
            "tags": ["Biochemistry", "Metabolism", "Krebs Cycle"],
            "hints": ["TCA produces 3 NADH, 1 FADH2, 1 GTP per cycle"],
        },
    ],
    "student:commerce": [
        {
            "title": "Accounting — Trial Balance Challenge",
            "description": "Prepare a trial balance from 20 ledger entries including adjustments for depreciation and provisions.",
            "difficulty": "Medium", "xp": 80, "bonus": 15, "time": 30,
            "tags": ["Accounting", "Trial Balance", "Ledger"],
            "hints": ["Debit: Assets, Expenses, Losses", "Credit: Liabilities, Income, Gains"],
        },
        {
            "title": "Economics — GDP and National Income",
            "description": "25 MCQs on national income concepts, GDP calculation methods, and macroeconomic indicators.",
            "difficulty": "Medium", "xp": 75, "bonus": 15, "time": 20,
            "tags": ["Economics", "GDP", "Macro"],
            "hints": ["GDP = C + I + G + (X-M)", "GNP = GDP + Net Factor Income from Abroad"],
        },
    ],
    "freelancer": [  # Generic freelancer
        {
            "title": "Write a Winning Upwork Proposal",
            "description": "Craft a compelling Upwork proposal for a web development project. Include opening, approach, timeline, CTA.",
            "difficulty": "Medium", "xp": 70, "bonus": 15, "time": 20,
            "tags": ["Freelancing", "Proposal Writing", "Client Communication"],
            "hints": ["Start with their problem, not your skills", "Keep it under 200 words"],
        },
        {
            "title": "Client Discovery Call Script",
            "description": "Write a complete 15-minute discovery call script to qualify clients and understand project scope.",
            "difficulty": "Medium", "xp": 75, "bonus": 15, "time": 25,
            "tags": ["Freelancing", "Sales", "Client Management"],
            "hints": ["Ask about budget early", "Understand timeline and decision makers"],
        },
    ],
    "entrepreneur": [
        {
            "title": "1-Page Business Model Canvas",
            "description": "Complete a Business Model Canvas for your current/planned startup. Fill all 9 blocks with specific details.",
            "difficulty": "Hard", "xp": 100, "bonus": 25, "time": 45,
            "tags": ["Startup", "Strategy", "Business Model"],
            "hints": ["Value Proposition is the core", "Map customer segments before channels"],
        },
        {
            "title": "5 Customer Discovery Interviews",
            "description": "Conduct 5 customer discovery calls this week. Document pain points, willingness to pay, and insights.",
            "difficulty": "Expert", "xp": 120, "bonus": 30, "time": 60,
            "tags": ["Startup", "Customer Research", "Validation"],
            "hints": ["Ask about past behavior, not hypotheticals", "Mom test: don't mention your idea"],
        },
    ],
    "creator": [
        {
            "title": "Post 3 Pieces of Content Today",
            "description": "Create and publish 3 pieces of content across your platforms. At least 1 should be a video/reel.",
            "difficulty": "Medium", "xp": 80, "bonus": 20, "time": 120,
            "tags": ["Content Creation", "Consistency", "Social Media"],
            "hints": ["Batch create for efficiency", "Repurpose long-form into short clips"],
        },
        {
            "title": "Viral Hook Writing Challenge",
            "description": "Write 10 scroll-stopping hooks for Instagram Reels or YouTube Shorts. A/B testable, under 15 words each.",
            "difficulty": "Medium", "xp": 70, "bonus": 15, "time": 30,
            "tags": ["Copywriting", "Hook Writing", "Short Form"],
            "hints": ["Start with curiosity gap or bold claim", "Use numbers and specificity"],
        },
    ],
}


def _seed_challenges_for_field(field_key: str, ob: Optional[UserOnboarding], db: Session) -> None:
    """
    Seed default challenges for a field if none exist.
    Looks for exact match first, then prefix match (e.g. "freelancer:web" → "freelancer"),
    then falls back to universal.
    """
    templates = (
        FIELD_CHALLENGE_TEMPLATES.get(field_key)
        or FIELD_CHALLENGE_TEMPLATES.get(field_key.split(":")[0] if ":" in field_key else field_key)
        or []
    )

    now = datetime.now(timezone.utc)

    for t in templates:
        # Check if already seeded
        existing = db.query(Challenge).filter(
            Challenge.field_tag == field_key,
            Challenge.title == t["title"],
        ).first()
        if existing:
            continue

        challenge = Challenge(
            title=t["title"],
            description=t["description"],
            hints=t.get("hints", []),
            tags=t.get("tags", []),
            field_tag=field_key,
            difficulty=t.get("difficulty", "Medium"),
            challenge_type="daily",
            xp_reward=t.get("xp", 80),
            bonus_xp=t.get("bonus", 20),
            time_minutes=t.get("time", 25),
            streak_impact=True,
            starts_at=now,
            ends_at=now + timedelta(hours=24),
            is_active=True,
            ai_generated=False,
        )
        db.add(challenge)

    # Also seed universal challenges if missing
    for t in FIELD_CHALLENGE_TEMPLATES.get("all", []):
        existing = db.query(Challenge).filter(
            Challenge.field_tag == "all",
            Challenge.title == t["title"],
        ).first()
        if not existing:
            challenge = Challenge(
                title=t["title"],
                description=t["description"],
                hints=t.get("hints", []),
                tags=t.get("tags", []),
                field_tag="all",
                difficulty=t.get("difficulty", "Medium"),
                challenge_type="weekly",
                xp_reward=t.get("xp", 100),
                bonus_xp=t.get("bonus", 25),
                time_minutes=t.get("time", 30),
                streak_impact=True,
                starts_at=now,
                ends_at=now + timedelta(days=7),
                is_active=True,
                ai_generated=False,
            )
            db.add(challenge)

    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Formatting helpers
# ─────────────────────────────────────────────────────────────────────────────

def _fmt_seconds(s: Optional[int]) -> str:
    if s is None:
        return "—"
    m, sec = divmod(s, 60)
    return f"{m}m {sec:02d}s"


def _fmt_timedelta(d: timedelta) -> str:
    total_s = int(d.total_seconds())
    if total_s <= 0:
        return "Expired"
    hours, rem = divmod(total_s, 3600)
    minutes, _ = divmod(rem, 60)
    if hours >= 24:
        days = hours // 24
        return f"{days}d {hours % 24}h"
    return f"{hours}h {minutes}m"
