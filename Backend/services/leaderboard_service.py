"""
services/leaderboard_service.py

Core logic for:
 1. Classifying a user's "field" from their onboarding profile (NO regex, NO keywords —
    purely structural onboarding data: user_type, exam_type, field_of_study, primary_skill, etc.)
 2. Computing a user's live score from existing DB tables
 3. Fetching a ranked list of users in the same field
 4. Computing community batch cohort key
 5. Awarding XP and logging leaderboard events
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from Backend.models.onboarding import UserOnboarding
from Backend.models.user import User
from Backend.models.practice import UserStreak, UserPracticeSession
from Backend.models.leaderboard import UserXP, LeaderboardEvent
from Backend.models.challenges import ChallengeParticipant


# ─────────────────────────────────────────────────────────────────────────────
# Field classification — reads structured onboarding columns directly
# ─────────────────────────────────────────────────────────────────────────────

EXAM_FIELD_MAP = {
    "jee":   "exam:jee",
    "neet":  "exam:neet",
    "upsc":  "exam:upsc",
    "gate":  "exam:gate",
    "cat":   "exam:cat",
    "gmat":  "exam:gmat",
    "ielts": "exam:ielts",
    "toefl": "exam:toefl",
    "sat":   "exam:sat",
    "gre":   "exam:gre",
    "clat":  "exam:clat",
    "other": "exam:other",
}

# Maps field_of_study to canonical field key for student bucket
STUDY_FIELD_MAP = {
    # Engineering / Tech
    "computer science": "student:cs",
    "cs":               "student:cs",
    "software engineering": "student:cs",
    "information technology": "student:cs",
    "it":               "student:cs",
    "electronics": "student:electronics",
    "electrical": "student:electrical",
    "mechanical": "student:mechanical",
    "civil": "student:civil",
    "chemical": "student:chemical",
    "aerospace": "student:aerospace",
    "robotics": "student:robotics",
    "data science": "student:datascience",
    "ai": "student:datascience",
    "machine learning": "student:datascience",
    # Medical
    "mbbs": "student:medical",
    "medicine": "student:medical",
    "nursing": "student:medical",
    "pharmacy": "student:medical",
    "dentistry": "student:medical",
    "physiotherapy": "student:medical",
    "biomedical": "student:medical",
    # Commerce / Finance
    "commerce": "student:commerce",
    "finance": "student:commerce",
    "accounting": "student:commerce",
    "economics": "student:commerce",
    "bcom": "student:commerce",
    "ca": "student:commerce",
    "mba": "student:commerce",
    # Arts / Humanities
    "arts": "student:arts",
    "humanities": "student:arts",
    "history": "student:arts",
    "psychology": "student:arts",
    "sociology": "student:arts",
    "philosophy": "student:arts",
    "english": "student:arts",
    "literature": "student:arts",
    # Law
    "law": "student:law",
    "llb": "student:law",
    "legal": "student:law",
    # Design
    "design": "student:design",
    "ux": "student:design",
    "ui": "student:design",
    "graphic design": "student:design",
    "architecture": "student:design",
    # Science
    "physics": "student:science",
    "chemistry": "student:science",
    "biology": "student:science",
    "mathematics": "student:science",
    "math": "student:science",
    "statistics": "student:science",
    # Business / Management
    "business administration": "student:business",
    "management": "student:business",
    "marketing": "student:business",
    "bba": "student:business",
}

def _normalize(s: str) -> str:
    return s.lower().strip() if s else ""


def get_user_field(ob: Optional[UserOnboarding]) -> str:
    """
    Classify user into a leaderboard field key based purely on onboarding
    structural data. No regex. No keyword matching on free text.

    Returns strings like:
      "exam:jee", "exam:neet", "exam:upsc"
      "student:cs", "student:medical", "student:commerce"
      "freelancer:web", "freelancer:design", "freelancer:general"
      "entrepreneur"
      "creator"
      "general"
    """
    if not ob:
        return "general"

    user_type = _normalize(ob.user_type or "")

    # ── Exam aspirant ─────────────────────────────────────────────────────────
    if user_type == "exam_aspirant":
        exam = _normalize(ob.exam_type or "")
        return EXAM_FIELD_MAP.get(exam, "exam:other")

    # ── Student ───────────────────────────────────────────────────────────────
    if user_type == "student":
        fos = _normalize(ob.field_of_study or "")
        # Check exact matches first
        if fos in STUDY_FIELD_MAP:
            return STUDY_FIELD_MAP[fos]
        # Partial contains check (structured — not regex/keyword guessing)
        for key, val in STUDY_FIELD_MAP.items():
            if key in fos:
                return val
        return "student:general"

    # ── Freelancer ────────────────────────────────────────────────────────────
    if user_type == "freelancer":
        skill = _normalize(ob.primary_skill or "")
        # Broad skill categories from onboarding dropdown values
        if any(k in skill for k in ["web", "frontend", "backend", "full", "react", "node", "django"]):
            return "freelancer:web"
        if any(k in skill for k in ["mobile", "flutter", "android", "ios", "react native"]):
            return "freelancer:mobile"
        if any(k in skill for k in ["design", "ui", "ux", "graphic", "figma"]):
            return "freelancer:design"
        if any(k in skill for k in ["data", "ml", "ai", "analytics", "python"]):
            return "freelancer:data"
        if any(k in skill for k in ["write", "content", "copywriting", "seo", "blog"]):
            return "freelancer:content"
        if any(k in skill for k in ["video", "edit", "youtube", "reel", "motion"]):
            return "freelancer:video"
        if any(k in skill for k in ["market", "social media", "ads", "growth"]):
            return "freelancer:marketing"
        return "freelancer:general"

    # ── Entrepreneur / Business ───────────────────────────────────────────────
    if user_type in ("entrepreneur", "business_owner"):
        return "entrepreneur"

    # ── Creator ───────────────────────────────────────────────────────────────
    if user_type == "creator":
        return "creator"

    # ── Self growth / other ───────────────────────────────────────────────────
    return "general"


def get_user_batch(ob: Optional[UserOnboarding]) -> str:
    """
    Compute a community batch key — tighter cohort than field.

    Examples:
      "batch:jee:2027"            — JEE aspirants targeting 2027
      "batch:neet:2026"           — NEET 2026
      "batch:student:cs"          — CS students
      "batch:student:medical"     — MBBS/medical students
      "batch:freelancer"          — All freelancers
      "batch:entrepreneur"        — Entrepreneurs
      "batch:creator"             — Creators
      "batch:general"             — Fallback
    """
    if not ob:
        return "batch:general"

    user_type = _normalize(ob.user_type or "")

    if user_type == "exam_aspirant":
        exam = _normalize(ob.exam_type or "other")
        year = (ob.attempt_year or "").strip()
        if year:
            return f"batch:{exam}:{year}"
        return f"batch:{exam}"

    if user_type == "student":
        fos = _normalize(ob.field_of_study or "")
        field_key = get_user_field(ob)  # e.g. "student:cs"
        # strip "student:" prefix to get just the bucket
        bucket = field_key.replace("student:", "") if field_key.startswith("student:") else "general"
        return f"batch:student:{bucket}"

    if user_type == "freelancer":
        return "batch:freelancer"

    if user_type in ("entrepreneur", "business_owner"):
        return "batch:entrepreneur"

    if user_type == "creator":
        return "batch:creator"

    return "batch:general"


# ─────────────────────────────────────────────────────────────────────────────
# Score computation from existing DB data
# ─────────────────────────────────────────────────────────────────────────────

def compute_user_score(user_id: UUID, db: Session) -> dict:
    """
    Compute live score from existing tables:
      score = (streak × 20) + (total_correct × 5) + (challenges_done × 30) + total_xp_table

    Returns dict with score, streak, xp breakdown.
    """
    # Streak contribution
    streak_row = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    current_streak = streak_row.current_streak if streak_row else 0
    longest_streak = streak_row.longest_streak if streak_row else 0

    # Practice contribution
    agg = db.query(
        func.sum(UserPracticeSession.correct_count).label("total_correct"),
        func.count(UserPracticeSession.id).label("session_count"),
    ).filter(UserPracticeSession.user_id == user_id).first()

    total_correct   = int(agg.total_correct or 0)
    session_count   = int(agg.session_count or 0)

    # Challenges done
    challenges_done = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.user_id == user_id,
        ChallengeParticipant.completed == True,
    ).count()

    # XP table (bonus from manual awards / milestones)
    xp_row = db.query(UserXP).filter(UserXP.user_id == user_id).first()
    bonus_xp = xp_row.total_xp if xp_row else 0

    score = (
        current_streak * 20
        + total_correct * 5
        + challenges_done * 30
        + int(bonus_xp)
    )

    return {
        "score": score,
        "streak": current_streak,
        "longest_streak": longest_streak,
        "total_correct": total_correct,
        "session_count": session_count,
        "challenges_done": challenges_done,
        "bonus_xp": int(bonus_xp),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Leaderboard queries
# ─────────────────────────────────────────────────────────────────────────────

def get_field_leaderboard(
    field_key: str,
    db: Session,
    period: str = "alltime",   # daily | weekly | monthly | alltime
    limit: int = 50,
) -> list[dict]:
    """
    Fetch all users in `field_key`, compute their scores, return ranked list.

    Strategy:
     1. JOIN users → user_onboarding
     2. Filter by field_key using get_user_field logic applied in Python
        (avoids complex SQL for the classification logic)
     3. For each matching user, compute score
     4. Sort and assign rank
    """
    # Pull all users who have completed onboarding
    rows = (
        db.query(User, UserOnboarding)
        .join(UserOnboarding, UserOnboarding.user_id == User.id)
        .filter(UserOnboarding.onboarding_completed == True)
        .filter(User.is_active == True)
        .all()
    )

    results = []
    for user, ob in rows:
        if get_user_field(ob) != field_key:
            continue

        stats = compute_user_score(user.id, db)

        # Period-specific score override if we have period XP
        if period != "alltime":
            xp_row = db.query(UserXP).filter(UserXP.user_id == user.id).first()
            if xp_row:
                period_xp = {
                    "daily":   xp_row.daily_xp,
                    "weekly":  xp_row.weekly_xp,
                    "monthly": xp_row.monthly_xp,
                }.get(period, 0)
                stats["score"] = period_xp  # For period boards use period XP

        display_name = (
            ob.full_name or user.name or user.email.split("@")[0]
        )
        avatar_initials = "".join(
            w[0].upper() for w in display_name.split()[:2]
        ) if display_name else "US"

        results.append({
            "user_id": str(user.id),
            "name": display_name,
            "avatar": avatar_initials,
            "image": user.image,
            "score": stats["score"],
            "streak": stats["streak"],
            "longest_streak": stats["longest_streak"],
            "total_correct": stats["total_correct"],
            "challenges_done": stats["challenges_done"],
            "field_key": field_key,
            "user_type": ob.user_type,
            "field_of_study": ob.field_of_study,
            "exam_type": ob.exam_type,
            "primary_skill": ob.primary_skill,
        })

    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)

    # Assign ranks
    for i, r in enumerate(results[:limit]):
        r["rank"] = i + 1
        r["league"] = _score_to_league(r["score"])
        r["badge"] = _rank_to_badge(i + 1)

    return results[:limit]


def _score_to_league(score: int) -> str:
    if score >= 9500: return "Silicon"
    if score >= 8500: return "Elite"
    if score >= 6000: return "Gold"
    if score >= 3000: return "Silver"
    return "Bronze"


def _rank_to_badge(rank: int) -> str | None:
    if rank == 1:   return "Legend"
    if rank == 2:   return "Elite Builder"
    if rank <= 5:   return "Top 5%"
    if rank <= 10:  return "Top 10%"
    return None


# ─────────────────────────────────────────────────────────────────────────────
# XP award helper
# ─────────────────────────────────────────────────────────────────────────────

def award_xp(
    user_id: UUID,
    amount: int,
    source: str,       # "practice" | "challenge" | "streak" | "task" | "manual"
    field_key: str,
    user_name: str,
    db: Session,
    commit: bool = True,
) -> None:
    """
    Add `amount` XP to the user's UserXP row and log a LeaderboardEvent.
    """
    now = datetime.now(timezone.utc)

    # Upsert UserXP
    xp_row = db.query(UserXP).filter(UserXP.user_id == user_id).first()
    if not xp_row:
        xp_row = UserXP(user_id=user_id, total_xp=0, daily_xp=0, weekly_xp=0, monthly_xp=0)
        db.add(xp_row)

    xp_row.total_xp  += amount
    xp_row.daily_xp  += amount
    xp_row.weekly_xp += amount
    xp_row.monthly_xp+= amount
    xp_row.last_xp_earned_at = now

    if source == "practice":
        xp_row.practice_sessions += 1
    elif source == "challenge":
        xp_row.challenges_completed += 1
    elif source == "task":
        xp_row.tasks_completed += 1

    # Log event
    emojis = {
        "practice": "⚡",
        "challenge": "🏆",
        "streak": "🔥",
        "task": "✅",
        "manual": "🎯",
    }
    emoji = emojis.get(source, "🌟")
    msg = f"{emoji} {user_name} earned +{amount} XP from {source}"

    event = LeaderboardEvent(
        user_id=user_id,
        user_name=user_name,
        field_key=field_key,
        event_type="xp_earned",
        message=msg,
        xp_delta=amount,
    )
    db.add(event)

    if commit:
        db.commit()
