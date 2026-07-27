from __future__ import annotations

from Backend.ai.base_agent import BaseAgent
from Backend.ai.model_router import TaskType


class ProgressTrackingAgent(BaseAgent):
    """Measures progress against the user's goal and generates reports."""

    name = "progress_tracking"
    description = "Quantifies progress against the user's goal/target date."
    prompt_file = "progress_tracking.md"
    task_type = TaskType.ANALYSIS
    expects_json = True
    temperature = 0.3
    timeout = 20.0
