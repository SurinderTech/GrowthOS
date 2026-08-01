from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from Backend.db.session import get_db
from Backend.routers.auth import get_current_user
from Backend.services.streak_service import get_or_create_streak

router = APIRouter()


@router.get("/me")
@router.get("/{user_id}")
def get_user_streak(
    user_id: str = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns current streak state for a user.
    """
    target_id = current_user.id
    row = get_or_create_streak(target_id, db)

    return {
        "user_id": str(target_id),
        "current_streak": row.current_streak,
        "longest_streak": row.longest_streak,
        "last_practice_date": row.last_practice_date.isoformat() if row.last_practice_date else None,
        "practiced_today": row.practiced_today,
    }