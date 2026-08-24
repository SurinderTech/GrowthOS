"""
Backend/nova/critic/types.py

Strongly typed Pydantic models for NOVA Critic, Verification Engine & Controlled Retry Engine (Step 8).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CriticAction(str, Enum):
    PASS = "pass"
    REVISE = "revise"
    RESEARCH_AGAIN = "research_again"
    RETRIEVE_AGAIN = "retrieve_again"
    RESOURCE_AGAIN = "resource_again"
    REPLAN = "replan"
    ASK_CLARIFICATION = "ask_clarification"
    ABORT = "abort"


class VerificationStatus(str, Enum):
    SUPPORTED = "supported"
    UNSUPPORTED = "unsupported"
    UNCERTAIN = "uncertain"


class VerificationIntensity(str, Enum):
    NONE = "none"
    LIGHT = "light"
    FULL = "full"


class ClaimVerificationItem(BaseModel):
    """Detailed claim-level grounding verification item."""
    claim_text: str
    status: VerificationStatus = VerificationStatus.UNCERTAIN
    source_citation: Optional[str] = None
    verification_notes: str = ""


class CriticScoreDetails(BaseModel):
    """Granular score breakdown across 12 explicit evaluation dimensions."""
    intent_score: float = 1.0
    context_score: float = 1.0
    evidence_score: float = 1.0
    accuracy_score: float = 1.0
    completeness_score: float = 1.0
    relevance_score: float = 1.0
    personalization_score: float = 1.0
    actionability_score: float = 1.0
    freshness_score: float = 1.0
    resource_score: float = 1.0
    safety_score: float = 1.0
    consistency_score: float = 1.0


class CriticResult(BaseModel):
    """Evaluation output produced by Critic Engine."""
    passed: bool = True
    overall_score: float = 1.0
    confidence: float = 1.0
    action: CriticAction = CriticAction.PASS
    retry_reason: Optional[str] = None
    issues: List[str] = Field(default_factory=list)
    missing_info: List[str] = Field(default_factory=list)
    unsupported_claims: List[str] = Field(default_factory=list)
    score_details: CriticScoreDetails = Field(default_factory=CriticScoreDetails)


class VerificationResult(BaseModel):
    """Result of deterministic and semantic verifications."""
    deterministic_checks_passed: bool = True
    claims_verified: int = 0
    total_claims: int = 0
    claim_details: List[ClaimVerificationItem] = Field(default_factory=list)
    issues: List[str] = Field(default_factory=list)


class CriticPayload(BaseModel):
    """Telemetry and execution payload attached to NovaState."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    draft_response: str = ""
    critic_result: CriticResult = Field(default_factory=CriticResult)
    verification_result: VerificationResult = Field(default_factory=VerificationResult)
    execution_attempt: int = 1
    retry_count: int = 0
    trace_history: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
