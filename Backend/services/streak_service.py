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
    """
    Get streak row, creating it if missing, and sync date boundary & expiration.
    Ensures current_streak and practiced_today are always accurate when fetched anywhere.
    """
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

    today     = date.today()
    yesterday = today - timedelta(days=1)
    last      = row.last_practice_date

    changed = False

    if last is None:
        if row.current_streak != 0 or row.practiced_today:
            row.current_streak = 0
            row.practiced_today = False
            changed = True
    elif last == today:
        if not row.practiced_today:
            row.practiced_today = True
            changed = True
    elif last == yesterday:
        # Practiced yesterday — streak is active from yesterday, but NOT practiced today yet
        if row.practiced_today:
            row.practiced_today = False
            changed = True
    else:
        # Missed at least 1 day — streak broken, reset current_streak to 0
        if row.current_streak != 0 or row.practiced_today:
            row.current_streak = 0
            row.practiced_today = False
            changed = True

    # Keep longest_streak accurately updated
    if row.current_streak > row.longest_streak:
        row.longest_streak = row.current_streak
        changed = True

    if changed:
        db.commit()
        db.refresh(row)

    return row


def update_streak(user_id, db: Session) -> dict:
    """
    Call this when a user completes any practice question or daily task.
    Returns the updated streak state.
    """
    row       = get_or_create_streak(user_id, db)
    today     = date.today()
    yesterday = today - timedelta(days=1)

    last = row.last_practice_date
    streak_updated = False

    if last == today:
        # Already practiced today — preserve streak
        return {
            "current_streak":  row.current_streak,
            "longest_streak":  row.longest_streak,
            "practiced_today": True,
            "streak_updated":  False,
        }

    if last == yesterday:
        # Consecutive day!
        row.current_streak += 1
        streak_updated = True
    else:
        # First time or missed day(s)
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


def get_streak(user_id, db: Session) -> UserStreak:
    """
    Returns synchronized UserStreak for user.
    """
    return get_or_create_streak(user_id, db)