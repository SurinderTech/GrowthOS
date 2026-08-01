"""
schemas/onboarding.py
Pydantic schemas for all 7 onboarding steps.
"""

from pydantic import BaseModel
from typing import Optional, List, Any
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
    experience_level: Optional[str] = None


# ── Step 3 ───────────────────────────────────────────────────────────────────
class Step3Schema(BaseModel):
    daily_time: Optional[str] = None  # 30min | 1hour | 2-3hours | 4+hours
    daily_commitment_hours: Optional[str] = None
    primary_goal: Optional[str] = None


# ── Step 4 ───────────────────────────────────────────────────────────────────
class Step4Schema(BaseModel):
    interests: Optional[List[str]] = []
    daily_commitment_hours: Optional[str] = None


# ── Step 5 — Student ─────────────────────────────────────────────────────────
class Step5StudentSchema(BaseModel):
    education_level: Optional[str] = None
    field_of_study: Optional[str] = None
    career_goal: Optional[str] = None
    degree_level: Optional[str] = None
    graduation_year: Optional[str] = None
    target_role: Optional[str] = None


# ── Step 5 — Freelancer ──────────────────────────────────────────────────────
class Step5FreelancerSchema(BaseModel):
    primary_skill: Optional[str] = None
    experience_level: Optional[str] = None
    monthly_income_goal: Optional[str] = None
    freelance_platforms: Optional[List[str]] = []
    services_offered: Optional[List[str]] = []
    freelance_niche: Optional[str] = None
    current_clients: Optional[str] = None


# ── Step 5 — Business Owner ──────────────────────────────────────────────────
class Step5BusinessSchema(BaseModel):
    business_type: Optional[str] = None
    team_size: Optional[str] = None
    revenue_stage: Optional[str] = None
    business_challenge: Optional[str] = None
    business_goal: Optional[str] = None
    business_stage: Optional[str] = None
    business_industry: Optional[str] = None
    target_mrr: Optional[str] = None


# ── Step 5 — Creator ─────────────────────────────────────────────────────────
class Step5CreatorSchema(BaseModel):
    creator_platform: Optional[str] = None
    content_platform: Optional[str] = None
    content_niche: Optional[str] = None
    audience_size: Optional[str] = None
    creator_growth_goal: Optional[str] = None
    target_followers: Optional[str] = None


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
    user_type: Optional[str] = None
    primary_goal: Optional[str] = None
    daily_time: Optional[str] = None
    interests: Optional[List[Any]] = None
    productivity_style: Optional[str] = None
    twelve_month_goal: Optional[str] = None
    onboarding_completed: bool = False
    current_step: int = 1

    class Config:
        from_attributes = True