"""
routers/practice.py

Practice Arena API.
Plugs into your existing FastAPI app — same auth, same DB session, same patterns.

Add to main.py:
    from Backend.routers.practice import router as practice_router
    app.include_router(practice_router, prefix="/practice", tags=["Practice"])

Endpoints:
    GET  /practice/session           → Get today's personalized questions
    POST /practice/answer            → Evaluate a single answer
    POST /practice/complete          → Finish session, update streak + skills
    GET  /practice/streak            → Get current streak status
    GET  /practice/progress          → Get skill progress breakdown
"""

import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from Backend.db.session import get_db
from Backend.routers.auth import get_current_user
from Backend.models.onboarding import UserOnboarding
from Backend.models.practice import (
    PracticeQuestion,
    UserPracticeSession,
    UserPracticeAnswer,
    UserStreak,
    UserSkillProgress,
)
from Backend.services.practice_gemini import (
    get_or_generate_questions,
    evaluate_short_answer,
)
from Backend.services.streak_service import update_streak, get_or_create_streak, increment_skill_progress
from Backend.routers.dashboard import get_user_profile

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    id: str
    topic: str
    subtopic: Optional[str]
    difficulty: str
    q_type: str
    question_text: str
    options: Optional[List[str]]
    # NOTE: correct_answer is NOT returned here — only after submission

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    session_id: str
    questions: List[QuestionOut]
    topic_focus: str
    user_type: str
    total_questions: int


class AnswerSubmitRequest(BaseModel):
    session_id: str
    question_id: str
    user_answer: str
    time_taken_s: int = 0


class AnswerResult(BaseModel):
    is_correct: bool
    correct_answer: Optional[str]
    explanation: str
    feedback: Optional[str]       # for short/coding answers
    skill_delta: int


class CompleteSessionRequest(BaseModel):
    session_id: str


class SessionResult(BaseModel):
    correct_count: int
    total_count: int
    accuracy_pct: int
    new_streak: int
    streak_updated: bool
    longest_streak: int
    skill_updates: List[dict]


class StreakOut(BaseModel):
    current_streak: int
    longest_streak: int
    last_practice_date: Optional[str]
    practiced_today: bool


# ── GET /practice/session ─────────────────────────────────────────────────────

