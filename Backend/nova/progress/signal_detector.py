"""
Backend/nova/progress/signal_detector.py

Signal Detector for NOVA Progress Intelligence Engine.

Detects execution signals from event streams and time-ratio snapshots.

Design transparency
-------------------
These signals are derived from heuristic thresholds informed by common
productivity and spaced-repetition research (e.g. time-on-task overruns as
proxies for cognitive load, consecutive skips as proxies for motivation loss).
They have NOT been validated against a controlled user study.

Each signal carries:
  - `confidence`      — model confidence in the detection (0.0–1.0)
  - `heuristic_basis` — plain-language description of the rule that fired
  - `evidence`        — raw data points that triggered the signal

Consumers (the LLM reasoning node, the adaptation engine) should treat these
as informative signals, not ground truth, and apply their own judgement.
"""

from __future__ import annotations

import logging
from typing import List

from Backend.nova.progress.types import (
    ExecutionEventRecord,
    ExecutionEventType,
    ProgressSignal,
    ProgressSignalType,
    ProgressSnapshot,
)

logger = logging.getLogger("growthos.nova.progress.signal_detector")

# ── Tunable thresholds (centralised for easy calibration) ──────────────────────
STRUGGLE_TIME_RATIO: float = 1.5   # actual / estimated > this → struggling
STRUGGLE_FAIL_COUNT: int = 2       # ≥ this many TASK_FAILED events → struggling
INCONSISTENT_SKIP_COUNT: int = 2   # ≥ this many TASK_SKIPPED events → inconsistent
CAPACITY_TIME_RATIO: float = 0.6   # actual / estimated < this → higher capacity

# Confidence values are intentionally conservative given the heuristic basis.
CONFIDENCE_STRUGGLE: float = 0.72
CONFIDENCE_INCONSISTENT: float = 0.80
CONFIDENCE_CAPACITY: float = 0.68
CONFIDENCE_DIFFICULTY_EXPLICIT: float = 1.00   # user self-report → highest confidence
CONFIDENCE_ON_TRACK: float = 0.90


