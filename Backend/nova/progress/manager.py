"""
Backend/nova/progress/manager.py

High-Level Progress & Execution Intelligence Orchestrator for NOVA (Step 10).
Coordinates Event Ingestion, Multidimensional Progress Calculation, Signal Detection, and Planner Adaptation Signals.
"""

from __future__ import annotations

import logging
import time
from typing import List, Optional, TYPE_CHECKING
from uuid import UUID
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.progress.types import (
    ExecutionEventRecord,
    ProgressPayload,
    ProgressSnapshot,
)
from Backend.nova.progress.event_ingestor import ExecutionEventIngestor
from Backend.nova.progress.calculator import ProgressCalculator
from Backend.nova.progress.signal_detector import SignalDetector
from Backend.nova.progress.adaptation_engine import AdaptationSignalEngine

logger = logging.getLogger("growthos.nova.progress.manager")


class ProgressManager:
    """
    High-level Orchestrator for Execution Events and Multidimensional Progress Intelligence.
    """

    def __init__(
        self,
        ingestor: Optional[ExecutionEventIngestor] = None,
        calculator: Optional[ProgressCalculator] = None,
        detector: Optional[SignalDetector] = None,
        adaptation_engine: Optional[AdaptationSignalEngine] = None,
    ):
        self.ingestor = ingestor or ExecutionEventIngestor()
        self.calculator = calculator or ProgressCalculator()
        self.detector = detector or SignalDetector()
        self.adaptation_engine = adaptation_engine or AdaptationSignalEngine()

    def record_and_analyze_event(
        self,
        event: ExecutionEventRecord,
        state: Optional[NovaState] = None,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
        estimated_duration_mins: int = 60,
    ) -> ProgressPayload:
        """
        Executes complete event ingestion, progress snapshot computation, signal detection, and adaptation signaling.
        """
        start_time = time.monotonic()
        u_id = user_id or str(event.user_id)

        # 1. Ingest Event with Idempotency & Tenant Ownership Checks
        success, msg = self.ingestor.ingest_event(event, db=db, authenticated_user_id=u_id)

        events_list = [event]

        # 2. Compute Multidimensional Progress Snapshot
        snapshot = self.calculator.compute_snapshot(events_list, estimated_duration_mins=estimated_duration_mins, state=state)

        # 3. Detect Active Execution Signals (Struggle, Inconsistency, Capacity, Mismatch)
        signals = self.detector.detect_signals(events_list, snapshot)

        # 4. Generate Adaptation Signals for Step 9 Planner
        adaptations = self.adaptation_engine.generate_adaptation_signals(signals)

        duration_ms = round((time.monotonic() - start_time) * 1000.0, 2)

        payload = ProgressPayload(
            user_id=u_id,
            plan_id=event.plan_id,
            snapshot=snapshot,
            active_signals=signals,
            adaptation_signals=adaptations,
            recent_events=events_list,
            execution_time_ms=duration_ms,
        )

        logger.info(
            "[PROGRESS_MANAGER] Processed event for user=%s task=%s in %.2fms (signals=%d, adaptations=%d)",
            u_id,
            event.task_id,
            duration_ms,
            len(signals),
            len(adaptations),
        )

        return payload


# Global singleton instance
_default_progress_manager: Optional[ProgressManager] = None


def get_progress_manager() -> ProgressManager:
    global _default_progress_manager
    if _default_progress_manager is None:
        _default_progress_manager = ProgressManager()
    return _default_progress_manager
