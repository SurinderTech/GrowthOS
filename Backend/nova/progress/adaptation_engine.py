"""
Backend/nova/progress/adaptation_engine.py

Adaptation Signal Engine for NOVA Progress Engine.
Translates detected progress signals into structured AdaptationSignal items for the Step 9 Planner.
"""

from __future__ import annotations

import logging
from typing import List

from Backend.nova.progress.types import (
    AdaptationSignal,
    AdaptationSignalType,
    ProgressSignal,
    ProgressSignalType,
)

logger = logging.getLogger("growthos.nova.progress.adaptation_engine")


class AdaptationSignalEngine:
    """
    Generates adaptation signals for Step 9 Planner.
    """

    def generate_adaptation_signals(
        self,
        signals: List[ProgressSignal],
    ) -> List[AdaptationSignal]:
        """
        Maps ProgressSignal items to AdaptationSignal recommendations.
        """
        adaptations: List[AdaptationSignal] = []

        for sig in signals:
            if sig.signal_type == ProgressSignalType.STRUGGLING:
                adaptations.append(
                    AdaptationSignal(
                        adaptation_type=AdaptationSignalType.INSERT_PREREQUISITE,
                        reason="User experienced significant time deviation or failure on task.",
                        recommended_action="Consider inserting a prerequisite foundational task or review session.",
                        confidence=0.85,
                        target_task_id=sig.affected_task_id,
                    )
                )
            elif sig.signal_type == ProgressSignalType.INCONSISTENT:
                adaptations.append(
                    AdaptationSignal(
                        adaptation_type=AdaptationSignalType.REDUCE_WORKLOAD,
                        reason="User skipped multiple consecutive execution tasks.",
                        recommended_action="Reduce daily workload volume to rebuild consistent study habit.",
                        confidence=0.90,
                        target_task_id=sig.affected_task_id,
                    )
                )
            elif sig.signal_type == ProgressSignalType.CAPACITY_HIGHER:
                adaptations.append(
                    AdaptationSignal(
                        adaptation_type=AdaptationSignalType.INCREASE_WORKLOAD,
                        reason="User completed task significantly faster than estimated pace.",
                        recommended_action="Consider accelerating milestone timeline or introducing advanced tasks.",
                        confidence=0.80,
                        target_task_id=sig.affected_task_id,
                    )
                )

        logger.info("[ADAPTATION_ENGINE] Generated %d adaptation signals for planner", len(adaptations))
        return adaptations
