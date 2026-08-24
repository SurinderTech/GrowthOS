"""
Backend/nova/rag/manager.py

High-level Knowledge Base & RAG Orchestrator for NOVA.
Handles document ingestion, vector retrieval, sufficiency scoring, and Step 5 web research fallback.
"""

from __future__ import annotations

import logging
import time
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from Backend.nova.rag.types import (
    KnowledgeDocument,
    KnowledgeChunk,
    KnowledgeRetrievalResult,
    KnowledgeContextPayload,
    DocumentVisibility,
    SufficiencyLevel,
)
from Backend.nova.rag.ingestor import DocumentIngestor
from Backend.nova.rag.embeddings import EmbeddingProvider
from Backend.nova.rag.repository import KnowledgeRepository
from Backend.nova.rag.evaluator import RetrievalSufficiencyEvaluator
from Backend.nova.research import get_research_engine, ResearchContextPayload

logger = logging.getLogger("growthos.nova.rag.manager")


class KnowledgeManager:
    """
    High-level Orchestrator for Document Ingestion, Vector Search, and Web Fallback.
    """

    def __init__(
        self,
        ingestor: Optional[DocumentIngestor] = None,
        embedding_provider: Optional[EmbeddingProvider] = None,
        evaluator: Optional[RetrievalSufficiencyEvaluator] = None,
    ):
        self.embedding_provider = embedding_provider or EmbeddingProvider()
        self.ingestor = ingestor or DocumentIngestor(embedding_provider=self.embedding_provider)
        self.evaluator = evaluator or RetrievalSufficiencyEvaluator()

    def ingest_document(
        self,
        db: Session,
        *,
        title: str,
        content_text: str,
        user_id: Optional[str] = None,
        source: str = "user_upload",
        source_type: str = "note",
        visibility: DocumentVisibility = DocumentVisibility.PRIVATE_USER,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> KnowledgeDocument:
        """
        Ingests a document or note into the Knowledge Base.
        Deduplicates identical uploads via SHA256 hash.
        """
        clean_text = self.ingestor.clean_text(content_text)
        doc_hash = self.ingestor.compute_hash(clean_text)

        existing = KnowledgeRepository.find_existing_by_hash(db, user_id, doc_hash)
        if existing:
            logger.info("[RAG_MGR] Found existing document '%s' (hash=%s)", existing.title, doc_hash[:8])
            return KnowledgeDocument(
                id=str(existing.id),
                user_id=str(existing.user_id) if existing.user_id else None,
                title=existing.title,
                source=existing.source,
                source_type=existing.source_type,
                visibility=DocumentVisibility(existing.visibility),
                hash_fingerprint=existing.hash_fingerprint,
                subject=existing.subject,
                topic=existing.topic,
            )

        doc_model, chunks = self.ingestor.process_document(
            title=title,
            content_text=clean_text,
            user_id=user_id,
            source=source,
            source_type=source_type,
            visibility=visibility,
            subject=subject,
            topic=topic,
        )

        KnowledgeRepository.save_document(db, doc_model, chunks)
        return doc_model

    def retrieve_and_evaluate(
        self,
        db: Optional[Session],
        *,
        query_text: str,
        user_id: Optional[str] = None,
        top_k: int = 5,
        trigger_web_fallback: bool = True,
        subject_filter: Optional[str] = None,
        topic_filter: Optional[str] = None,
        document_id_filter: Optional[str] = None,
    ) -> Tuple[KnowledgeContextPayload, Optional[ResearchContextPayload]]:
        """
        Executes RAG Retrieval, evaluates sufficiency, and triggers Step 5 Web Fallback if insufficient.
        """
        start_time = time.monotonic()
        payload = KnowledgeContextPayload(query_text=query_text)
        research_payload: Optional[ResearchContextPayload] = None

        if not db:
            logger.info("[RAG_MGR] No DB session provided -> triggering Step 5 Web Fallback")
            payload.sufficiency = SufficiencyLevel.INSUFFICIENT
            if trigger_web_fallback:
                research_engine = get_research_engine()
                research_payload = research_engine.research(query_text, max_results=5)
                payload.web_fallback_used = True
            return payload, research_payload

        try:
            query_vector = self.embedding_provider.embed_text(query_text)

            candidates = KnowledgeRepository.search_chunks(
                db=db,
                query_embedding=query_vector,
                user_id=user_id,
                top_k=top_k,
                subject_filter=subject_filter,
                topic_filter=topic_filter,
                document_id_filter=document_id_filter,
            )
            payload.results = candidates

            sufficiency = self.evaluator.evaluate(query_text, candidates)
            payload.sufficiency = sufficiency

            if trigger_web_fallback and sufficiency in (SufficiencyLevel.INSUFFICIENT, SufficiencyLevel.HYBRID):
                logger.info("[RAG_MGR] Sufficiency is %s -> Triggering Step 5 Web Fallback", sufficiency.value)
                research_engine = get_research_engine()
                research_payload = research_engine.research(query_text, max_results=5)
                payload.web_fallback_used = True

            duration_ms = round((time.monotonic() - start_time) * 1000.0, 2)
            payload.execution_time_ms = duration_ms
            payload.summary = f"Retrieved {len(candidates)} chunks (sufficiency={sufficiency.value}, web_fallback={payload.web_fallback_used}) in {duration_ms}ms"
            logger.info("[RAG_MGR] RAG completion: %s", payload.summary)
            return payload, research_payload

        except Exception as exc:
            logger.error("[RAG_MGR] RAG retrieval failed safely: %s", exc)
            payload.summary = f"RAG failed safely: {str(exc)}"
            payload.sufficiency = SufficiencyLevel.INSUFFICIENT
            if trigger_web_fallback:
                try:
                    research_payload = get_research_engine().research(query_text, max_results=5)
                    payload.web_fallback_used = True
                except Exception:
                    pass
            return payload, research_payload


# Global singleton instance
_default_knowledge_manager: Optional[KnowledgeManager] = None


def get_knowledge_manager() -> KnowledgeManager:
    global _default_knowledge_manager
    if _default_knowledge_manager is None:
        _default_knowledge_manager = KnowledgeManager()
    return _default_knowledge_manager
