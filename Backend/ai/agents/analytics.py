from __future__ import annotations

from Backend.ai.base_agent import BaseAgent
from Backend.ai.model_router import TaskType


class AnalyticsAgent(BaseAgent):
    """Summarizes user performance; generates dashboard-style narratives."""

    name = "analytics"
    description = "Cross-cutting performance summary — dashboard narrative."
    prompt_file = "analytics.md"
    task_type = TaskType.ANALYSIS
    expects_json = True
    temperature = 0.4
    timeout = 20.0
