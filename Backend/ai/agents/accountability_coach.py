from __future__ import annotations

from Backend.ai.base_agent import BaseAgent
from Backend.ai.model_router import TaskType


class AccountabilityCoachAgent(BaseAgent):
    """Motivates the user, detects procrastination, suggests next actions."""

    name = "accountability_coach"
    description = "Coaching nudge based on streaks/progress — honest, not just cheerleading."
    prompt_file = "accountability.md"
    task_type = TaskType.CHAT
    expects_json = True
    temperature = 0.7
    timeout = 15.0