class SignalDetector:
    """
    Detects execution-intelligence signals from event streams and time ratios.

    Limitation notice
    -----------------
    All detection rules are threshold-based heuristics. No machine-learning
    model or controlled study has validated that these thresholds accurately
    represent real learning behaviour. Confidence values are manually assigned
    and should be re-calibrated once real user data becomes available.
    """

    def detect_signals(
        self,
        events: List[ExecutionEventRecord],
        snapshot: ProgressSnapshot,
    ) -> List[ProgressSignal]:
        """
        Returns a list of ProgressSignals for the provided event batch.

        Parameters
        ----------
        events   : Ordered list of execution events for one task.
        snapshot : Pre-computed progress snapshot (time ratios, percentages).

        Returns
        -------
        List[ProgressSignal] — empty only if `events` is empty.
        """
        signals: List[ProgressSignal] = []
        if not events:
            return signals

        latest = events[-1]
        task_id = latest.task_id

        # ── 1. Struggle: time overrun or repeated failures ─────────────────────
        failed_count = sum(1 for e in events if e.event_type == ExecutionEventType.TASK_FAILED)
        time_overrun = snapshot.actual_vs_estimated_ratio >= STRUGGLE_TIME_RATIO
        repeated_fail = failed_count >= STRUGGLE_FAIL_COUNT
        explicit_hard = latest.difficulty_rating == "too_hard"

        if time_overrun or repeated_fail or explicit_hard:
            contributing = []
            if time_overrun:
                contributing.append(
                    f"Time ratio {snapshot.actual_vs_estimated_ratio:.2f}x ≥ threshold {STRUGGLE_TIME_RATIO}x"
                )
            if repeated_fail:
                contributing.append(f"{failed_count} TASK_FAILED events ≥ threshold {STRUGGLE_FAIL_COUNT}")
            if explicit_hard:
                contributing.append("User self-reported difficulty as 'too_hard'")

            signals.append(ProgressSignal(
                signal_type=ProgressSignalType.STRUGGLING,
                title="Struggle Detected",
                description=(
                    f"Task required {snapshot.actual_vs_estimated_ratio:.2f}x the estimated duration "
                    f"or showed repeated failures."
                ),
                confidence=CONFIDENCE_STRUGGLE,
                heuristic_basis=(
                    f"Heuristic: time ratio > {STRUGGLE_TIME_RATIO}x OR ≥ {STRUGGLE_FAIL_COUNT} failures "
                    f"OR explicit 'too_hard' self-report. NOT validated against user studies."
                ),
                evidence=contributing,
                affected_task_id=task_id,
            ))

        # ── 2. Inconsistency: consecutive task skips ────────────────────────────
        skipped_count = sum(1 for e in events if e.event_type == ExecutionEventType.TASK_SKIPPED)
        if skipped_count >= INCONSISTENT_SKIP_COUNT:
            signals.append(ProgressSignal(
                signal_type=ProgressSignalType.INCONSISTENT,
                title="Execution Inconsistency",
                description=f"User skipped {skipped_count} tasks in this batch.",
                confidence=CONFIDENCE_INCONSISTENT,
                heuristic_basis=(
                    f"Heuristic: ≥ {INCONSISTENT_SKIP_COUNT} TASK_SKIPPED events in one analysis window. "
                    f"Does not distinguish intentional deferrals from avoidance."
                ),
                evidence=[f"Skipped task count: {skipped_count}"],
                affected_task_id=task_id,
            ))

        # ── 3. Higher capacity: significantly under estimated time ──────────────
        capacity_ok = snapshot.actual_vs_estimated_ratio <= CAPACITY_TIME_RATIO
        task_done = latest.event_type == ExecutionEventType.TASK_COMPLETED
        if capacity_ok and task_done:
            signals.append(ProgressSignal(
                signal_type=ProgressSignalType.CAPACITY_HIGHER,
                title="Higher Execution Capacity",
                description=(
                    f"Task completed in {snapshot.actual_vs_estimated_ratio:.2f}x the estimated time "
                    f"(threshold: ≤ {CAPACITY_TIME_RATIO}x)."
                ),
                confidence=CONFIDENCE_CAPACITY,
                heuristic_basis=(
                    f"Heuristic: completion time ratio < {CAPACITY_TIME_RATIO}x with TASK_COMPLETED status. "
                    f"May reflect easy task selection rather than true capacity increase."
                ),
                evidence=[f"Time ratio: {snapshot.actual_vs_estimated_ratio:.2f}x"],
                affected_task_id=task_id,
            ))

        # ── 4. Difficulty mismatch: explicit user self-report ───────────────────
        if latest.difficulty_rating in ("too_easy", "too_hard"):
            signals.append(ProgressSignal(
                signal_type=ProgressSignalType.DIFFICULTY_MISMATCH,
                title="Difficulty Mismatch Reported",
                description=f"User explicitly rated task difficulty as '{latest.difficulty_rating}'.",
                confidence=CONFIDENCE_DIFFICULTY_EXPLICIT,
                heuristic_basis=(
                    "Direct user self-report — highest confidence signal. "
                    "No heuristic applied; value taken at face value."
                ),
                evidence=[f"User rating: {latest.difficulty_rating}"],
                affected_task_id=task_id,
            ))

        # ── 5. On-track default ─────────────────────────────────────────────────
        if not signals:
            signals.append(ProgressSignal(
                signal_type=ProgressSignalType.ON_TRACK,
                title="Execution On Track",
                description="Execution pace aligns with plan expectations and no anomalies detected.",
                confidence=CONFIDENCE_ON_TRACK,
                heuristic_basis=(
                    "Default signal when no struggle, inconsistency or difficulty-mismatch "
                    "thresholds are breached."
                ),
                affected_task_id=task_id,
            ))

        logger.info(
            "[SIGNAL_DETECTOR] task=%s signals=%d modes=%s",
            task_id,
            len(signals),
            [s.signal_type.value for s in signals],
        )
        return signals
