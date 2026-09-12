"""
routers/community.py

Endpoints:
  GET  /community/batch          — current user's batch info
  GET  /community/members        — same-batch members with rank/streak
  GET  /community/feed           — paginated batch posts
  POST /community/post           — create a post
  POST /community/post/{id}/react — react to a post
  GET  /community/events/stream  — SSE live activity feed
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
from Backend.models.user import User
from Backend.models.onboarding import UserOnboarding
from Backend.models.community import CommunityPost, CommunityReaction
from Backend.models.leaderboard import LeaderboardEvent
from Backend.services.leaderboard_service import (
    get_user_field,
    get_user_batch,
)
from Backend.services.community_service import (
    get_batch_members,
    get_batch_feed,
    create_post,
    toggle_reaction,
)

router = APIRouter(tags=["Community"])


# ─────────────────────────────────────────────────────────────────────────────
# GET /community/batch
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/batch")
def get_my_batch(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    field_key = get_user_field(ob)
    batch_key = get_user_batch(ob)

    # Count batch members
    all_members = get_batch_members(batch_key, current_user.id, db, limit=500)

    return {
        "batch_key": batch_key,
        "batch_label": _batch_label(batch_key, ob),
        "field_key": field_key,
        "member_count": len(all_members),
        "description": _batch_description(batch_key, ob),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /community/members
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/members")
def get_members(
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    batch_key = get_user_batch(ob)
    members = get_batch_members(batch_key, current_user.id, db, limit=limit)
    return {
        "batch_key": batch_key,
        "batch_label": _batch_label(batch_key, ob),
        "members": members,
        "total": len(members),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /community/feed
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/feed")
def get_feed(
    page: int = Query(0, ge=0),
    page_size: int = Query(20, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    batch_key = get_user_batch(ob)
    posts = get_batch_feed(batch_key, db, page=page, page_size=page_size)
    return {
        "batch_key": batch_key,
        "posts": posts,
        "page": page,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /community/post
# ─────────────────────────────────────────────────────────────────────────────

class PostRequest(BaseModel):
    content: str
    post_type: str = "text"   # text | achievement | milestone | challenge


@router.post("/post")
def create_community_post(
    body: PostRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(body.content.strip()) < 3:
        raise HTTPException(status_code=400, detail="Post content too short")
    if len(body.content) > 1000:
        raise HTTPException(status_code=400, detail="Post too long (max 1000 chars)")

    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    batch_key = get_user_batch(ob)
    field_key = get_user_field(ob)

    post = create_post(
        user_id=current_user.id,
        batch_key=batch_key,
        content=body.content,
        post_type=body.post_type,
        db=db,
    )

    # Log community event
    name = (ob.full_name if ob else None) or current_user.name or "User"
    event = LeaderboardEvent(
        user_id=current_user.id,
        user_name=name,
        field_key=field_key,
        event_type="community_post",
        message=f"💬 {name} posted in the community",
        xp_delta=0,
    )
    db.add(event)
    db.commit()

    return post


# ─────────────────────────────────────────────────────────────────────────────
# POST /community/post/{id}/react
# ─────────────────────────────────────────────────────────────────────────────

class ReactRequest(BaseModel):
    emoji: str = "🔥"


@router.post("/post/{post_id}/react")
def react_to_post(
    post_id: UUID,
    body: ReactRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = toggle_reaction(post_id, current_user.id, body.emoji, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ─────────────────────────────────────────────────────────────────────────────
# GET /community/events/stream  — SSE
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/events/stream")
async def community_sse(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    field_key = get_user_field(ob)
    batch_key = get_user_batch(ob)
    db.close()

    async def event_generator():
        last_post_id: Optional[str] = None
        last_event_id: Optional[str] = None
        yield f"data: {json.dumps({'type': 'connected', 'batch': batch_key})}\n\n"

        while True:
            await asyncio.sleep(4)

            from Backend.db.session import SessionLocal
            session = SessionLocal()
            try:
                # New community posts
                posts = (
                    session.query(CommunityPost)
                    .filter(
                        CommunityPost.batch_key == batch_key,
                        CommunityPost.created_at >= datetime.now(timezone.utc) - timedelta(minutes=1),
                    )
                    .order_by(CommunityPost.created_at.desc())
                    .limit(3)
                    .all()
                )

                for p in reversed(posts):
                    pid = str(p.id)
                    if pid == last_post_id:
                        continue
                    payload = {
                        "type": "new_post",
                        "post_id": pid,
                        "author": p.author_name,
                        "content": p.content[:100],
                        "post_type": p.post_type,
                        "ts": p.created_at.isoformat() if p.created_at else None,
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                if posts:
                    last_post_id = str(posts[0].id)

                # Live leaderboard events for the field
                events = (
                    session.query(LeaderboardEvent)
                    .filter(
                        LeaderboardEvent.field_key == field_key,
                        LeaderboardEvent.created_at >= datetime.now(timezone.utc) - timedelta(minutes=1),
                    )
                    .order_by(LeaderboardEvent.created_at.desc())
                    .limit(3)
                    .all()
                )

                for ev in reversed(events):
                    eid = str(ev.id)
                    if eid == last_event_id:
                        continue
                    payload = {
                        "type": "activity",
                        "message": ev.message,
                        "xp": ev.xp_delta,
                        "event_type": ev.event_type,
                        "ts": ev.created_at.isoformat() if ev.created_at else None,
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                if events:
                    last_event_id = str(events[0].id)

                if not posts and not events:
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
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _batch_label(batch_key: str, ob: Optional[UserOnboarding]) -> str:
    parts = batch_key.split(":")  # e.g. ["batch", "jee", "2027"]
    if len(parts) >= 3:
        subject = parts[1].upper()
        year = parts[2]
        return f"{subject} {year} Batch"
    if len(parts) == 2:
        subject = parts[1].replace("_", " ").title()
        return f"{subject} Community"
    return "Community"


def _batch_description(batch_key: str, ob: Optional[UserOnboarding]) -> str:
    label = _batch_label(batch_key, ob)
    return (
        f"Connect with fellow {label} members. "
        "Share progress, ask questions, celebrate wins, and hold each other accountable."
    )
