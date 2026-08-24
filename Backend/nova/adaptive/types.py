"""
Backend/nova/adaptive/types.py

Strongly typed Pydantic models for NOVA Adaptive Planning & Replanning Engine (Step 11).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from Backend.nova.planner.types import PlanningPayload


class AdaptationDecisionType(str, Enum):
    NO_CHANGE = "no_change"
    MONITOR = "monitor"
    REVISE_TASK = "revise_task"
    REORDER_TASKS = "reorder_tasks"
    INSERT_PREREQUISITE = "insert_prerequisite"
    REMOVE_TASK = "remove_task"
    REDUCE_WORKLOAD = "reduce_workload"
    INCREASE_WORKLOAD = "increase_workload"
    ADJUST_DIFFICULTY = "adjust_difficulty"
    ADJUST_TIMELINE = "adjust_timeline"
    CHANGE_RESOURCE = "change_resource"
    REPLAN_PHASE = "replan_phase"
    REPLAN_PLAN = "replan_plan"
    REPLAN_GOAL = "replan_goal"


class AdaptationLevel(str, Enum):
    TASK = "task"
    OBJECTIVE = "objective"
    MILESTONE = "milestone"
    PHASE = "phase"
    PLAN = "plan"
    GOAL = "goal"


class AdaptationThresholdConfig(BaseModel):
    """Centralized configurable adaptation thresholds."""
    min_time_ratio_struggle: float = 1.5
    min_time_ratio_capacity: float = 0.6
    min_consecutive_skips: int = 2
    min_consecutive_failures: int = 2
    cooldown_hours: int = 24


class PlanDiffItem(BaseModel):
    """Specific component difference between plan versions."""
    action_type: str  # "added" | "removed" | "modified" | "moved"
    item_type: str    # "task" | "milestone" | "phase"
    title: str
    description: str = ""
    reason: str = ""


class PlanDiffPayload(BaseModel):
    """Structured plan difference payload."""
    old_version: int = 1
    new_version: int = 2
    diffs: List[PlanDiffItem] = Field(default_factory=list)
    summary: str = "Plan updated based on execution feedback."


class AdaptationDecisionPayload(BaseModel):
    """Structured adaptation decision evaluated from evidence."""
    decision: AdaptationDecisionType = AdaptationDecisionType.NO_CHANGE
    level: AdaptationLevel = AdaptationLevel.TASK
    confidence: float = 0.90
    reason: str = "Execution pace aligns with plan expectations."
    evidence: List[str] = Field(default_factory=list)
    target_task_id: Optional[str] = None
    requires_user_approval: bool = False


class AdaptivePayload(BaseModel):
    """Complete adaptive replanning payload attached to NovaState."""
    user_id: str
    plan_id: Optional[str] = None
    current_version: int = 1
    decision: AdaptationDecisionPayload = Field(default_factory=AdaptationDecisionPayload)
    diff: Optional[PlanDiffPayload] = None
    new_plan_payload: Optional[PlanningPayload] = None
    execution_time_ms: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
