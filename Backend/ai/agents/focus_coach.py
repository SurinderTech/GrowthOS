from __future__ import annotations

from typing import Any

from Backend.ai.base_agent import BaseAgent
from Backend.ai.memory import MemoryContext
from Backend.ai.model_router import TaskType


class FocusCoachAgent(BaseAgent):
    """Helps the user maintain deep work; detects distractions."""

    name = "focus_coach"
    description = "Diagnoses focus/distraction issues and gives one concrete technique."
    prompt_file = "focus_coach.md"
    task_type = TaskType.CHAT
    expects_json = True
    temperature = 0.6
    timeout = 15.0

    def run(self, context: MemoryContext, *, situation: str, **kwargs: Any) -> Any:
        return super().run(context, situation=situation, **kwargs)
