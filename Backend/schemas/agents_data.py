"""
schemas/agents_data.py
Pydantic request/response models for Resume, Interview, Project, and
Networking agent routers.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID


# ── Resume Agent ──────────────────────────────────────────────────────────────

class ResumeAnalyzeRequest(BaseModel):
    resume_text: str


class ResumeAnalysisOut(BaseModel):
    id: UUID
    ats_score: int
    strengths: List[str]
    improvements: List[str]
    summary: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeSummaryOut(BaseModel):
    latest: Optional[ResumeAnalysisOut] = None
    history: List[ResumeAnalysisOut] = []
    total_analyses: int = 0


# ── Interview Agent ───────────────────────────────────────────────────────────

class InterviewStartRequest(BaseModel):
    role: str
    question_count: int = 5


class InterviewSessionOut(BaseModel):
    id: UUID
    role: str
    questions: List[str]
    answers: Dict
    status: str
    overall_score: Optional[int]
    overall_feedback: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewAnswerRequest(BaseModel):
    question_index: int
    answer: str


class InterviewAnswerResult(BaseModel):
    feedback: str
    score: int


class InterviewSummaryOut(BaseModel):
    latest: Optional[InterviewSessionOut] = None
    history: List[InterviewSessionOut] = []
    total_sessions: int = 0


# ── Project Agent ─────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "idea"          # idea | in_progress | completed
    github_url: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    github_url: Optional[str] = None


class ProjectOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    status: str
    github_url: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Networking Agent ───────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    name: str
    role: Optional[str] = None
    company: Optional[str] = None
    platform: str = "LinkedIn"
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    company: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ContactOut(BaseModel):
    id: UUID
    name: str
    role: Optional[str]
    company: Optional[str]
    platform: str
    status: str
    notes: Optional[str]
    last_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DraftMessageOut(BaseModel):
    message: str
