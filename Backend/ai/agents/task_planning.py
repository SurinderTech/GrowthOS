from __future__ import annotations

from Backend.ai.base_agent import BaseAgent
from Backend.ai.model_router import TaskType


class TaskPlanningAgent(BaseAgent):
    """Generates today's tasks; breaks missions into actionable work."""

    name = "task_planning"
    description = "Generates today's tasks from the user's active mission/goal."
    prompt_file = "task_planning.md"
    task_type = TaskType.PLANNING
    expects_json = True
    temperature = 0.7
    timeout = 20.0
