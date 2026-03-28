"""
services/streak_service.py
All streak and skill progress logic.
Uses SQLAlchemy session — same pattern as rest of your app.
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session
from Backend.models.practice import UserStreak, UserSkillProgress
from uuid import UUID


def get_or_create_streak(user_id, db: Session) -> UserStreak:
    """Get streak row, creating it if it doesn't exist."""
    row = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    if not row:
        row = UserStreak(
            user_id            = user_id,
            current_streak     = 0,
            longest_streak     = 0,
            last_practice_date = None,
            practiced_today    = False,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_streak(user_id, db: Session) -> dict:
    """
    Call this when a user completes a practice session.
    Returns the updated streak state.

    Logic:
    - If last_practice_date == yesterday → streak += 1
    - If last_practice_date == today → no change (already counted)
    - Anything else → reset to 1
    """
    row     = get_or_create_streak(user_id, db)
    today   = date.today()
    yesterday = today - timedelta(days=1)

    last = row.last_practice_date
    streak_updated = False

    if last == today:
        # Already practiced today — don't double count
        return {
            "current_streak":  row.current_streak,
            "longest_streak":  row.longest_streak,
            "practiced_today": True,
            "streak_updated":  False,
        }
    elif last == yesterday:
        # Consecutive day
        row.current_streak += 1
        streak_updated = True
    else:
        # Missed at least one day, or first time
        row.current_streak = 1
        streak_updated = True

    row.longest_streak     = max(row.longest_streak, row.current_streak)
    row.last_practice_date = today
    row.practiced_today    = True

    db.commit()
    db.refresh(row)

    return {
        "current_streak":  row.current_streak,
        "longest_streak":  row.longest_streak,
        "practiced_today": True,
        "streak_updated":  streak_updated,
    }


def increment_skill_progress(user_id, topic: str, delta: int, db: Session) -> dict:
    """
    Add `delta` percent to user's progress for `topic`.
    Caps at 100.
    """
    row = (
        db.query(UserSkillProgress)
        .filter(UserSkillProgress.user_id == user_id, UserSkillProgress.topic == topic)
        .first()
    )

    if row:
        old_pct         = row.progress_pct
        row.progress_pct= min(100, row.progress_pct + delta)
        db.commit()
        return {"topic": topic, "old_pct": old_pct, "new_pct": row.progress_pct, "delta": delta}
    else:
        new_row = UserSkillProgress(user_id=user_id, topic=topic, progress_pct=delta)
        db.add(new_row)
        db.commit()
        return {"topic": topic, "old_pct": 0, "new_pct": delta, "delta": delta}


       


def get_streak(db: Session, user_id: UUID):
    """
    Returns the user's current streak.
    If none exists, create one.
    """

    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()

    if not streak:
        streak = UserStreak(
            user_id=user_id,
            current_streak=0
        )
        db.add(streak)
        db.commit()
        db.refresh(streak)

    return streak