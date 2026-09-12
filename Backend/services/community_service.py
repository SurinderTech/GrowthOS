"""
services/community_service.py

Community batch grouping and feed management.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from Backend.models.community import CommunityPost, CommunityReaction
from Backend.models.onboarding import UserOnboarding
from Backend.models.user import User
from Backend.models.practice import UserStreak
from Backend.services.leaderboard_service import get_user_batch, get_user_field, compute_user_score


def get_batch_members(
    batch_key: str,
    requesting_user_id: UUID,
    db: Session,
    limit: int = 50,
) -> list[dict]:
    """
    Return members of the same batch, ordered by score.
    """
    from Backend.models.onboarding import UserOnboarding

    rows = (
        db.query(User, UserOnboarding)
        .join(UserOnboarding, UserOnboarding.user_id == User.id)
        .filter(UserOnboarding.onboarding_completed == True)
        .filter(User.is_active == True)
        .all()
    )

    members = []
    for user, ob in rows:
        if get_user_batch(ob) != batch_key:
            continue

        stats = compute_user_score(user.id, db)
        streak_row = db.query(UserStreak).filter(UserStreak.user_id == user.id).first()

        name = ob.full_name or user.name or user.email.split("@")[0]
        avatar = "".join(w[0].upper() for w in name.split()[:2])

        # Activity status — simple heuristic
        if streak_row and streak_row.last_practice_date:
            from datetime import date
            today = date.today()
            if streak_row.last_practice_date == today:
                status = "grinding"
            elif (today - streak_row.last_practice_date).days <= 1:
                status = "onfire" if (streak_row.current_streak or 0) > 20 else "mission"
            else:
                status = "idle"
        else:
            status = "idle"

        members.append({
            "user_id": str(user.id),
            "name": name,
            "avatar": avatar,
            "image": user.image,
            "score": stats["score"],
            "streak": stats["streak"],
            "longest_streak": stats["longest_streak"],
            "total_correct": stats["total_correct"],
            "challenges_done": stats["challenges_done"],
            "status": status,
            "is_current_user": str(user.id) == str(requesting_user_id),
            "batch_key": batch_key,
        })

    members.sort(key=lambda x: x["score"], reverse=True)

    for i, m in enumerate(members):
        m["rank"] = i + 1
        m["league"] = _score_to_league(m["score"])

    return members[:limit]


def get_batch_feed(
    batch_key: str,
    db: Session,
    page: int = 0,
    page_size: int = 20,
) -> list[dict]:
    """
    Return paginated community posts for the batch.
    """
    posts = (
        db.query(CommunityPost)
        .filter(CommunityPost.batch_key == batch_key)
        .order_by(CommunityPost.is_pinned.desc(), CommunityPost.created_at.desc())
        .offset(page * page_size)
        .limit(page_size)
        .all()
    )

    return [_serialize_post(p) for p in posts]


def create_post(
    user_id: UUID,
    batch_key: str,
    content: str,
    post_type: str,
    db: Session,
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()

    name = (ob.full_name if ob else None) or (user.name if user else None) or "User"
    streak_row = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    badge = f"🔥 {streak_row.current_streak}d Streak" if streak_row and streak_row.current_streak else None

    post = CommunityPost(
        user_id=user_id,
        batch_key=batch_key,
        content=content,
        post_type=post_type,
        author_name=name,
        author_badge=badge,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _serialize_post(post)


def toggle_reaction(
    post_id: UUID,
    user_id: UUID,
    emoji: str,
    db: Session,
) -> dict:
    existing = db.query(CommunityReaction).filter(
        CommunityReaction.post_id == post_id,
        CommunityReaction.user_id == user_id,
    ).first()

    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        return {"error": "Post not found"}

    if existing:
        db.delete(existing)
        post.reaction_count = max(0, post.reaction_count - 1)
        db.commit()
        return {"reacted": False, "count": post.reaction_count}
    else:
        reaction = CommunityReaction(post_id=post_id, user_id=user_id, emoji=emoji)
        db.add(reaction)
        post.reaction_count += 1
        db.commit()
        return {"reacted": True, "count": post.reaction_count}


def _serialize_post(p: CommunityPost) -> dict:
    return {
        "id": str(p.id),
        "author_name": p.author_name,
        "author_badge": p.author_badge,
        "content": p.content,
        "post_type": p.post_type,
        "reaction_count": p.reaction_count,
        "reply_count": p.reply_count,
        "is_pinned": p.is_pinned,
        "batch_key": p.batch_key,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "user_id": str(p.user_id),
    }


def _score_to_league(score: int) -> str:
    if score >= 9500: return "Silicon"
    if score >= 8500: return "Elite"
    if score >= 6000: return "Gold"
    if score >= 3000: return "Silver"
    return "Bronze"
