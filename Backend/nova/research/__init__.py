"""
Backend/nova/research/__init__.py

NOVA Web Research & External Search Layer (Step 5).
"""

from .types import (
    SearchResult,
    ResearchDocument,
    ResearchQueryRequest,
    ResearchContextPayload,
)
from .provider import WebResearchProvider
from .fetcher import ContentFetcher
from .engine import ResearchEngine, get_research_engine

__all__ = [
    "SearchResult",
    "ResearchDocument",
    "ResearchQueryRequest",
    "ResearchContextPayload",
    "WebResearchProvider",
    "ContentFetcher",
    "ResearchEngine",
    "get_research_engine",
]
