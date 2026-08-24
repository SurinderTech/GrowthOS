"""
Backend/nova/memory/types.py

Strongly typed Enums and Pydantic models for NOVA's Personal Memory Layer.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class MemoryType(str, enum.Enum):
    """Categories of user memories."""
    EPISODIC = "episodic"       # What happened?
    SEMANTIC = "semantic"       # What NOVA knows about the user?
    PREFERENCE = "preference"   # What the user prefers?
    GOAL = "goal"               # What the user is trying to accomplish?
    DECISION = "decision"       # What the user has decided?
    BEHAVIORAL = "behavioral"   # What patterns have been observed?


class MemorySource(str, enum.Enum):
    """Source origin of a memory record."""
    EXPLICIT_USER = "explicit_user"     # Highest confidence (User explicitly stated)
    SYSTEM_OBSERVED = "system_observed" # High confidence (Derived from actual system behavior)
    SYSTEM_DERIVED = "system_derived"   # Medium confidence (System calculated metric/insight)
    LLM_INFERRED = "llm_inferred"       # Lower confidence (LLM/system inference)


class MemoryStatus(str, enum.Enum):
    """Lifecycle status of a memory record."""
    ACTIVE = "active"
    ARCHIVED = "archived"
    SUPERSEDED = "superseded"
    DELETED = "deleted"


class MemoryRecord(BaseModel):
    """
    Durable representation of a user memory record.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    memory_type: MemoryType = MemoryType.SEMANTIC
    content: str
    source: MemorySource = MemorySource.EXPLICIT_USER
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    importance: float = Field(default=0.5, ge=0.0, le=1.0)
    status: MemoryStatus = MemoryStatus.ACTIVE
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_accessed_at: Optional[str] = None


class MemoryCandidate(BaseModel):
    """Candidate memory extracted from conversation or state prior to write policy check."""
    memory_type: MemoryType
    content: str
    source: MemorySource
    confidence: float = 1.0
    importance: float = 0.5
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RetrievalQuery(BaseModel):
    """Parameters for memory retrieval and ranking."""
    user_id: str
    query_text: Optional[str] = None
    memory_types: Optional[List[MemoryType]] = None
    min_confidence: float = 0.0
    limit: int = 5
    include_archived: bool = False
