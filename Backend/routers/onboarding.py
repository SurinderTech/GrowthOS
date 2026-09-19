"""
routers/onboarding.py
FastAPI router — all 7 onboarding step endpoints + status + complete + profile.
Protected by JWT auth (get_current_user dependency).
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from Backend.db.session import get_db
from Backend.models.onboarding import UserOnboarding
from Backend.schemas.onboarding import (
    Step1Schema, Step2Schema, Step3Schema, Step4Schema,
    Step5StudentSchema, Step5FreelancerSchema, Step5BusinessSchema,
    Step5CreatorSchema, Step5ExamSchema,
    Step6Schema, Step7Schema, OnboardingResponse
)
from Backend.routers.auth import get_current_user

router = APIRouter(tags=["Onboarding"])


def get_or_create_onboarding(user_id: str, db: Session) -> UserOnboarding:
    """Get existing onboarding record or create a fresh one."""
    record = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()

    if not record:
        record = UserOnboarding(user_id=str(user_id))
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
    return record


# ── GET profile (shared onboarding handoff profile for Nova & Agents) ────────
@router.get("/profile")
def get_onboarding_profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return key onboarding profile summary fields to Nova and specialized agents."""
    record = get_or_create_onboarding(current_user.id, db)
    
    # Try fetching existing learning plan target_role if available
    plan = None
    try:
        from Backend.models.learning_agent import UserLearningPlan
        plan = db.query(UserLearningPlan).filter(UserLearningPlan.user_id == current_user.id).first()
    except Exception:
        pass

    name = (
        getattr(current_user, "full_name", None) or
        getattr(record, "full_name", None) or
        (getattr(current_user, "email", "User").split("@")[0] if getattr(current_user, "email", None) else "User")
    )

    GOAL_TITLE_MAP = {
        "get_job": "landing a job",
        "crack_exam": "cracking your target exam",
        "earn_online": "earning online",
        "build_startup": "building your startup",
        "grow_audience": "growing your audience",
        "become_disciplined": "building self-discipline",
        "grow_career": "career growth",
        "learn_skills": "mastering new skills",
        "build_projects": "building real-world projects",
        "prepare_exams": "exam preparation",
        "build_business": "building a business",
        "financial_independence": "financial independence",
        "improve_discipline": "improving discipline",
    }

    def format_goal_value(val: Any) -> str | None:
        if not val:
            return None
        s_val = str(val).strip()
        if not s_val:
            return None
        if s_val in GOAL_TITLE_MAP:
            return GOAL_TITLE_MAP[s_val]
        if "_" in s_val:
            return s_val.replace("_", " ").title()
        return s_val

    raw_goal = (
        getattr(plan, "target_role", None) or
        getattr(record, "career_goal", None) or
        getattr(record, "primary_skill", None) or
        getattr(record, "field_of_study", None) or
        (f"Clearing {record.exam_type.upper()} Exam" if getattr(record, "exam_type", None) else None) or
        getattr(record, "business_goal", None) or
        getattr(record, "creator_growth_goal", None) or
        getattr(record, "twelve_month_goal", None) or
        getattr(record, "primary_goal", None)
    )

    career_goal = format_goal_value(raw_goal) or "landing a job"

    STYLE_MAP = {
        "deep_focus": "deep focus session",
        "short_bursts": "short burst session",
        "structured": "structured schedule",
        "flexible": "flexible session",
        "evening": "evening session",
        "morning": "morning session",
        "afternoon": "afternoon session",
    }
    raw_style = getattr(record, "productivity_style", None)
    preferred_time_blocks = STYLE_MAP.get(raw_style, raw_style.replace("_", " ") if raw_style else "deep focus session")

    LEVEL_MAP = {
        "beginner": "Beginner",
        "intermediate": "Intermediate",
        "expert": "Expert",
        "advanced": "Advanced",
        "school": "Student",
        "college": "College Student",
    }
    raw_level = getattr(record, "experience_level", None) or getattr(record, "degree_level", None) or getattr(record, "education_level", None)
    current_level = LEVEL_MAP.get(raw_level, raw_level.title() if raw_level else "Beginner")

    raw_hours = getattr(record, "study_hours_daily", None) or getattr(record, "daily_commitment_hours", None) or getattr(record, "daily_time", None) or 2
    raw_hours_str = str(raw_hours).strip()
    if raw_hours_str == "30min":
        daily_study_hours = "0.5"
    elif raw_hours_str == "1hour":
        daily_study_hours = "1"
    elif raw_hours_str == "2-3hours":
        daily_study_hours = "2 to 3"
    elif raw_hours_str == "4+hours":
        daily_study_hours = "4+"
    elif "hour" in raw_hours_str:
        daily_study_hours = raw_hours_str.replace("hours", "").replace("hour", "").strip()
    else:
        daily_study_hours = raw_hours_str

    target_timeline = getattr(record, "target_timeline", None) or "6 months"

    return {
        "name": name,
        "career_goal": career_goal,
        "current_level": current_level,
        "daily_study_hours": daily_study_hours,
        "preferred_time_blocks": preferred_time_blocks,
        "target_timeline": target_timeline,
        "timezone": "UTC"
    }


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
    db.commit(); db.refresh(record)
    return record