@router.get("/session", response_model=SessionOut)
async def get_practice_session(
    count: int = 5,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns today's personalized practice questions.

    Flow:
    1. Load UserOnboarding → understand who the user is
    2. Determine topics + question types for their user_type
    3. Check DB for existing questions for those topics
    4. If not enough → Gemini generates, stores, returns
    5. Never generate duplicates for same user_type + topic
    """

    # ── Load onboarding ────────────────────────────────────────────────────
    ob = (
        db.query(UserOnboarding)
        .filter(UserOnboarding.user_id == current_user.id)
        .first()
    )

    if not ob:
        raise HTTPException(
            status_code=400,
            detail="Please complete onboarding first."
        )

    # ── Get/generate questions ─────────────────────────────────────────────
    questions = get_or_generate_questions(ob, db, count=count)

    if not questions:
        raise HTTPException(
            status_code=500,
            detail="Could not generate questions. Please try again."
        )

    # ── Determine display topic ────────────────────────────────────────────
    topic_focus = questions[0].topic if questions else "Practice"
    if ob.user_type == "exam_aspirant" and ob.exam_type:
        topic_focus = ob.exam_type.upper() + " Practice"
    elif ob.user_type == "student" and ob.field_of_study:
        topic_focus = ob.field_of_study + " Practice"
    elif ob.user_type == "freelancer" and ob.primary_skill:
        topic_focus = ob.primary_skill + " Skills"

    # ── Build session record ───────────────────────────────────────────────
    session_id = str(uuid.uuid4())

    new_session = UserPracticeSession(
        id           = session_id,
        user_id      = current_user.id,
        topic        = topic_focus,
        session_date = date.today(),
        correct_count= 0,
        total_count  = 0,
        accuracy_pct = 0,
    )
    db.add(new_session)
    db.commit()

    return SessionOut(
        session_id      = session_id,
        questions       = [
            QuestionOut(
                id           = str(q.id),
                topic        = q.topic,
                subtopic     = q.subtopic,
                difficulty   = q.difficulty,
                q_type       = q.q_type,
                question_text= q.question_text,
                options      = q.options,
            )
            for q in questions
        ],
        topic_focus     = topic_focus,
        user_type       = ob.user_type or "student",
        total_questions = len(questions),
    )


# ── POST /practice/answer ─────────────────────────────────────────────────────

@router.post("/answer", response_model=AnswerResult)
async def submit_answer(
    req: AnswerSubmitRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Evaluate a single answer.
    - MCQ/numeric: instant comparison
    - short/coding: Gemini evaluates
    Returns correct_answer so frontend can show it.
    """

    # Validate that the session exists and belongs to the current user
    existing_session = (
        db.query(UserPracticeSession)
        .filter(
            UserPracticeSession.id      == req.session_id,
            UserPracticeSession.user_id == current_user.id,
        )
        .first()
    )
    if not existing_session:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    # ── Fetch question ─────────────────────────────────────────────────────
    question = (
        db.query(PracticeQuestion)
        .filter(PracticeQuestion.id == req.question_id)
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    is_correct = False
    feedback   = None

    # ── Evaluate based on type ─────────────────────────────────────────────
    if question.q_type in ("mcq", "numeric"):
        is_correct = (
            str(req.user_answer).strip().upper() ==
            str(question.correct_answer or "").strip().upper()
        )

    elif question.q_type in ("short", "coding"):
        result = evaluate_short_answer(
            question_text=question.question_text,
            explanation  =question.explanation,
            user_answer  =req.user_answer,
        )
        is_correct = result["is_correct"]
        feedback   = result["feedback"]

    # ── Save answer to DB ──────────────────────────────────────────────────
    answer_row = UserPracticeAnswer(
        session_id  = req.session_id,
        user_id     = current_user.id,
        question_id = question.id,
        user_answer = req.user_answer,
        is_correct  = is_correct,
        time_taken_s= req.time_taken_s,
    )
    db.add(answer_row)
    db.commit()

    # ── Calculate skill delta (only on correct) ────────────────────────────
    skill_delta = 0
    if is_correct:
        if question.difficulty == "easy":     skill_delta = 2
        elif question.difficulty == "medium": skill_delta = 3
        elif question.difficulty == "hard":   skill_delta = 5

    return AnswerResult(
        is_correct     = is_correct,
        correct_answer = question.correct_answer,
        explanation    = question.explanation,
        feedback       = feedback,
        skill_delta    = skill_delta,
    )


# ── POST /practice/complete ───────────────────────────────────────────────────

@router.post("/complete", response_model=SessionResult)
async def complete_session(
    req: CompleteSessionRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Called when user finishes all questions.
    1. Calculate score from saved answers
    2. Update streak
    3. Update skill progress per topic
    4. Save session summary
    """

    # ── Load all answers for this session ──────────────────────────────────
    answers = (
        db.query(UserPracticeAnswer)
        .filter(
            UserPracticeAnswer.session_id == req.session_id,
            UserPracticeAnswer.user_id    == current_user.id,
        )
        .all()
    )

    if not answers:
        raise HTTPException(status_code=404, detail="Session not found or no answers submitted.")

    correct_count = sum(1 for a in answers if a.is_correct)
    total_count   = len(answers)
    accuracy_pct  = round((correct_count / total_count) * 100) if total_count else 0

    # ── Update skill progress per topic ───────────────────────────────────
    skill_updates = []
    topics_seen   = set()

    for answer in answers:
        question = db.query(PracticeQuestion).filter(
            PracticeQuestion.id == answer.question_id
        ).first()
        if not question:
            continue

        topic = question.topic
        if topic in topics_seen:
            continue
        topics_seen.add(topic)

        if answer.is_correct:
            delta  = {"easy": 2, "medium": 3, "hard": 5}.get(question.difficulty, 2)
            update = increment_skill_progress(current_user.id, topic, delta, db)
            skill_updates.append(update)

    # ── Update streak ─────────────────────────────────────────────────────
    streak_data = update_streak(current_user.id, db)

    # ── Determine topic from first answer ──────────────────────────────────
    if answers:
        first_question = db.query(PracticeQuestion).filter(
            PracticeQuestion.id == answers[0].question_id
        ).first()
        topic = first_question.topic if first_question else "Practice"
    else:
        topic = "Practice"

    # ── Update existing session row (created in /session) ─────────────────
    session_row = (
        db.query(UserPracticeSession)
        .filter(
            UserPracticeSession.id      == req.session_id,
            UserPracticeSession.user_id == current_user.id,
        )
        .first()
    )
    if session_row:
        session_row.topic         = topic
        session_row.correct_count = correct_count
        session_row.total_count   = total_count
        session_row.accuracy_pct  = accuracy_pct
        session_row.session_date  = date.today()
    else:
        # Fallback: session row missing — insert fresh
        session_row = UserPracticeSession(
            user_id      = current_user.id,
            topic        = topic,
            correct_count= correct_count,
            total_count  = total_count,
            accuracy_pct = accuracy_pct,
            session_date = date.today(),
        )
        db.add(session_row)

    db.commit()

    return SessionResult(
        correct_count  = correct_count,
        total_count    = total_count,
        accuracy_pct   = accuracy_pct,
        new_streak     = streak_data["current_streak"],
        streak_updated = streak_data["streak_updated"],
        longest_streak = streak_data["longest_streak"],
        skill_updates  = skill_updates,
    )


# ── GET /practice/streak ──────────────────────────────────────────────────────

@router.get("/streak", response_model=StreakOut)
def get_streak(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return current streak status for the user."""
    row = get_or_create_streak(current_user.id, db)
    return StreakOut(
        current_streak     = row.current_streak,
        longest_streak     = row.longest_streak,
        last_practice_date = row.last_practice_date.isoformat() if row.last_practice_date else None,
        practiced_today    = row.practiced_today,
    )


# ── GET /practice/progress ────────────────────────────────────────────────────

@router.get("/progress")
def get_skill_progress(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return skill progress breakdown for all topics the user has practiced."""
    rows = (
        db.query(UserSkillProgress)
        .filter(UserSkillProgress.user_id == current_user.id)
        .order_by(UserSkillProgress.progress_pct.desc())
        .all()
    )
    return [
        {
            "topic":        r.topic,
            "progress_pct": r.progress_pct,
            "updated_at":   r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]