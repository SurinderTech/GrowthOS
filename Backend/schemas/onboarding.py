"""
schemas/onboarding.py
Pydantic schemas for all 7 onboarding steps.
"""

from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


# ── Step 1 ───────────────────────────────────────────────────────────────────
class Step1Schema(BaseModel):
    user_type: str  # student | freelancer | entrepreneur | creator | exam_aspirant | self_growth


# ── Step 2 ───────────────────────────────────────────────────────────────────
class Step2Schema(BaseModel):
    full_name: Optional[str] = None
    age_group: Optional[str] = None
    country: Optional[str] = None
    primary_goal: Optional[str] = None


# ── Step 3 ───────────────────────────────────────────────────────────────────
class Step3Schema(BaseModel):
    daily_time: str  # 30min | 1hour | 2-3hours | 4+hours


# ── Step 4 ───────────────────────────────────────────────────────────────────
class Step4Schema(BaseModel):
    interests: List[str]


# ── Step 5 — Student ─────────────────────────────────────────────────────────
class Step5StudentSchema(BaseModel):
    education_level: Optional[str] = None
    field_of_study: Optional[str] = None
    career_goal: Optional[str] = None


# ── Step 5 — Freelancer ──────────────────────────────────────────────────────
class Step5FreelancerSchema(BaseModel):
    primary_skill: Optional[str] = None
    experience_level: Optional[str] = None
    monthly_income_goal: Optional[str] = None
    services_offered: Optional[List[str]] = []


# ── Step 5 — Business Owner ──────────────────────────────────────────────────
class Step5BusinessSchema(BaseModel):
    business_type: Optional[str] = None
    team_size: Optional[str] = None
    revenue_stage: Optional[str] = None
    business_goal: Optional[str] = None


# ── Step 5 — Creator ─────────────────────────────────────────────────────────
class Step5CreatorSchema(BaseModel):
    creator_platform: Optional[str] = None
    content_niche: Optional[str] = None
    audience_size: Optional[str] = None
    creator_growth_goal: Optional[str] = None


# ── Step 5 — Exam Aspirant ───────────────────────────────────────────────────
class Step5ExamSchema(BaseModel):
    exam_type: Optional[str] = None
    attempt_year: Optional[str] = None
    study_hours_daily: Optional[str] = None
    weak_subjects: Optional[List[str]] = []


# ── Step 6 ───────────────────────────────────────────────────────────────────
class Step6Schema(BaseModel):
    productivity_style: str  # deep_focus | short_bursts | structured | flexible


# ── Step 7 ───────────────────────────────────────────────────────────────────
class Step7Schema(BaseModel):
    twelve_month_goal: str


# ── Full onboarding response ──────────────────────────────────────────────────
class OnboardingResponse(BaseModel):
    id: UUID
    user_id: UUID
    user_type: Optional[str]
    primary_goal: Optional[str]
    daily_time: Optional[str]
    interests: Optional[List[str]]
    productivity_style: Optional[str]
    twelve_month_goal: Optional[str]
    onboarding_completed: bool
    current_step: int

    class Config:
        from_attributes = True