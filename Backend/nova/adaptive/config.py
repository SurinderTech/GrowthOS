"""
Backend/nova/adaptive/config.py

Centralized Configurable Adaptation Thresholds for NOVA Adaptive Engine.
"""

from __future__ import annotations

from Backend.nova.adaptive.types import AdaptationThresholdConfig

_default_threshold_config = AdaptationThresholdConfig()


def get_adaptation_thresholds() -> AdaptationThresholdConfig:
    """Returns the current AdaptationThresholdConfig singleton."""
    global _default_threshold_config
    return _default_threshold_config


def set_adaptation_thresholds(config: AdaptationThresholdConfig) -> None:
    """Updates the AdaptationThresholdConfig singleton."""
    global _default_threshold_config
    _default_threshold_config = config
