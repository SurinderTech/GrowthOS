"""
routers/interview_agent.py
Interview Agent — AI-generated mock interviews with per-answer feedback.
Mounted at /agents/interview in main.py.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from Backend.db.session import get_db
from Backend.models.agents_data import InterviewSession
from Backend.routers.auth import get_current_user
from Backend.routers.dashboard import get_user_profile
from Backend.schemas.agents_data import (
    InterviewStartRequest, InterviewSessionOut, InterviewAnswerRequest,
    InterviewAnswerResult, InterviewSummaryOut,
)
from Backend.services.agents_ai_service import (
    generate_interview_questions, evaluate_interview_answer, summarize_interview_session,
)

router = APIRouter(tags=["Interview Agent"])


@router.get("/", response_model=InterviewSummaryOut)
def get_interview_summary(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    history = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
        .limit(10)
        .all()
    )
    return InterviewSummaryOut(
        latest=history[0] if history else None,
        history=history,
        total_sessions=len(history),
    )


@router.post("/start", response_model=InterviewSessionOut)
def start_interview(body: InterviewStartRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.role.strip():
        raise HTTPException(status_code=400, detail="Target role is required.")

    profile = get_user_profile(current_user.id, db)
    questions = generate_interview_questions(body.role, profile, body.question_count)

    session = InterviewSession(
        user_id=current_user.id,
        role=body.role,
        questions=questions,
        answers={},
        status="in_progress",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/answer", response_model=InterviewAnswerResult)
def answer_question(session_id: str, body: InterviewAnswerRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if body.question_index < 0 or body.question_index >= len(session.questions):
        raise HTTPException(status_code=400, detail="Invalid question index.")

    profile = get_user_profile(current_user.id, db)
    question = session.questions[body.question_index]
    result = evaluate_interview_answer(question, body.answer, session.role, profile)

    answers = dict(session.answers or {})
    answers[str(body.question_index)] = {
        "answer": body.answer,
        "feedback": result["feedback"],
        "score": result["score"],
    }
    session.answers = answers
    db.commit()

    return InterviewAnswerResult(feedback=result["feedback"], score=result["score"])


@router.post("/{session_id}/complete", response_model=InterviewSessionOut)
def complete_interview(session_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    profile = get_user_profile(current_user.id, db)
    qa_pairs = [
        {
            "question": session.questions[int(idx)],
            "answer": ans.get("answer", ""),
            "score": ans.get("score", 0),
            "feedback": ans.get("feedback", ""),
        }
        for idx, ans in (session.answers or {}).items()
    ]
    if not qa_pairs:
        raise HTTPException(status_code=400, detail="Answer at least one question before completing.")

    summary = summarize_interview_session(session.role, qa_pairs, profile)
    session.overall_score = summary["overall_score"]
    session.overall_feedback = summary["overall_feedback"]
    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session