# ── STEP 2 — Basic profile & experience ──────────────────────────────────────
@router.post("/step2", response_model=OnboardingResponse)
def save_step2(
    data: Step2Schema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    if data.full_name is not None:
        record.full_name = data.full_name
    if data.age_group is not None:
        record.age_group = data.age_group
    if data.country is not None:
        record.country = data.country
    if data.primary_goal is not None:
        record.primary_goal = data.primary_goal
    if data.experience_level is not None:
        record.experience_level = data.experience_level
    # New: leaderboard batch fields
    if data.institution_name is not None:
        record.institution_name = data.institution_name
    if data.graduation_year is not None:
        record.graduation_year = data.graduation_year

    record.current_step = max(record.current_step, 3)
    db.commit()
    db.refresh(record)

    # Sync leaderboard classification immediately if we have enough info
    if record.graduation_year or record.institution_name:
        try:
            from Backend.services.leaderboard_service import sync_user_classification
            sync_user_classification(current_user.id, record, db)
        except Exception:
            pass

    return record



# ── STEP 3 — Daily time / commitment ─────────────────────────────────────────
@router.post("/step3", response_model=OnboardingResponse)
def save_step3(
    data: Step3Schema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    if getattr(data, "daily_time", None) is not None:
        record.daily_time = data.daily_time
    if getattr(data, "daily_commitment_hours", None) is not None:
        setattr(record, "daily_commitment_hours", data.daily_commitment_hours)
    if getattr(data, "primary_goal", None) is not None:
        record.primary_goal = data.primary_goal

    record.current_step = max(record.current_step, 4)
    db.commit(); db.refresh(record)
    return record


# ── STEP 4 — Daily commitment / Interests ────────────────────────────────────
@router.post("/step4", response_model=OnboardingResponse)
def save_step4(
    data: Step4Schema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    if getattr(data, "interests", None) is not None:
        record.interests = data.interests
    if getattr(data, "daily_commitment_hours", None) is not None:
        setattr(record, "daily_commitment_hours", data.daily_commitment_hours)

    record.current_step = max(record.current_step, 5)
    db.commit(); db.refresh(record)
    return record


# ── STEP 5 — Role specific branches ──────────────────────────────────────────
@router.post("/step5/student", response_model=OnboardingResponse)
def save_step5_student(
    data: Step5StudentSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_or_create_onboarding(current_user.id, db)
    if getattr(data, "education_level", None) is not None:
        record.education_level = data.education_level
    if getattr(data, "field_of_study", None) is not None:
        record.field_of_study = data.field_of_study
    if getattr(data, "career_goal", None) is not None:
        record.career_goal = data.career_goal
    if getattr(data, "degree_level", None) is not None:
        setattr(record, "degree_level", data.degree_level)
    if getattr(data, "graduation_year", None) is not None:
        setattr(record, "graduation_year", data.graduation_year)
    if getattr(data, "target_role", None) is not None:
        setattr(record, "target_role", data.target_role)

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
    if getattr(data, "primary_skill", None) is not None:
        record.primary_skill = data.primary_skill
    if getattr(data, "experience_level", None) is not None:
        record.experience_level = data.experience_level
    if getattr(data, "monthly_income_goal", None) is not None:
        record.monthly_income_goal = data.monthly_income_goal
    if getattr(data, "services_offered", None) is not None:
        record.services_offered = data.services_offered
    if getattr(data, "freelance_platforms", None) is not None:
        record.freelance_platforms = data.freelance_platforms
    if getattr(data, "freelance_niche", None) is not None:
        setattr(record, "freelance_niche", data.freelance_niche)

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
    if getattr(data, "business_type", None) is not None:
        record.business_type = data.business_type
    if getattr(data, "team_size", None) is not None:
        record.team_size = data.team_size
    if getattr(data, "revenue_stage", None) is not None:
        record.revenue_stage = data.revenue_stage
    if getattr(data, "business_challenge", None) is not None:
        record.business_challenge = data.business_challenge
    if getattr(data, "business_goal", None) is not None:
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
    if getattr(data, "creator_platform", None) is not None:
        record.creator_platform = data.creator_platform
    elif getattr(data, "content_platform", None) is not None:
        record.creator_platform = data.content_platform

    if getattr(data, "content_niche", None) is not None:
        record.content_niche = data.content_niche
    if getattr(data, "audience_size", None) is not None:
        record.audience_size = data.audience_size
    if getattr(data, "creator_growth_goal", None) is not None:
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
    if getattr(data, "exam_type", None) is not None:
        record.exam_type = data.exam_type
    if getattr(data, "attempt_year", None) is not None:
        record.attempt_year = data.attempt_year
    if getattr(data, "study_hours_daily", None) is not None:
        record.study_hours_daily = data.study_hours_daily
    if getattr(data, "weak_subjects", None) is not None:
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

    # Populate leaderboard field_key / batch_key / cached_score on completion
    try:
        from Backend.services.leaderboard_service import sync_user_classification
        sync_user_classification(current_user.id, record, db)
    except Exception:
        pass

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