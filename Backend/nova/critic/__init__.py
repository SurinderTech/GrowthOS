"""
Backend/nova/critic/__init__.py

NOVA Critic, Verification Engine & Controlled Retry Engine Package (Step 8).
Exported symbols for evaluation actions, verification results, verifier engine, and critic manager.
"""

from Backend.nova.critic.types import (
    CriticAction,
    VerificationStatus,
    VerificationIntensity,
    ClaimVerificationItem,
    CriticScoreDetails,
    CriticResult,
    VerificationResult,
    CriticPayload,
)
from Backend.nova.critic.models import CriticTelemetryModel
from Backend.nova.critic.evaluator import CriticEvaluator, determine_verification_intensity
from Backend.nova.critic.verifier import VerifierEngine, is_valid_url
from Backend.nova.critic.decision import ControlledRetryEngine
from Backend.nova.critic.manager import CriticManager, get_critic_manager

__all__ = [
    "CriticAction",
    "VerificationStatus",
    "VerificationIntensity",
    "ClaimVerificationItem",
    "CriticScoreDetails",
    "CriticResult",
    "VerificationResult",
    "CriticPayload",
    "CriticTelemetryModel",
    "CriticEvaluator",
    "determine_verification_intensity",
    "VerifierEngine",
    "is_valid_url",
    "ControlledRetryEngine",
    "CriticManager",
    "get_critic_manager",
]
