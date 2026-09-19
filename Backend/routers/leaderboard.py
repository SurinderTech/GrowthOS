"""
routers/leaderboard.py

v1 endpoints (kept for backward compatibility):
  GET  /leaderboard/              — ranked users in the requesting user's field
  GET  /leaderboard/me            — current user's rank + stats
  GET  /leaderboard/events/stream — SSE stream of live leaderboard events
  POST /leaderboard/xp/add        — award XP (internal use / practice/challenge hooks)

v2 endpoints (new, million-user scale):
  GET  /leaderboard/v2/           — unified: ?scope=global|field|batch|friends&period=weekly|monthly|alltime&page=0
  GET  /leaderboard/v2/me         — current user rank across all 4 scopes
  GET  /leaderboard/v2/around     — people +-5 ranks around current user
  GET  /leaderboard/v2/summary    — quick hero card data
  GET  /leaderboard/v2/champions  — recent weekly champions
  GET  /leaderboard/profile/{user_id} — public user profile
  POST /leaderboard/admin/recompute   — backfill cached scores (admin only)
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
    get_user_batch,
    get_field_label,
    get_batch_label,
    get_field_leaderboard,    # v1 compat
    get_leaderboard,          # v2
    get_my_rank,              # v2
    get_users_around_rank,    # v2
    get_public_user_profile,  # v2
    compute_user_score,
    award_xp,
    sync_user_classification,
    recompute_all_cached_scores,
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
    batch_key = get_user_batch(ob)
    name = (ob.full_name if ob else None) or current_user.name or "User"

    award_xp(
        user_id=current_user.id,
        amount=body.amount,
        source=body.source,
        field_key=field_key,
        batch_key=batch_key,
        user_name=name,
        db=db,
    )
    return {"status": "ok", "xp_added": body.amount, "field": field_key}


# ────────────────────────────────────────────────────────────────────────────────
# V2 — Million-user scale endpoints
# ────────────────────────────────────────────────────────────────────────────────

@router.get("/v2/")
def get_leaderboard_v2(
    scope:   str = Query("batch",   enum=["global", "field", "batch", "friends"]),
    period:  str = Query("weekly",  enum=["weekly", "monthly", "alltime"]),
    page:    int = Query(0, ge=0),
    limit:   int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Unified leaderboard endpoint. SQL RANK() window function. O(log N) per page.
    Default scope=batch, period=weekly — most relevant for the user.
    """
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    field_key = get_user_field(ob)
    batch_key = get_user_batch(ob)

    # Ensure user's classification is synced
    if ob and ob.onboarding_completed:
        sync_user_classification(current_user.id, ob, db)

    scope_key = ""
    if scope == "field":
        scope_key = field_key
    elif scope == "batch":
        scope_key = batch_key

    friend_ids = None
    if scope == "friends":
        from Backend.services.social_service import get_friend_ids
        friend_ids = get_friend_ids(current_user.id, db)

    result = get_leaderboard(
        scope=scope,
        scope_key=scope_key,
        period=period,
        limit=limit,
        offset=page * limit,
        db=db,
        friend_ids=friend_ids,
    )

    # Mark current user
    for u in result["users"]:
        u["is_current_user"] = u["user_id"] == str(current_user.id)

    scope_label = {
        "global": "Global",
        "field":  get_field_label(field_key),
        "batch":  get_batch_label(batch_key),
        "friends": "Friends",
    }.get(scope, scope)

    return {
        **result,
        "scope_key":   scope_key,
        "scope_label": scope_label,
        "field_key":   field_key,
        "batch_key":   batch_key,
        "page":        page,
    }


