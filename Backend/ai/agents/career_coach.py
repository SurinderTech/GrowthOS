from __future__ import annotations

from typing import Any

from Backend.ai.base_agent import BaseAgent
from Backend.ai.memory import MemoryContext
from Backend.ai.model_router import TaskType


class CareerCoachAgent(BaseAgent):
    """Resume improvements, interview prep, career planning."""

    name = "career_coach"
    description = "Career advice grounded in the user's profile and stated request."
    prompt_file = "career_coach.md"
    task_type = TaskType.PLANNING
    expects_json = True
    temperature = 0.6
    timeout = 20.0

    def run(self, context: MemoryContext, *, request: str, **kwargs: Any) -> Any:
        return super().run(context, request=request, **kwargs)
