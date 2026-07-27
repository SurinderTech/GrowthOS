from __future__ import annotations

from typing import Any

from Backend.ai.base_agent import BaseAgent
from Backend.ai.memory import MemoryContext
from Backend.ai.model_router import TaskType


class LearningCoachAgent(BaseAgent):
    """Builds learning plans and tracks skill growth for a topic."""

    name = "learning_coach"
    description = "Builds a sequenced learning plan for a given topic/skill."
    prompt_file = "learning_coach.md"
    task_type = TaskType.PLANNING
    expects_json = True
    temperature = 0.6
    timeout = 20.0

    def run(self, context: MemoryContext, *, topic: str, **kwargs: Any) -> Any:
        return super().run(context, topic=topic, **kwargs)