@router.get("/v2/me")
def get_my_rank_v2(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return current user's rank across all 4 scopes + streaks + score details.
    Powers the hero card at the top of the leaderboard page.
    """
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    field_key = get_user_field(ob)
    batch_key = get_user_batch(ob)

    from Backend.services.social_service import get_friend_ids
    friend_ids = get_friend_ids(current_user.id, db)

    global_rank = get_my_rank(current_user.id, db, scope="global", period="alltime")
    field_rank  = get_my_rank(current_user.id, db, scope="field",  scope_key=field_key, period="alltime")
    batch_rank  = get_my_rank(current_user.id, db, scope="batch",  scope_key=batch_key, period="alltime")
    weekly_rank = get_my_rank(current_user.id, db, scope="batch",  scope_key=batch_key, period="weekly")

    friends_rank = None
    if friend_ids and len(friend_ids) > 1:
        friends_rank = get_my_rank(current_user.id, db, scope="friends", friend_ids=friend_ids, period="alltime")

    xp_row = db.query(UserXP).filter(UserXP.user_id == current_user.id).first()
    stats  = compute_user_score(current_user.id, db)

    score = stats["score"]
    league = _score_to_league(score)
    badge  = _rank_to_badge(global_rank.get("rank") or 999)

    # XP to next rank in batch leaderboard
    xp_to_next = 0
    if batch_rank.get("rank") and batch_rank["rank"] > 1:
        # Fetch the user just above
        above_rows = get_leaderboard(
            scope="batch", scope_key=batch_key, period="alltime",
            limit=1, offset=batch_rank["rank"] - 2, db=db,
        )
        if above_rows["users"]:
            xp_to_next = max(0, above_rows["users"][0]["score"] - score)

    return {
        "user_id":      str(current_user.id),
        "name":         (ob.full_name if ob else None) or current_user.name or "User",
        "score":        score,
        "streak":       stats["streak"],
        "longest_streak": stats["longest_streak"],
        "challenges_done": stats["challenges_done"],
        "total_correct":   stats["total_correct"],
        "league":       league,
        "badge":        badge,
        "xp_to_next_rank": xp_to_next,
        "xp_weekly":    int(xp_row.weekly_xp  if xp_row else 0),
        "xp_monthly":   int(xp_row.monthly_xp if xp_row else 0),
        "xp_total":     int(xp_row.total_xp   if xp_row else 0),
        "ranks": {
            "global":  global_rank,
            "field":   field_rank,
            "batch":   batch_rank,
            "weekly":  weekly_rank,
            "friends": friends_rank,
        },
        "field_key":   field_key,
        "field_label": get_field_label(field_key),
        "batch_key":   batch_key,
        "batch_label": get_batch_label(batch_key),
    }


@router.get("/v2/around")
def get_around_me(
    scope:  str = Query("batch", enum=["global", "field", "batch", "friends"]),
    period: str = Query("alltime", enum=["weekly", "monthly", "alltime"]),
    radius: int = Query(5, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns ±radius users around the current user in the given scope.
    Powers the "People Around You" section. Single SQL CTE query.
    """
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    field_key = get_user_field(ob)
    batch_key = get_user_batch(ob)

    scope_key = field_key if scope == "field" else batch_key if scope == "batch" else ""

    friend_ids = None
    if scope == "friends":
        from Backend.services.social_service import get_friend_ids
        friend_ids = get_friend_ids(current_user.id, db)

    users = get_users_around_rank(
        user_id=current_user.id,
        db=db,
        scope=scope,
        scope_key=scope_key,
        period=period,
        radius=radius,
        friend_ids=friend_ids,
    )

    for u in users:
        u["is_current_user"] = u["user_id"] == str(current_user.id)

    return {"users": users, "scope": scope, "period": period, "radius": radius}


@router.get("/profile/{target_user_id}")
def get_user_profile(
    target_user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Public profile shown when clicking on any player.
    Includes: name, streak, score, league, ranks across scopes, arena stats, 
    friend status, badges, weekly wins, post count, member since.
    """
    profile = get_public_user_profile(target_user_id, current_user.id, db)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@router.get("/v2/champions")
def get_weekly_champions(
    scope_key: str = Query(""),
    limit: int = Query(3, le=10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recent weekly champions for a given scope (defaults to user's batch).
    """
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    if not scope_key:
        scope_key = f"batch:{get_user_batch(ob)}" if ob else "global"

    from Backend.models.leaderboard_history import WeeklyLeaderboardSnapshot
    snaps = (
        db.query(WeeklyLeaderboardSnapshot)
        .filter(
            WeeklyLeaderboardSnapshot.scope == scope_key,
            WeeklyLeaderboardSnapshot.rank == 1,
        )
        .order_by(WeeklyLeaderboardSnapshot.week_start.desc())
        .limit(limit)
        .all()
    )

    champions = [{
        "week_start": s.week_start,
        "week_end":   s.week_end,
        "user_id":    str(s.user_id) if s.user_id else None,
        "name":       s.user_name,
        "image":      s.user_image,
        "score":      s.score,
    } for s in snaps]

    return {"champions": champions, "scope_key": scope_key}


@router.post("/admin/recompute")
def admin_recompute_scores(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Backfill cached_score + field_key + batch_key for all users.
    Safe to call at any time. Returns count of users updated.
    """
    updated = recompute_all_cached_scores(db)
    return {"status": "ok", "users_updated": updated}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _score_to_league(score: int) -> str:
    if score >= 9500: return "Silicon"
    if score >= 8500: return "Elite"
    if score >= 6000: return "Gold"
    if score >= 3000: return "Silver"
    return "Bronze"


def _rank_to_badge(rank: int) -> Optional[str]:
    if rank == 1:  return "Legend"
    if rank == 2:  return "Elite Builder"
    if rank <= 5:  return "Top 5%"
    if rank <= 10: return "Top 10%"
    return None


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
