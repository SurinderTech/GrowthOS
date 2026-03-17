# schemas/smart_task.py
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class SmartTaskOut(BaseModel):
    id                : UUID
    title             : str
    question          : str
    description       : Optional[str]
    difficulty        : str
    category          : str
    skill_tag         : Optional[str]
    resource_url      : Optional[str]
    priority          : str
    estimated_minutes : int
    xp_reward         : int
    completed         : bool
    completed_at      : Optional[datetime]
    user_answer       : Optional[str]
    ai_feedback       : Optional[str]

    class Config:
        from_attributes = True


class SubmitAnswerRequest(BaseModel):
    task_id    : UUID
    user_answer: str    # their solution/response to the question


class SubmitAnswerResponse(BaseModel):
    task_id    : UUID
    xp_earned  : int
    ai_feedback: str
    completed  : bool