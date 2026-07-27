"""
Backend/ai/agents/__init__.py

Every concrete agent lives in its own module (one prompt template each).
This module is the registry the Orchestrator uses to look agents up by name.
"""

from __future__ import annotations

from Backend.ai.agents.accountability_coach import AccountabilityCoachAgent
from Backend.ai.agents.analytics import AnalyticsAgent
from Backend.ai.agents.behavior_analysis import BehaviorAnalysisAgent
from Backend.ai.agents.career_coach import CareerCoachAgent
from Backend.ai.agents.conversation import ConversationAgent
from Backend.ai.agents.focus_coach import FocusCoachAgent
from Backend.ai.agents.future_planning import FuturePlanningAgent
from Backend.ai.agents.knowledge import KnowledgeAgent
from Backend.ai.agents.learning_coach import LearningCoachAgent
from Backend.ai.agents.mission_planner import MissionPlannerAgent
from Backend.ai.agents.progress_tracking import ProgressTrackingAgent
from Backend.ai.agents.recommendation import RecommendationAgent
from Backend.ai.agents.reflection import ReflectionAgent
from Backend.ai.agents.task_planning import TaskPlanningAgent

AGENT_CLASSES = {
    agent.name: agent
    for agent in [
        TaskPlanningAgent,
        MissionPlannerAgent,
        AccountabilityCoachAgent,
        BehaviorAnalysisAgent,
        ProgressTrackingAgent,
        ReflectionAgent,
        LearningCoachAgent,
        CareerCoachAgent,
        FocusCoachAgent,
        KnowledgeAgent,
        RecommendationAgent,
        ConversationAgent,
        FuturePlanningAgent,
        AnalyticsAgent,
    ]
}

__all__ = [
    "AGENT_CLASSES",
    "TaskPlanningAgent",
    "MissionPlannerAgent",
    "AccountabilityCoachAgent",
    "BehaviorAnalysisAgent",
    "ProgressTrackingAgent",
    "ReflectionAgent",
    "LearningCoachAgent",
    "CareerCoachAgent",
    "FocusCoachAgent",
    "KnowledgeAgent",
    "RecommendationAgent",
    "ConversationAgent",
    "FuturePlanningAgent",
    "AnalyticsAgent",
]
