"""
routers/challenges.py

Endpoints:
  GET  /challenges/           — challenges matched to user's field
  GET  /challenges/my         — user's joined/completed challenges
  POST /challenges/{id}/join  — join a challenge
  POST /challenges/{id}/complete — mark complete, award XP
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from Backend.auth import get_current_user
from Backend.db.session import get_db
from Backend.models.user import User
from Backend.models.onboarding import UserOnboarding
from Backend.models.challenges import Challenge, ChallengeParticipant
from Backend.services.challenge_service import (
    get_challenges_for_user,
    join_challenge,
    complete_challenge,
)
from Backend.services.leaderboard_service import (
    get_user_field,
    award_xp,
    get_user_batch,
)
from Backend.models.leaderboard import LeaderboardEvent

router = APIRouter(tags=["Challenges"])


# ─────────────────────────────────────────────────────────────────────────────
# GET /challenges/
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/")
def list_challenges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    challenges = get_challenges_for_user(ob, current_user.id, db)
    return {
        "field": get_user_field(ob),
        "challenges": challenges,
        "total": len(challenges),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /challenges/my
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/my")
def my_challenges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parts = (
        db.query(ChallengeParticipant, Challenge)
        .join(Challenge, Challenge.id == ChallengeParticipant.challenge_id)
        .filter(ChallengeParticipant.user_id == current_user.id)
        .order_by(ChallengeParticipant.joined_at.desc())
        .all()
    )

    result = []
    for part, challenge in parts:
        result.append({
            "challenge_id": str(challenge.id),
            "title": challenge.title,
            "difficulty": challenge.difficulty,
            "type": challenge.challenge_type,
            "xp_reward": challenge.xp_reward,
            "completed": part.completed,
            "score": part.score,
            "time_taken_s": part.time_taken_s,
            "joined_at": part.joined_at.isoformat() if part.joined_at else None,
            "completed_at": part.completed_at.isoformat() if part.completed_at else None,
        })

    completed_count = sum(1 for r in result if r["completed"])
    return {
        "challenges": result,
        "total": len(result),
        "completed": completed_count,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /challenges/{id}/join
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{challenge_id}/join")
def join(
    challenge_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    result = join_challenge(challenge_id, current_user.id, db)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# POST /challenges/{id}/complete
# ─────────────────────────────────────────────────────────────────────────────

class CompleteRequest(BaseModel):
    time_taken_s: Optional[int] = None


@router.post("/{challenge_id}/complete")
def complete(
    challenge_id: UUID,
    body: CompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = complete_challenge(challenge_id, current_user.id, body.time_taken_s, db)

    if result.get("status") == "completed":
        # Award XP to leaderboard
        ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
        field_key = get_user_field(ob)
        name = (ob.full_name if ob else None) or current_user.name or "User"
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()

        award_xp(
            user_id=current_user.id,
            amount=result["xp"],
            source="challenge",
            field_key=field_key,
            user_name=name,
            db=db,
        )

        # Log a challenge-done event for SSE feed
        if challenge:
            event = LeaderboardEvent(
                user_id=current_user.id,
                user_name=name,
                field_key=field_key,
                event_type="challenge_done",
                message=f"🏆 {name} completed '{challenge.title}' — +{result['xp']} XP",
                xp_delta=result["xp"],
            )
            db.add(event)
            db.commit()

    return result
