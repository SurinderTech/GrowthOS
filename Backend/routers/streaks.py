# app/routers/streaks.py
# GET /streaks/{user_id}  → get current streak status

from fastapi import APIRouter, HTTPException
from models.schemas import StreakStatus
from services.streak_service import get_streak
from datetime import date

router = APIRouter()


@router.get("/{user_id}", response_model=StreakStatus)
def get_user_streak(user_id: str):
    """
    Returns current streak state for a user.
    Frontend uses this to show the streak badge.
    """
    row = get_streak(user_id)

    last_date = row.get("last_practice_date")
    practiced_today = False
    if last_date:
        if isinstance(last_date, str):
            last_date = date.fromisoformat(last_date)
        practiced_today = last_date == date.today()

    return StreakStatus(
        user_id=user_id,
        current_streak=row.get("current_streak", 0),
        longest_streak=row.get("longest_streak", 0),
        last_practice_date=last_date,
        practiced_today=practiced_today,
    )