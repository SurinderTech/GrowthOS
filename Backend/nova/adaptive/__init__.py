"""
Backend/nova/adaptive/__init__.py

NOVA Adaptive Planning & Replanning Engine Package (Step 11).
Exported symbols for adaptation decisions, threshold config, plan diffs, replanner, and adaptive manager.
"""

from Backend.nova.adaptive.types import (
    AdaptationDecisionType,
    AdaptationLevel,
    AdaptationThresholdConfig,
    PlanDiffItem,
    PlanDiffPayload,
    AdaptationDecisionPayload,
    AdaptivePayload,
)
from Backend.nova.adaptive.models import (
    NovaAdaptationDecisionModel,
    NovaPlanRevisionModel,
    NovaPlanDiffModel,
    NovaAdaptationOutcomeModel,
)
from Backend.nova.adaptive.config import get_adaptation_thresholds, set_adaptation_thresholds
from Backend.nova.adaptive.cooldown import AdaptationCooldownManager
from Backend.nova.adaptive.decision_engine import AdaptationDecisionEngine
from Backend.nova.adaptive.diff_calculator import PlanDiffCalculator
from Backend.nova.adaptive.replanner import AdaptiveReplanner
from Backend.nova.adaptive.manager import AdaptivePlanningManager, get_adaptive_manager

__all__ = [
    "AdaptationDecisionType",
    "AdaptationLevel",
    "AdaptationThresholdConfig",
    "PlanDiffItem",
    "PlanDiffPayload",
    "AdaptationDecisionPayload",
    "AdaptivePayload",
    "NovaAdaptationDecisionModel",
    "NovaPlanRevisionModel",
    "NovaPlanDiffModel",
    "NovaAdaptationOutcomeModel",
    "get_adaptation_thresholds",
    "set_adaptation_thresholds",
    "AdaptationCooldownManager",
    "AdaptationDecisionEngine",
    "PlanDiffCalculator",
    "AdaptiveReplanner",
    "AdaptivePlanningManager",
    "get_adaptive_manager",
]
