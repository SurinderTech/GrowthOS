"""
Backend/nova/progress/__init__.py

NOVA Execution & Progress Intelligence Engine Package (Step 10).
Exported symbols for execution events, progress signals, snapshots, adaptation signals, and progress manager.
"""

from Backend.nova.progress.types import (
    ExecutionEventType,
    TaskExecutionState,
    ProgressSignalType,
    AdaptationSignalType,
    ExecutionEventRecord,
    ProgressSnapshot,
    ProgressSignal,
    AdaptationSignal,
    ProgressPayload,
)
from Backend.nova.progress.models import (
    NovaExecutionEventModel,
    NovaProgressSnapshotModel,
    NovaProgressSignalModel,
    NovaAdaptationSignalModel,
)
from Backend.nova.progress.event_ingestor import ExecutionEventIngestor
from Backend.nova.progress.calculator import ProgressCalculator
from Backend.nova.progress.signal_detector import SignalDetector
from Backend.nova.progress.adaptation_engine import AdaptationSignalEngine
from Backend.nova.progress.manager import ProgressManager, get_progress_manager

__all__ = [
    "ExecutionEventType",
    "TaskExecutionState",
    "ProgressSignalType",
    "AdaptationSignalType",
    "ExecutionEventRecord",
    "ProgressSnapshot",
    "ProgressSignal",
    "AdaptationSignal",
    "ProgressPayload",
    "NovaExecutionEventModel",
    "NovaProgressSnapshotModel",
    "NovaProgressSignalModel",
    "NovaAdaptationSignalModel",
    "ExecutionEventIngestor",
    "ProgressCalculator",
    "SignalDetector",
    "AdaptationSignalEngine",
    "ProgressManager",
    "get_progress_manager",
]
