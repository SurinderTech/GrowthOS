from __future__ import annotations

from Backend.ai.base_agent import BaseAgent
from Backend.ai.model_router import TaskType


class MissionPlannerAgent(BaseAgent):
    """Creates long-term, multi-month execution plans / roadmaps."""

    name = "mission_planner"
    description = "Creates long-term multi-month execution plans toward a goal."
    prompt_file = "mission_planner.md"
    task_type = TaskType.PLANNING
    expects_json = True
    temperature = 0.8
    timeout = 25.0
