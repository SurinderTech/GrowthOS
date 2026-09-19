"""
services/social_service.py

Game-style friend system:
  - Send friend request → pending
  - Accept → accepted (both see each other as friends)
  - Reject → rejected
  - Block → blocked

Presence system:
  - Heartbeat every 30s from frontend
  - "In Battle" derived from active battle_players table
  - "Online" = last heartbeat < 90s ago
  - "Offline" = otherwise
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from Backend.models.social import UserFriendship, UserPresence
from Backend.models.user import User
from Backend.models.onboarding import UserOnboarding


# ─────────────────────────────────────────────────────────────────────────────
# Friend Requests
# ─────────────────────────────────────────────────────────────────────────────

def send_friend_request(
    requester_id: UUID,
    addressee_id: UUID,
    db: Session,
) -> dict:
    """Send a friend request. Returns the friendship object or error."""
    if str(requester_id) == str(addressee_id):
        return {"error": "Cannot friend yourself"}

    # Check for existing relationship in either direction
    existing = db.query(UserFriendship).filter(
        or_(
            and_(UserFriendship.requester_id == requester_id,
                 UserFriendship.addressee_id == addressee_id),
            and_(UserFriendship.requester_id == addressee_id,
                 UserFriendship.addressee_id == requester_id),
        )
    ).first()

    if existing:
        if existing.status == "accepted":
            return {"error": "Already friends"}
        if existing.status == "pending":
            if existing.requester_id == requester_id:
                return {"error": "Friend request already sent"}
            else:
                # They sent to us — auto-accept
                existing.status = "accepted"
                existing.updated_at = datetime.now(timezone.utc)
                db.commit()
                return {"status": "accepted", "id": str(existing.id), "auto_accepted": True}
        if existing.status == "rejected":
            # Allow re-sending — update status
            existing.requester_id = requester_id
            existing.addressee_id = addressee_id
            existing.status = "pending"
            existing.updated_at = datetime.now(timezone.utc)
            db.commit()
            return {"status": "pending", "id": str(existing.id)}
        if existing.status == "blocked":
            return {"error": "Cannot send request"}

    # Check target user exists
    target = db.query(User).filter(User.id == addressee_id, User.is_active == True).first()
    if not target:
        return {"error": "User not found"}

    friendship = UserFriendship(
        requester_id=requester_id,
        addressee_id=addressee_id,
        status="pending",
    )
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return {"status": "pending", "id": str(friendship.id)}


def respond_to_friend_request(
    friendship_id: UUID,
    responding_user_id: UUID,
    accept: bool,
    db: Session,
) -> dict:
    """Accept or reject a friend request. Only the addressee can respond."""
    friendship = db.query(UserFriendship).filter(
        UserFriendship.id == friendship_id,
        UserFriendship.addressee_id == responding_user_id,
        UserFriendship.status == "pending",
    ).first()

    if not friendship:
        return {"error": "Request not found or already handled"}

    friendship.status = "accepted" if accept else "rejected"
    friendship.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": friendship.status, "id": str(friendship.id)}


def get_pending_requests(user_id: UUID, db: Session) -> list[dict]:
    """Get incoming friend requests (where user is the addressee)."""
    rows = db.query(UserFriendship, User, UserOnboarding).filter(
        UserFriendship.addressee_id == user_id,
        UserFriendship.status == "pending",
    ).join(
        User, User.id == UserFriendship.requester_id
    ).outerjoin(
        UserOnboarding, UserOnboarding.user_id == UserFriendship.requester_id
    ).order_by(
        UserFriendship.created_at.desc()
    ).limit(50).all()

    result = []
    for f, u, ob in rows:
        name = (ob.full_name if ob else None) or u.name or "User"
        result.append({
            "request_id": str(f.id),
            "user_id":    str(u.id),
            "name":       name,
            "image":      u.image,
            "avatar":     "".join(w[0].upper() for w in name.split()[:2]) or "US",
            "field_key":  ob.user_type if ob else "",
            "created_at": f.created_at.isoformat() if f.created_at else None,
        })
    return result


def get_sent_requests(user_id: UUID, db: Session) -> list[dict]:
    """Get outgoing pending friend requests."""
    rows = db.query(UserFriendship, User, UserOnboarding).filter(
        UserFriendship.requester_id == user_id,
        UserFriendship.status == "pending",
    ).join(
        User, User.id == UserFriendship.addressee_id
    ).outerjoin(
        UserOnboarding, UserOnboarding.user_id == UserFriendship.addressee_id
    ).order_by(
        UserFriendship.created_at.desc()
    ).limit(50).all()

    result = []
    for f, u, ob in rows:
        name = (ob.full_name if ob else None) or u.name or "User"
        result.append({
            "request_id": str(f.id),
            "user_id":    str(u.id),
            "name":       name,
            "image":      u.image,
            "avatar":     "".join(w[0].upper() for w in name.split()[:2]) or "US",
            "created_at": f.created_at.isoformat() if f.created_at else None,
        })
    return result


def get_friends(user_id: UUID, db: Session) -> list[dict]:
    """
    Return all accepted friends with presence status.
    Efficient: single query using OR on both requester/addressee.
    """
    rows = db.query(UserFriendship).filter(
        or_(
            and_(UserFriendship.requester_id == user_id,  UserFriendship.status == "accepted"),
            and_(UserFriendship.addressee_id == user_id,  UserFriendship.status == "accepted"),
        )
    ).all()

    friend_user_ids = []
    for f in rows:
        fid = f.addressee_id if str(f.requester_id) == str(user_id) else f.requester_id
        friend_user_ids.append(fid)

    if not friend_user_ids:
        return []

    # Batch-fetch user info + presence
    users = db.query(User, UserOnboarding, UserPresence).filter(
        User.id.in_(friend_user_ids),
        User.is_active == True,
    ).outerjoin(
        UserOnboarding, UserOnboarding.user_id == User.id,
    ).outerjoin(
        UserPresence, UserPresence.user_id == User.id,
    ).all()

    now = datetime.now(timezone.utc)
    result = []
    for u, ob, presence in users:
        name = (ob.full_name if ob else None) or u.name or "User"
        status = _derive_presence(presence, now)
        result.append({
            "user_id":         str(u.id),
            "name":            name,
            "image":           u.image,
            "avatar":          "".join(w[0].upper() for w in name.split()[:2]) or "US",
            "presence_status": status,
            "last_seen_at":    presence.last_seen_at.isoformat() if presence and presence.last_seen_at else None,
            "current_battle_id": str(presence.current_battle_id) if presence and presence.current_battle_id else None,
        })

    # Sort: online first, in_battle second, offline last
    order = {"online": 0, "in_battle": 1, "offline": 2}
    result.sort(key=lambda x: order.get(x["presence_status"], 2))
    return result


def get_friend_ids(user_id: UUID, db: Session) -> list[UUID]:
    """Return list of UUID for all accepted friends (used in leaderboard filter)."""
    rows = db.query(UserFriendship).filter(
        or_(
            and_(UserFriendship.requester_id == user_id, UserFriendship.status == "accepted"),
            and_(UserFriendship.addressee_id == user_id, UserFriendship.status == "accepted"),
        )
    ).all()

    ids = [user_id]  # include self so user sees themselves in friends leaderboard
    for f in rows:
        fid = f.addressee_id if str(f.requester_id) == str(user_id) else f.requester_id
        ids.append(fid)
    return ids


def unfriend(user_id: UUID, target_id: UUID, db: Session) -> dict:
    """Remove a friendship in either direction."""
    f = db.query(UserFriendship).filter(
        or_(
            and_(UserFriendship.requester_id == user_id,  UserFriendship.addressee_id == target_id),
            and_(UserFriendship.requester_id == target_id, UserFriendship.addressee_id == user_id),
        ),
        UserFriendship.status == "accepted",
    ).first()

    if not f:
        return {"error": "Not friends"}

    db.delete(f)
    db.commit()
    return {"status": "removed"}


# ─────────────────────────────────────────────────────────────────────────────
# Presence
# ─────────────────────────────────────────────────────────────────────────────

def heartbeat(user_id: UUID, db: Session, battle_id: Optional[UUID] = None) -> str:
    """
    Update user's last_seen_at and derive presence status.
    Called from frontend every 30 seconds.
    Returns the derived status.
    """
    now = datetime.now(timezone.utc)

    # Check if user is in an active battle
    derived_status = "online"
    if battle_id:
        derived_status = "in_battle"
    else:
        # Check active battle_players table
        try:
            from sqlalchemy import text
            result = db.execute(text("""
                SELECT bp.battle_id FROM battle_players bp
                JOIN battles b ON b.id = bp.battle_id
                WHERE bp.user_id = :uid
                  AND b.status IN ('lobby','countdown','live')
                LIMIT 1
            """), {"uid": str(user_id)}).first()
            if result:
                derived_status = "in_battle"
                battle_id = result.battle_id
        except Exception:
            pass

    presence = db.query(UserPresence).filter(UserPresence.user_id == user_id).first()
    if not presence:
        presence = UserPresence(
            user_id=user_id,
            status=derived_status,
            last_seen_at=now,
            current_battle_id=battle_id,
        )
        db.add(presence)
    else:
        presence.status = derived_status
        presence.last_seen_at = now
        presence.current_battle_id = battle_id

    db.commit()
    return derived_status


def get_presence_batch(user_ids: list[UUID], db: Session) -> dict[str, str]:
    """Batch fetch presence for a list of user_ids. Returns {user_id_str: status}."""
    if not user_ids:
        return {}

    presences = db.query(UserPresence).filter(
        UserPresence.user_id.in_(user_ids)
    ).all()

    now = datetime.now(timezone.utc)
    result = {}
    for p in presences:
        result[str(p.user_id)] = _derive_presence(p, now)

    # Users with no presence row are offline
    for uid in user_ids:
        if str(uid) not in result:
            result[str(uid)] = "offline"

    return result


def _derive_presence(presence: Optional[UserPresence], now: datetime) -> str:
    """Derive status from presence row — handles expired heartbeats."""
    if not presence:
        return "offline"
    cutoff = now - timedelta(seconds=90)
    if presence.last_seen_at and presence.last_seen_at >= cutoff:
        return presence.status  # "online" or "in_battle"
    return "offline"
