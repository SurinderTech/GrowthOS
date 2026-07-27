"""
routers/resume_agent.py
Resume Agent — paste a resume, get an ATS-style score + concrete feedback.
Mounted at /agents/resume in main.py.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from Backend.db.session import get_db
from Backend.models.agents_data import ResumeAnalysis
from Backend.routers.auth import get_current_user
from Backend.routers.dashboard import get_user_profile
from Backend.schemas.agents_data import ResumeAnalyzeRequest, ResumeAnalysisOut, ResumeSummaryOut
from Backend.services.agents_ai_service import analyze_resume

router = APIRouter(tags=["Resume Agent"])


@router.get("/", response_model=ResumeSummaryOut)
def get_resume_summary(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Latest analysis + history, for the orbit node status + panel list."""
    history = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.user_id == current_user.id)
        .order_by(ResumeAnalysis.created_at.desc())
        .limit(10)
        .all()
    )
    return ResumeSummaryOut(
        latest=history[0] if history else None,
        history=history,
        total_analyses=len(history),
    )


@router.post("/analyze", response_model=ResumeAnalysisOut)
def analyze(body: ResumeAnalyzeRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is empty.")

    profile = get_user_profile(current_user.id, db)
    result = analyze_resume(body.resume_text, profile)

    record = ResumeAnalysis(
        user_id=current_user.id,
        resume_text=body.resume_text,
        ats_score=result["ats_score"],
        strengths=result["strengths"],
        improvements=result["improvements"],
        summary=result["summary"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
