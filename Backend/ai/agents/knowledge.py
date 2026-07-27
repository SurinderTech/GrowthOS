from __future__ import annotations

from typing import Any

from Backend.ai.base_agent import BaseAgent
from Backend.ai.memory import MemoryContext
from Backend.ai.model_router import TaskType


class KnowledgeAgent(BaseAgent):
    """Answers user questions using project/profile context."""

    name = "knowledge"
    description = "Answers a question, grounded in the user's context where relevant."
    prompt_file = "knowledge.md"
    task_type = TaskType.CHAT
    expects_json = False
    temperature = 0.5
    timeout = 15.0

    def run(self, context: MemoryContext, *, question: str, **kwargs: Any) -> Any:
        return super().run(context, question=question, **kwargs)
