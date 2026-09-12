"""
routers/leaderboard.py

Endpoints:
  GET  /leaderboard/              — ranked users in the requesting user's field
  GET  /leaderboard/me            — current user's rank + stats
  GET  /leaderboard/events/stream — SSE stream of live leaderboard events
  POST /leaderboard/xp/add        — award XP (internal use / practice/challenge hooks)
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from Backend.auth import get_current_user
from Backend.db.session import get_db
from Backend.models.onboarding import UserOnboarding
from Backend.models.user import User
from Backend.models.leaderboard import UserXP, LeaderboardEvent
from Backend.services.leaderboard_service import (
    get_user_field,
    get_field_leaderboard,
    compute_user_score,
    award_xp,
    get_user_batch,
)

router = APIRouter(tags=["Leaderboard"])


# ─────────────────────────────────────────────────────────────────────────────
# GET /leaderboard/
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/")
def get_leaderboard(
    period: str = Query("alltime", enum=["daily", "weekly", "monthly", "alltime"]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    field_key = get_user_field(ob)

    ranked = get_field_leaderboard(field_key, db, period=period)

    # Mark the current user
    for r in ranked:
        r["is_current_user"] = r["user_id"] == str(current_user.id)

    return {
        "field_key": field_key,
        "field_label": _field_label(field_key, ob),
        "period": period,
        "total_users": len(ranked),
        "users": ranked,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /leaderboard/me
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/me")
def get_my_rank(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    field_key = get_user_field(ob)
    batch_key = get_user_batch(ob)

    ranked = get_field_leaderboard(field_key, db)

    my_entry = next((r for r in ranked if r["user_id"] == str(current_user.id)), None)
    if not my_entry:
        # User is in the field but has no activity yet
        stats = compute_user_score(current_user.id, db)
        my_entry = {
            "user_id": str(current_user.id),
            "rank": len(ranked) + 1,
            "score": stats["score"],
            "streak": stats["streak"],
            "longest_streak": stats["longest_streak"],
            "total_correct": stats["total_correct"],
            "challenges_done": stats["challenges_done"],
            "league": "Bronze",
            "badge": None,
        }

    # XP to next rank
    xp_to_next = 0
    my_rank = my_entry.get("rank", 0)
    if my_rank > 1 and len(ranked) >= my_rank - 1:
        above = ranked[my_rank - 2]  # rank is 1-indexed, list is 0-indexed
        xp_to_next = max(0, above["score"] - my_entry["score"])

    return {
        "field_key": field_key,
        "field_label": _field_label(field_key, ob),
        "batch_key": batch_key,
        "rank": my_entry.get("rank"),
        "score": my_entry.get("score", 0),
        "streak": my_entry.get("streak", 0),
        "longest_streak": my_entry.get("longest_streak", 0),
        "league": my_entry.get("league", "Bronze"),
        "badge": my_entry.get("badge"),
        "xp_to_next_rank": xp_to_next,
        "total_users_in_field": len(ranked),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /leaderboard/events/stream  — SSE
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/events/stream")
async def leaderboard_sse(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Server-Sent Events stream that pushes real LeaderboardEvent rows
    for the current user's field, polling every 5 seconds.
    """
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    field_key = get_user_field(ob)
    db.close()

    async def event_generator():
        last_id: Optional[str] = None
        yield f"data: {json.dumps({'type': 'connected', 'field': field_key})}\n\n"

        while True:
            await asyncio.sleep(5)

            # Open fresh db session per poll
            from Backend.db.session import SessionLocal
            session = SessionLocal()
            try:
                q = session.query(LeaderboardEvent).filter(
                    LeaderboardEvent.field_key == field_key,
                    LeaderboardEvent.created_at >= datetime.now(timezone.utc) - timedelta(minutes=2),
                ).order_by(LeaderboardEvent.created_at.desc()).limit(5)

                events = q.all()
                if events:
                    for ev in reversed(events):
                        ev_id = str(ev.id)
                        if ev_id == last_id:
                            break
                        payload = {
                            "type": "event",
                            "id": ev_id,
                            "message": ev.message,
                            "xp": ev.xp_delta,
                            "event_type": ev.event_type,
                            "user_name": ev.user_name,
                            "ts": ev.created_at.isoformat() if ev.created_at else None,
                        }
                        yield f"data: {json.dumps(payload)}\n\n"
                    if events:
                        last_id = str(events[0].id)
                else:
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'msg': str(e)})}\n\n"
            finally:
                session.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /leaderboard/xp/add
# ─────────────────────────────────────────────────────────────────────────────

class XPAddRequest(BaseModel):
    amount: int
    source: str   # "practice" | "challenge" | "streak" | "task" | "manual"


@router.post("/xp/add")
def add_xp(
    body: XPAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    field_key = get_user_field(ob)
    name = (ob.full_name if ob else None) or current_user.name or "User"

    award_xp(
        user_id=current_user.id,
        amount=body.amount,
        source=body.source,
        field_key=field_key,
        user_name=name,
        db=db,
    )
    return {"status": "ok", "xp_added": body.amount, "field": field_key}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

_FIELD_LABELS = {
    "exam:jee":         "JEE Aspirants",
    "exam:neet":        "NEET Aspirants",
    "exam:upsc":        "UPSC Aspirants",
    "exam:gate":        "GATE Aspirants",
    "exam:cat":         "CAT Aspirants",
    "exam:clat":        "CLAT Aspirants",
    "exam:other":       "Exam Aspirants",
    "student:cs":       "CS / Tech Students",
    "student:medical":  "Medical Students",
    "student:commerce": "Commerce Students",
    "student:arts":     "Arts & Humanities",
    "student:law":      "Law Students",
    "student:design":   "Design Students",
    "student:science":  "Science Students",
    "student:electronics": "Electronics Engineers",
    "student:mechanical": "Mechanical Engineers",
    "student:electrical": "Electrical Engineers",
    "student:datascience": "Data Science / AI Students",
    "student:business": "Business Management Students",
    "student:general":  "Students",
    "freelancer:web":   "Web Developers",
    "freelancer:mobile":"Mobile Developers",
    "freelancer:design":"Designers",
    "freelancer:data":  "Data / ML Freelancers",
    "freelancer:content":"Content Writers",
    "freelancer:video": "Video Creators / Editors",
    "freelancer:marketing": "Marketing Freelancers",
    "freelancer:general": "Freelancers",
    "entrepreneur":     "Entrepreneurs & Founders",
    "creator":          "Content Creators",
    "general":          "All Users",
}


def _field_label(field_key: str, ob: Optional[UserOnboarding] = None) -> str:
    return _FIELD_LABELS.get(field_key, field_key.replace(":", " ").title())
