"""
schemas/growth_plan.py
Pydantic schemas for the Growth Plan system.
"""

from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ── Sub-schemas ───────────────────────────────────────────────────────────────

class SkillSchema(BaseModel):
    name: str
    level: str        # Beginner | Intermediate | Advanced
    progress: int     # 0-100


class GrowthTaskSchema(BaseModel):
    id: Optional[str] = None
    title: str
    xp: int
    difficulty: str   # easy | medium | hard
    task_type: str    # challenge | revision | build | mcq | reading
    completed: bool


class GrowthPhaseSchema(BaseModel):
    id: Optional[str] = None
    phase_number: int
    label: str
    theme: str
    status: str       # locked | active | completed
    progress: int
    xp_total: int
    xp_earned: int
    milestone: Optional[str] = None
    milestone_reward: Optional[str] = None
    skills: List[SkillSchema]
    tasks: List[GrowthTaskSchema]


class WeekDaySchema(BaseModel):
    day: str
    done: int
    total: int


class SmartMessageSchema(BaseModel):
    type: str   # info | warning | success
    text: str


# ── Full Plan Response ────────────────────────────────────────────────────────

class GrowthPlanResponse(BaseModel):
    id: str
    goal: str
    goal_icon: Optional[str] = "🎯"
    category: Optional[str] = None
    timeline: Optional[str] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    overall_progress: int
    current_phase_id: int
    total_xp: int
    streak: int
    rank: Optional[int] = None
    weekly_graph: List[WeekDaySchema]
    smart_message: SmartMessageSchema
    phases: List[GrowthPhaseSchema]
    generated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ── Task Toggle ───────────────────────────────────────────────────────────────

class TaskToggleResponse(BaseModel):
    success: bool
    task_id: str
    completed: bool
    xp_earned: Optional[int] = None
    phase_progress: Optional[int] = None
    overall_progress: Optional[int] = None