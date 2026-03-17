# app/models/schemas.py
# All Pydantic request/response models

from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ── Practice ──────────────────────────────────────────────────────────────────

class PracticeQuestion(BaseModel):
    id: str
    profession: str
    skill: str
    difficulty: str          # easy | medium | practical
    type: str                # mcq | short | coding
    question: str
    options: Optional[List[str]] = None   # MCQ only
    answer: Optional[str] = None          # MCQ: "0","1","2","3" | short: None
    explanation: str
    created_by: str          # "ai" | "admin"


class PracticeSessionRequest(BaseModel):
    user_id: str


class PracticeSessionResponse(BaseModel):
    questions: List[PracticeQuestion]
    session_id: str


class AnswerSubmission(BaseModel):
    user_id: str
    session_id: str
    question_id: str
    answer: str
    time_taken_seconds: int


class AnswerResult(BaseModel):
    is_correct: bool
    explanation: str
    skill_progress_delta: int   # e.g. +2


class SessionCompleteRequest(BaseModel):
    user_id: str
    session_id: str
    answers: List[AnswerSubmission]


class SessionCompleteResponse(BaseModel):
    correct_count: int
    total_count: int
    accuracy_pct: int
    streak_updated: bool
    new_streak: int
    skill_updates: List[dict]   # [{"skill": "FastAPI", "delta": 4}]


# ── Streaks ───────────────────────────────────────────────────────────────────

class StreakStatus(BaseModel):
    user_id: str
    current_streak: int
    longest_streak: int
    last_practice_date: Optional[date]
    practiced_today: bool


# ── Missions ──────────────────────────────────────────────────────────────────

class Mission(BaseModel):
    id: str
    user_id: str
    title: str
    type: str               # practice | review | project | learning
    completed: bool
    deadline: str           # "11:59 PM"
    date: date


class MissionCompleteRequest(BaseModel):
    user_id: str
    mission_id: str


class MissionControlResponse(BaseModel):
    greeting: str           # "Good Evening"
    missions: List[Mission]
    completed_count: int
    total_count: int
    streak: int
    deadline: str           # "11:59 PM"


# ── Batch Activity ────────────────────────────────────────────────────────────

class BatchActivityItem(BaseModel):
    id: str
    user_id: str
    user_name: str
    avatar: str             # first letter of name
    activity_type: str      # mission_completed | practice_started | ...
    activity_text: str
    created_at: datetime


class BatchActivityResponse(BaseModel):
    activities: List[BatchActivityItem]


# ── Accountability ────────────────────────────────────────────────────────────

class AccountabilityRequest(BaseModel):
    user_id: str


class AccountabilityResponse(BaseModel):
    message: str
    type: str               # "warning" | "motivational" | "celebration"
    show: bool              # False if user already completed missions