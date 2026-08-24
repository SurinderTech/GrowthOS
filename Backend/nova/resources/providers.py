"""
Backend/nova/resources/providers.py

Provider Abstractions for NOVA Resource Intelligence & Candidate Discovery.
Bridges to Web Research Engine (Step 5), RAG Vector Store (Step 6/6.1), and User-Provided Resources.
"""

from __future__ import annotations

import logging
import urllib.parse
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from Backend.nova.resources.types import ResourceItem, ResourceType
from Backend.nova.research import get_research_engine
from Backend.nova.rag.repository import KnowledgeRepository
from Backend.nova.rag.embeddings import EmbeddingProvider

logger = logging.getLogger("growthos.nova.resources.providers")


def infer_resource_type_and_platform(url: str, title: str) -> tuple[ResourceType, str, str]:
    """Infers ResourceType, provider platform, and source domain from URL and title."""
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]

    lower_title = title.lower()

    if "youtube.com" in domain or "youtu.be" in domain:
        return ResourceType.VIDEO, "YouTube", domain
    elif "docs." in domain or "developer." in domain or "documentation" in lower_title or "official docs" in lower_title:
        return ResourceType.DOCUMENTATION, "Documentation", domain
    elif "coursera.org" in domain or "udemy.com" in domain or "edx.org" in domain or "course" in lower_title:
        return ResourceType.COURSE, "Course Platform", domain
    elif "leetcode.com" in domain or "hackerrank.com" in domain or "geeksforgeeks.org" in domain or "practice" in lower_title or "problems" in lower_title:
        return ResourceType.PRACTICE_SET, "Practice Arena", domain
    elif "github.com" in domain or "project" in lower_title or "repository" in lower_title:
        return ResourceType.PROJECT, "GitHub / Code", domain
    elif "article" in lower_title or "medium.com" in domain or "dev.to" in domain:
        return ResourceType.ARTICLE, "Tech Publication", domain
    elif "tutorial" in lower_title:
        return ResourceType.TUTORIAL, "Tutorial Site", domain
    else:
        return ResourceType.OTHER, domain.capitalize() if domain else "Web", domain


class BaseResourceProvider:
    """Abstract interface for resource candidate discovery providers."""

    def discover_candidates(
        self,
        query_text: str,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
        top_k: int = 10,
    ) -> List[ResourceItem]:
        raise NotImplementedError


class WebResearchResourceProvider(BaseResourceProvider):
    """Discovers candidate learning resources using Step 5 Web Research Engine."""

    def discover_candidates(
        self,
        query_text: str,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
        top_k: int = 10,
    ) -> List[ResourceItem]:
        candidates: List[ResourceItem] = []
        try:
            engine = get_research_engine()
            payload = engine.research(query_text, max_results=top_k, fetch_content=False)
            for res in payload.results:
                r_type, platform, domain = infer_resource_type_and_platform(res.url, res.title)
                candidates.append(
                    ResourceItem(
                        title=res.title,
                        description=res.snippet,
                        url=res.url,
                        canonical_url=res.url,
                        resource_type=r_type,
                        provider_platform=platform,
                        source_domain=domain,
                    )
                )
            logger.info("[WEB_RESOURCE_PROVIDER] Discovered %d web candidates", len(candidates))
        except Exception as exc:
            logger.warning("[WEB_RESOURCE_PROVIDER] Web discovery failed safely: %s", exc)

        return candidates


class RAGResourceProvider(BaseResourceProvider):
    """Discovers internal platform and user document resources using Step 6/6.1 RAG Engine."""

    def __init__(self, embedding_provider: Optional[EmbeddingProvider] = None):
        self.embedding_provider = embedding_provider or EmbeddingProvider()

    def discover_candidates(
        self,
        query_text: str,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
        top_k: int = 5,
    ) -> List[ResourceItem]:
        candidates: List[ResourceItem] = []
        if not db:
            return candidates

        try:
            q_vector = self.embedding_provider.embed_text(query_text)
            results = KnowledgeRepository.search_chunks(
                db=db,
                query_embedding=q_vector,
                user_id=user_id,
                top_k=top_k,
            )
            for res in results:
                candidates.append(
                    ResourceItem(
                        title=f"Stored Document: {res.title}",
                        description=res.chunk_text[:250] + "...",
                        url=f"growthos://knowledge/{res.document_id}",
                        resource_type=ResourceType.DOCUMENTATION,
                        provider_platform="GrowthOS Knowledge Base",
                        source_domain="growthos.internal",
                        metadata={"document_id": res.document_id, "chunk_id": res.chunk_id},
                    )
                )
            logger.info("[RAG_RESOURCE_PROVIDER] Discovered %d internal knowledge candidates", len(candidates))
        except Exception as exc:
            logger.warning("[RAG_RESOURCE_PROVIDER] RAG discovery failed safely: %s", exc)

        return candidates


class UserProvidedResourceProvider(BaseResourceProvider):
    """Fetches resources saved or supplied directly by the user."""

    def discover_candidates(
        self,
        query_text: str,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
        top_k: int = 5,
    ) -> List[ResourceItem]:
        candidates: List[ResourceItem] = []
        if not db or not user_id:
            return candidates

        try:
            from Backend.nova.resources.models import UserResourceModel, ResourceModel
            user_uuid = UUID(str(user_id))
            query = (
                db.query(ResourceModel, UserResourceModel)
                .join(UserResourceModel, ResourceModel.id == UserResourceModel.resource_id)
                .filter(UserResourceModel.user_id == user_uuid)
                .limit(top_k)
            )
            rows = query.all()
            for res_m, user_m in rows:
                candidates.append(
                    ResourceItem(
                        id=str(res_m.id),
                        title=res_m.title,
                        description=res_m.description or "",
                        url=res_m.url,
                        canonical_url=res_m.canonical_url,
                        resource_type=ResourceType(res_m.resource_type) if res_m.resource_type in ResourceType._value2member_map_ else ResourceType.OTHER,
                        provider_platform=res_m.provider_platform or "User Saved",
                        source_domain=res_m.source_domain,
                        subject=res_m.subject,
                        topic=res_m.topic,
                        difficulty=res_m.difficulty or "intermediate",
                        estimated_duration_mins=res_m.estimated_duration_mins,
                        is_user_provided=user_m.is_user_provided,
                    )
                )
            logger.info("[USER_RESOURCE_PROVIDER] Discovered %d user-supplied candidates", len(candidates))
        except Exception as exc:
            logger.debug("[USER_RESOURCE_PROVIDER] User resource query failed safely: %s", exc)

        return candidates
