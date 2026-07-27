from __future__ import annotations

from Backend.ai.base_agent import BaseAgent
from Backend.ai.model_router import TaskType


class BehaviorAnalysisAgent(BaseAgent):
    """Learns user behavior, detects productivity patterns, gives insights."""

    name = "behavior_analysis"
    description = "Surfaces behavioral patterns and risk flags from activity data."
    prompt_file = "behavior_analysis.md"
    task_type = TaskType.ANALYSIS
    expects_json = True
    temperature = 0.4
    timeout = 20.0
