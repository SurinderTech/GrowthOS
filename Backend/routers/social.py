"""
routers/social.py

Friend system + presence endpoints.

  POST /social/friend-request            — send friend request
  GET  /social/friend-requests/incoming  — incoming pending requests
  GET  /social/friend-requests/sent      — sent pending requests
  POST /social/friend-request/{id}/accept  — accept request
  POST /social/friend-request/{id}/reject  — reject request
  GET  /social/friends                   — list of accepted friends + presence
  DELETE /social/friend/{user_id}        — unfriend
  POST /social/presence/heartbeat        — update presence (called every 30s)
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from Backend.auth import get_current_user
from Backend.db.session import get_db
from Backend.models.user import User
from Backend.services import social_service

router = APIRouter(tags=["Social"])


# ── Send Friend Request ───────────────────────────────────────────────────────

class FriendRequestBody(BaseModel):
    addressee_id: str  # UUID string


@router.post("/friend-request")
def send_friend_request(
    body: FriendRequestBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        addressee_id = UUID(body.addressee_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = social_service.send_friend_request(current_user.id, addressee_id, db)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ── Incoming Requests ─────────────────────────────────────────────────────────

@router.get("/friend-requests/incoming")
def get_incoming_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    requests = social_service.get_pending_requests(current_user.id, db)
    return {"requests": requests, "count": len(requests)}


# ── Sent Requests ─────────────────────────────────────────────────────────────

@router.get("/friend-requests/sent")
def get_sent_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    requests = social_service.get_sent_requests(current_user.id, db)
    return {"requests": requests, "count": len(requests)}


# ── Accept / Reject Request ───────────────────────────────────────────────────

class RespondBody(BaseModel):
    accept: bool


@router.post("/friend-request/{request_id}/respond")
def respond_to_request(
    request_id: UUID,
    body: RespondBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = social_service.respond_to_friend_request(
        request_id, current_user.id, body.accept, db
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ── Friends List ──────────────────────────────────────────────────────────────

@router.get("/friends")
def get_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    friends = social_service.get_friends(current_user.id, db)
    return {"friends": friends, "count": len(friends)}


# ── Unfriend ──────────────────────────────────────────────────────────────────

@router.delete("/friend/{target_user_id}")
def unfriend(
    target_user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = social_service.unfriend(current_user.id, target_user_id, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ── Presence Heartbeat ────────────────────────────────────────────────────────

class HeartbeatBody(BaseModel):
    battle_id: Optional[str] = None


@router.post("/presence/heartbeat")
def presence_heartbeat(
    body: HeartbeatBody = HeartbeatBody(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    battle_id = None
    if body.battle_id:
        try:
            battle_id = UUID(body.battle_id)
        except ValueError:
            pass

    status = social_service.heartbeat(current_user.id, db, battle_id=battle_id)
    return {"status": status}
