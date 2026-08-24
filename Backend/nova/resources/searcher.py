"""
Backend/nova/resources/searcher.py

Contextual Search Query Generator & Multi-Source Candidate Aggregator for NOVA Resource Engine.
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple, TYPE_CHECKING
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.resources.types import ResourceItem, ResourceMode
from Backend.nova.resources.providers import (
    BaseResourceProvider,
    WebResearchResourceProvider,
    RAGResourceProvider,
    UserProvidedResourceProvider,
)

logger = logging.getLogger("growthos.nova.resources.searcher")


def infer_resource_mode(user_message: str) -> ResourceMode:
    """Infers ResourceMode from user query keywords and intent."""
    msg = user_message.lower()

    if any(k in msg for k in ["practice", "problem set", "exercise", "challenges", "quiz", "test"]):
        return ResourceMode.PRACTICE
    elif any(k in msg for k in ["stuck", "don't understand", "struggling", "confused", "visual explanation"]):
        return ResourceMode.UNDERSTAND
    elif any(k in msg for k in ["revision", "revise", "quick notes", "summary", "cheat sheet"]):
        return ResourceMode.REVISE
    elif any(k in msg for k in ["build", "project", "create app", "portfolio"]):
        return ResourceMode.BUILD
    elif any(k in msg for k in ["prepare", "exam", "interview", "test prep", "syllabus"]):
        return ResourceMode.PREPARE
    elif any(k in msg for k in ["deep dive", "research paper", "whitepaper"]):
        return ResourceMode.RESEARCH
    else:
        return ResourceMode.LEARN


class ResourceSearcher:
    """
    Constructs contextual search queries using NovaState and aggregates candidate resources from providers.
    """

    def __init__(self, providers: Optional[List[BaseResourceProvider]] = None):
        self.providers = providers or [
            UserProvidedResourceProvider(),
            RAGResourceProvider(),
            WebResearchResourceProvider(),
        ]

    def construct_contextual_queries(
        self,
        user_message: str,
        state: Optional[NovaState] = None,
        mode: ResourceMode = ResourceMode.LEARN,
    ) -> List[str]:
        """
        Intelligently constructs targeted, context-rich search queries.
        Uses user level, primary goal, roadmap, and current topic.
        """
        clean_msg = user_message.strip()

        if not state:
            return [clean_msg]

        u_level = state.user.experience_level or "beginner"
        u_goal = state.user.primary_goal or state.current_goal.active_mission_title or ""
        r_phase = state.roadmap_context.current_phase_theme or ""

        queries: List[str] = []

        if mode == ResourceMode.PRACTICE:
            queries.append(f"{clean_msg} {u_level} practice problems exercises")
            queries.append(f"{clean_msg} coding challenges")
        elif mode == ResourceMode.UNDERSTAND:
            queries.append(f"{clean_msg} {u_level} visual explanation tutorial")
            queries.append(f"concept explanation {clean_msg}")
        elif mode == ResourceMode.BUILD:
            queries.append(f"{clean_msg} project tutorial step by step")
        elif mode == ResourceMode.PREPARE:
            queries.append(f"{clean_msg} {u_goal} preparation guide")
        else:  # LEARN / REVISE
            context_addon = f"{u_level} {r_phase}".strip()
            queries.append(f"{clean_msg} {context_addon} tutorial guide".strip())

        if clean_msg not in queries:
            queries.insert(0, clean_msg)

        return queries[:3]

    def discover(
        self,
        user_message: str,
        state: Optional[NovaState] = None,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
        mode: ResourceMode = ResourceMode.LEARN,
        max_candidates: int = 15,
    ) -> Tuple[List[ResourceItem], List[str]]:
        """
        Executes multi-query candidate discovery and deduplicates candidates by URL.
        """
        queries = self.construct_contextual_queries(user_message, state, mode)
        aggregated: List[ResourceItem] = []
        seen_urls: set[str] = set()

        for q in queries:
            for p in self.providers:
                candidates = p.discover_candidates(query_text=q, db=db, user_id=user_id, top_k=5)
                for item in candidates:
                    norm_url = item.url.lower().strip()
                    if norm_url not in seen_urls:
                        seen_urls.add(norm_url)
                        aggregated.append(item)

                if len(aggregated) >= max_candidates:
                    break
            if len(aggregated) >= max_candidates:
                break

        logger.info("[RESOURCE_SEARCHER] Discovered %d unique candidate resources from %d queries", len(aggregated), len(queries))
        return aggregated[:max_candidates], queries
