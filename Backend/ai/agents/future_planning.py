from __future__ import annotations

from typing import Any

from Backend.ai.base_agent import BaseAgent
from Backend.ai.memory import MemoryContext
from Backend.ai.model_router import TaskType


class FuturePlanningAgent(BaseAgent):
    """Weekly / monthly / quarterly planning."""

    name = "future_planning"
    description = "Time-boxed plan (week/month/quarter) built on the active mission."
    prompt_file = "future_planning.md"
    task_type = TaskType.PLANNING
    expects_json = True
    temperature = 0.7
    timeout = 20.0

    def run(self, context: MemoryContext, *, horizon: str = "week", **kwargs: Any) -> Any:
        return super().run(context, horizon=horizon, **kwargs)
