"""
routers/agents.py

Exposes the new GrowthOS multi-agent capabilities that don't already have a
home in an existing router. Task planning, mission planning, and
accountability already have their own routers/services (dashboard.py,
growth_plan.py, accountability.py) — this router is for everything else:
behavior analysis, progress tracking, reflection, learning coach, career
coach, focus coach, knowledge, recommendation, conversation, future planning,
analytics, plus the multi-agent "briefing" collaborations.

Every route here builds one MemoryContext (via the Orchestrator, DB-backed)
and dispatches to an agent — no route calls an LLM directly.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from Backend.ai.orchestrator import get_orchestrator
from Backend.db.session import get_db
from Backend.routers.auth import get_current_user

router = APIRouter(tags=["Agents"])


# ---------------------------------------------------------------------- #
# Introspection
# ---------------------------------------------------------------------- #

@router.get("/")
def list_agents():
    """Lists every registered agent, its purpose, and which task-type/model bucket it uses."""
    return {"agents": get_orchestrator().available_agents()}


# ---------------------------------------------------------------------- #
# Request bodies for agents that need extra input beyond user context
# ---------------------------------------------------------------------- #

class ReflectionRequest(BaseModel):
    period: str = "day"  # "day" | "week"


class LearningCoachRequest(BaseModel):
    topic: str


class CareerCoachRequest(BaseModel):
    request: str


class FocusCoachRequest(BaseModel):
    situation: str


class KnowledgeRequest(BaseModel):
    question: str


class RecommendationRequest(BaseModel):
    recommendation_type: str = "general"


class ConversationRequest(BaseModel):
    message: str


class FuturePlanningRequest(BaseModel):
    horizon: str = "week"  # "week" | "month" | "quarter"


# ---------------------------------------------------------------------- #
# Single-agent endpoints
# ---------------------------------------------------------------------- #

@router.get("/behavior-analysis")
def behavior_analysis(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_orchestrator().run("behavior_analysis", user_id=current_user.id, db=db)


@router.get("/progress-tracking")
def progress_tracking(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_orchestrator().run("progress_tracking", user_id=current_user.id, db=db)


@router.post("/reflection")
def reflection(body: ReflectionRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_orchestrator().run("reflection", user_id=current_user.id, db=db, period=body.period)


@router.post("/learning-coach")
def learning_coach(body: LearningCoachRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_orchestrator().run("learning_coach", user_id=current_user.id, db=db, topic=body.topic)


@router.post("/career-coach")
def career_coach(body: CareerCoachRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_orchestrator().run("career_coach", user_id=current_user.id, db=db, request=body.request)


@router.post("/focus-coach")
def focus_coach(body: FocusCoachRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_orchestrator().run("focus_coach", user_id=current_user.id, db=db, situation=body.situation)


@router.post("/knowledge")
def knowledge(body: KnowledgeRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    answer = get_orchestrator().run("knowledge", user_id=current_user.id, db=db, question=body.question)
    return {"answer": answer}


@router.post("/recommendation")
def recommendation(body: RecommendationRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_orchestrator().run(
        "recommendation", user_id=current_user.id, db=db, recommendation_type=body.recommendation_type
    )


@router.post("/conversation")
def conversation(body: ConversationRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    answer = get_orchestrator().run("conversation", user_id=current_user.id, db=db, message=body.message)
    return {"answer": answer}


@router.post("/future-planning")
def future_planning(body: FuturePlanningRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_orchestrator().run("future_planning", user_id=current_user.id, db=db, horizon=body.horizon)


@router.get("/analytics")
def analytics(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_orchestrator().run("analytics", user_id=current_user.id, db=db)


# ---------------------------------------------------------------------- #
# Multi-agent collaborations
# ---------------------------------------------------------------------- #

@router.get("/daily-briefing")
def daily_briefing(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Task Planning + Accountability Coach + Progress Tracking, one shared context, merged."""
    return get_orchestrator().daily_briefing(user_id=current_user.id, db=db)


@router.get("/weekly-review")
def weekly_review(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Reflection + Behavior Analysis + Analytics, one shared context, merged."""
    return get_orchestrator().weekly_review(user_id=current_user.id, db=db)
