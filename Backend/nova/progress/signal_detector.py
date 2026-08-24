"""
Backend/nova/progress/signal_detector.py

Signal Detector for NOVA Progress Engine.
Analyzes execution history and time ratios to detect struggle, inconsistency, capacity deviation, and difficulty mismatches.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from Backend.nova.progress.types import (
    ExecutionEventRecord,
    ExecutionEventType,
    ProgressSignal,
    ProgressSignalType,
    ProgressSnapshot,
)

logger = logging.getLogger("growthos.nova.progress.signal_detector")


class SignalDetector:
    """
    Detects execution intelligence signals from event streams and time ratios.
    """

    def detect_signals(
        self,
        events: List[ExecutionEventRecord],
        snapshot: ProgressSnapshot,
    ) -> List[ProgressSignal]:
        """
        Detects active progress signals.
        """
        signals: List[ProgressSignal] = []
        if not events:
            return signals

        latest_event = events[-1]
        task_id = latest_event.task_id

        # 1. Struggle Detection (Time ratio > 1.5x or repeated failures)
        failed_count = sum(1 for e in events if e.event_type == ExecutionEventType.TASK_FAILED)
        if snapshot.actual_vs_estimated_ratio >= 1.5 or failed_count >= 2 or latest_event.difficulty_rating == "too_hard":
            signals.append(
                ProgressSignal(
                    signal_type=ProgressSignalType.STRUGGLING,
                    title="Struggle Detected",
                    description=f"Task required {snapshot.actual_vs_estimated_ratio}x expected duration.",
                    confidence=0.85,
                    evidence=[
                        f"Actual time / estimated ratio: {snapshot.actual_vs_estimated_ratio}x",
                        f"Failed execution events count: {failed_count}",
                    ],
                    affected_task_id=task_id,
                )
            )

        # 2. Inconsistency Detection (Consecutive skips)
        skipped_count = sum(1 for e in events if e.event_type == ExecutionEventType.TASK_SKIPPED)
        if skipped_count >= 2:
            signals.append(
                ProgressSignal(
                    signal_type=ProgressSignalType.INCONSISTENT,
                    title="Execution Inconsistency",
                    description=f"User skipped {skipped_count} consecutive execution tasks.",
                    confidence=0.90,
                    evidence=[f"Skipped tasks count: {skipped_count}"],
                    affected_task_id=task_id,
                )
            )

        # 3. Higher Capacity Detection (Time ratio < 0.6x and completed)
        if snapshot.actual_vs_estimated_ratio <= 0.6 and latest_event.event_type == ExecutionEventType.TASK_COMPLETED:
            signals.append(
                ProgressSignal(
                    signal_type=ProgressSignalType.CAPACITY_HIGHER,
                    title="Higher Execution Capacity",
                    description="Task completed significantly faster than estimated pace.",
                    confidence=0.80,
                    evidence=[f"Actual time / estimated ratio: {snapshot.actual_vs_estimated_ratio}x"],
                    affected_task_id=task_id,
                )
            )

        # 4. Difficulty Mismatch Detection
        if latest_event.difficulty_rating in ("too_easy", "too_hard"):
            signals.append(
                ProgressSignal(
                    signal_type=ProgressSignalType.DIFFICULTY_MISMATCH,
                    title="Difficulty Mismatch Reported",
                    description=f"User explicitly rated task difficulty as '{latest_event.difficulty_rating}'.",
                    confidence=1.00,
                    evidence=[f"User rating: {latest_event.difficulty_rating}"],
                    affected_task_id=task_id,
                )
            )

        # 5. Default Healthy On-Track Signal
        if not signals:
            signals.append(
                ProgressSignal(
                    signal_type=ProgressSignalType.ON_TRACK,
                    title="Execution On Track",
                    description="User execution pace aligns with plan expectations.",
                    confidence=0.95,
                    affected_task_id=task_id,
                )
            )

        logger.info("[SIGNAL_DETECTOR] Detected %d active signals for task=%s", len(signals), task_id)
        return signals
