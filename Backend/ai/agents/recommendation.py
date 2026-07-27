from __future__ import annotations

from typing import Any

from Backend.ai.base_agent import BaseAgent
from Backend.ai.memory import MemoryContext
from Backend.ai.model_router import TaskType


class RecommendationAgent(BaseAgent):
    """Suggests missions, habits, and improvements."""

    name = "recommendation"
    description = "Suggests missions/habits/skills/resources tailored to the user."
    prompt_file = "recommendation.md"
    task_type = TaskType.JSON
    expects_json = True
    temperature = 0.7
    timeout = 18.0

    def run(self, context: MemoryContext, *, recommendation_type: str = "general", **kwargs: Any) -> Any:
        return super().run(context, recommendation_type=recommendation_type, **kwargs)
