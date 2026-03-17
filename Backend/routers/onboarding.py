"""
routers/onboarding.py
FastAPI router — all 7 onboarding step endpoints + status + complete.
Protected by JWT auth (get_current_user dependency).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session


from db.session import get_db
from models.onboarding import UserOnboarding
from schemas.onboarding import (
    Step1Schema, Step2Schema, Step3Schema, Step4Schema,
    Step5StudentSchema, Step5FreelancerSchema, Step5BusinessSchema,
    Step5CreatorSchema, Step5ExamSchema,
    Step6Schema, Step7Schema, OnboardingResponse
)
# Import your existing auth dependency
from auth import get_current_user

router = APIRouter(tags=["Onboarding"])


def get_or_create_onboarding(user_id: str, db: Session) -> UserOnboarding:
    """Get existing onboarding record or create a fresh one."""
    record = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()

    if not record:
        record = UserOnboarding(user_id=user_id)
        db.add(record)
        db.commit()
        db.refresh(record)

    return record


# ── GET status ───────────────────────────────────────────────────────────────
@router.get("/status", response_model=OnboardingResponse)
def get_onboarding_status(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check current onboarding progress."""
    record = get_or_create_onboarding(current_user.id, db)
    print("ONBOARDING STATUS:", record.onboarding_completed, record.current_step)
    return record


# ── STEP 1 — User type ───────────────────────────────────────────────────────
@router.post("/step1", response_model=OnboardingResponse)
def save_step1(
    data: Step1Schema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    valid_types = ["student", "freelancer", "entrepreneur", "creator", "exam_aspirant", "self_growth"]
    if data.user_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid user_type. Must be one of: {valid_types}")

    record = get_or_create_onboarding(current_user.id, db)
    record.user_type = data.user_type
    record.current_step = max(record.current_step, 2)
    db.commit()
    db.refresh(record)
    return record


# ── STEP 2 — Basic profile ───────────────────────────────────────────────────
@router.post("/step2", response_model=OnboardingResponse)
def save_step2(
    data: Step2Schema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    if data.full_name:   record.full_name = data.full_name
    if data.age_group:   record.age_group = data.age_group
    if data.country:     record.country = data.country
    if data.primary_goal: record.primary_goal = data.primary_goal
    record.current_step = max(record.current_step, 3)
    db.commit()
    db.refresh(record)
    return record


# ── STEP 3 — Daily time ──────────────────────────────────────────────────────
@router.post("/step3", response_model=OnboardingResponse)
def save_step3(
    data: Step3Schema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    record.daily_time = data.daily_time
    record.current_step = max(record.current_step, 4)
    db.commit()
    db.refresh(record)
    return record


# ── STEP 4 — Interests ───────────────────────────────────────────────────────
@router.post("/step4", response_model=OnboardingResponse)
def save_step4(
    data: Step4Schema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not data.interests:
        raise HTTPException(status_code=400, detail="Select at least one interest")

    record = get_or_create_onboarding(current_user.id, db)
    record.interests = data.interests
    record.current_step = max(record.current_step, 5)
    db.commit()
    db.refresh(record)
    return record


# ── STEP 5 — Category-specific ───────────────────────────────────────────────
@router.post("/step5/student", response_model=OnboardingResponse)
def save_step5_student(
    data: Step5StudentSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    record.education_level = data.education_level
    record.field_of_study = data.field_of_study
    record.career_goal = data.career_goal
    record.current_step = max(record.current_step, 6)
    db.commit(); db.refresh(record)
    return record


@router.post("/step5/freelancer", response_model=OnboardingResponse)
def save_step5_freelancer(
    data: Step5FreelancerSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    record.primary_skill = data.primary_skill
    record.experience_level = data.experience_level
    record.monthly_income_goal = data.monthly_income_goal
    record.services_offered = data.services_offered
    record.current_step = max(record.current_step, 6)
    db.commit(); db.refresh(record)
    return record


@router.post("/step5/business", response_model=OnboardingResponse)
def save_step5_business(
    data: Step5BusinessSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    record.business_type = data.business_type
    record.team_size = data.team_size
    record.revenue_stage = data.revenue_stage
    record.business_goal = data.business_goal
    record.current_step = max(record.current_step, 6)
    db.commit(); db.refresh(record)
    return record


@router.post("/step5/creator", response_model=OnboardingResponse)
def save_step5_creator(
    data: Step5CreatorSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    record.creator_platform = data.creator_platform
    record.content_niche = data.content_niche
    record.audience_size = data.audience_size
    record.creator_growth_goal = data.creator_growth_goal
    record.current_step = max(record.current_step, 6)
    db.commit(); db.refresh(record)
    return record


@router.post("/step5/exam", response_model=OnboardingResponse)
def save_step5_exam(
    data: Step5ExamSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    record.exam_type = data.exam_type
    record.attempt_year = data.attempt_year
    record.study_hours_daily = data.study_hours_daily
    record.weak_subjects = data.weak_subjects
    record.current_step = max(record.current_step, 6)
    db.commit(); db.refresh(record)
    return record


# ── STEP 6 — Productivity style ──────────────────────────────────────────────
@router.post("/step6", response_model=OnboardingResponse)
def save_step6(
    data: Step6Schema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    record.productivity_style = data.productivity_style
    record.current_step = max(record.current_step, 7)
    db.commit(); db.refresh(record)
    return record


# ── STEP 7 — 12-month goal + mark complete ───────────────────────────────────
@router.post("/step7", response_model=OnboardingResponse)
def save_step7(
    data: Step7Schema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    record.twelve_month_goal = data.twelve_month_goal
    record.onboarding_completed = True
    record.current_step = 7
    db.commit(); db.refresh(record)
    return record


# ── SKIP onboarding ──────────────────────────────────────────────────────────
@router.post("/skip", response_model=OnboardingResponse)
def skip_onboarding(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    record.onboarding_completed = True
    db.commit(); db.refresh(record)
    return record