"""
Backend/nova/research/types.py

Strongly typed Pydantic models for NOVA's Web Research & External Search Layer.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    """Normalized search result metadata from external search provider."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    url: str
    snippet: str
    source_domain: str = "web"
    published_date: Optional[str] = None
    relevance_score: float = 1.0
    retrieved_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ResearchDocument(BaseModel):
    """Bounded, sanitized content text retrieved from an external webpage."""
    url: str
    title: str
    content_text: str
    summary: Optional[str] = None
    domain: str = "web"
    retrieved_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "success"  # "success" | "truncated" | "failed"


class ResearchQueryRequest(BaseModel):
    """Search request parameter model."""
    query_text: str
    max_results: int = 5
    fetch_content: bool = False


class ResearchContextPayload(BaseModel):
    """Complete research payload injected into NovaState."""
    queries_executed: List[str] = Field(default_factory=list)
    results: List[SearchResult] = Field(default_factory=list)
    documents: List[ResearchDocument] = Field(default_factory=list)
    summary: Optional[str] = None
    execution_time_ms: float = 0.0
