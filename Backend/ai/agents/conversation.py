from __future__ import annotations

from typing import Any

from Backend.ai.base_agent import BaseAgent
from Backend.ai.memory import MemoryContext
from Backend.ai.model_router import TaskType


class ConversationAgent(BaseAgent):
    """General-purpose, friendly assistant persona."""

    name = "conversation"
    description = "General assistant — friendly, direct conversation."
    prompt_file = "conversation.md"
    task_type = TaskType.CHAT
    expects_json = False
    temperature = 0.8
    timeout = 15.0

    def run(self, context: MemoryContext, *, message: str, **kwargs: Any) -> Any:
        return super().run(context, message=message, **kwargs)
