"""
Backend/nova/research/engine.py

Research Engine Coordinator for NOVA.
Coordinates query generation, external web search, content fetching, and payload bounding.
"""

from __future__ import annotations

import logging
import time
from typing import List, Optional

from .types import (
    SearchResult,
    ResearchDocument,
    ResearchQueryRequest,
    ResearchContextPayload,
)
from .provider import WebResearchProvider
from .fetcher import ContentFetcher

logger = logging.getLogger("growthos.nova.research.engine")


class ResearchEngine:
    """
    Coordinates multi-step web research pipeline:
    User Query → Search → Normalize → Fetch Content → Bound Payload → Return ResearchContextPayload.
    """

    MAX_QUERIES_PER_TURN: int = 3
    MAX_RESULTS_PER_QUERY: int = 5
    MAX_FETCH_PAGES: int = 2

    def __init__(
        self,
        provider: Optional[WebResearchProvider] = None,
        fetcher: Optional[ContentFetcher] = None,
    ):
        self.provider = provider or WebResearchProvider()
        self.fetcher = fetcher or ContentFetcher()

    def generate_queries(self, user_prompt: str) -> List[str]:
        """
        Generates 1 to 3 search queries for a given user prompt.
        """
        clean_text = user_prompt.strip()
        if not clean_text:
            return []

        queries = [clean_text]

        # Add year/context specific query variation if applicable
        if "skill" in clean_text.lower() or "framework" in clean_text.lower():
            queries.append(f"{clean_text} 2026 documentation")
        elif "latest" in clean_text.lower() or "recent" in clean_text.lower():
            queries.append(f"{clean_text} recent news")

        return queries[: self.MAX_QUERIES_PER_TURN]

    def research(
        self,
        user_prompt: str,
        *,
        max_results: int = 5,
        fetch_content: bool = True,
    ) -> ResearchContextPayload:
        """
        Executes web research pipeline safely.
        """
        start_time = time.monotonic()
        payload = ResearchContextPayload()

        try:
            queries = self.generate_queries(user_prompt)
            payload.queries_executed = queries

            all_results: List[SearchResult] = []
            seen_urls = set()

            for q in queries:
                req = ResearchQueryRequest(query_text=q, max_results=max_results)
                sub_results = self.provider.search(req)
                for res in sub_results:
                    if res.url not in seen_urls:
                        all_results.append(res)
                        seen_urls.add(res.url)

            payload.results = all_results[: self.MAX_RESULTS_PER_QUERY]

            # Fetch detailed page content for top results if requested
            if fetch_content and payload.results:
                fetched_docs: List[ResearchDocument] = []
                for res in payload.results[: self.MAX_FETCH_PAGES]:
                    doc = self.fetcher.fetch_url(res.url, title=res.title)
                    fetched_docs.append(doc)
                payload.documents = fetched_docs

            duration_ms = round((time.monotonic() - start_time) * 1000.0, 2)
            payload.execution_time_ms = duration_ms
            payload.summary = f"Retrieved {len(payload.results)} sources across {len(queries)} queries in {duration_ms}ms"
            logger.info("[RESEARCH_ENGINE] Completed research: %s", payload.summary)
            return payload

        except Exception as exc:
            logger.error("[RESEARCH_ENGINE] Research execution failed: %s", exc)
            payload.summary = f"Research failed safely: {str(exc)}"
            return payload


# Global singleton instance
_default_research_engine: Optional[ResearchEngine] = None


def get_research_engine() -> ResearchEngine:
    global _default_research_engine
    if _default_research_engine is None:
        _default_research_engine = ResearchEngine()
    return _default_research_engine
