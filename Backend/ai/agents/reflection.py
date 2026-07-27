from __future__ import annotations

from typing import Any

from Backend.ai.base_agent import BaseAgent
from Backend.ai.memory import MemoryContext
from Backend.ai.model_router import TaskType


class ReflectionAgent(BaseAgent):
    """Creates end-of-day reflections and weekly reviews."""

    name = "reflection"
    description = "End-of-day / weekly reflection grounded in actual activity."
    prompt_file = "reflection.md"
    task_type = TaskType.REFLECTION
    expects_json = True
    temperature = 0.7
    timeout = 20.0

    def run(self, context: MemoryContext, *, period: str = "day", **kwargs: Any) -> Any:
        return super().run(context, period=period, **kwargs)
