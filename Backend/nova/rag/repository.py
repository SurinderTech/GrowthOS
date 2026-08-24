"""
Backend/nova/rag/repository.py

Repository & Vector Store Data Access Layer for User Documents & Document Chunks.
Enforces strict multi-tenant access control and database-native pgvector similarity search.
"""

from __future__ import annotations

import logging
from typing import List, Optional
from uuid import UUID

from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from Backend.nova.rag.models import UserDocument, DocumentChunk
from Backend.nova.rag.types import (
    KnowledgeDocument,
    KnowledgeChunk,
    KnowledgeRetrievalResult,
    DocumentVisibility,
    DocumentStatus,
)
from Backend.nova.rag.embeddings import cosine_similarity

logger = logging.getLogger("growthos.nova.rag.repository")


class KnowledgeRepository:
    """
    CRUD and database-native pgvector retrieval manager with strict multi-tenant user isolation.
    """

    @classmethod
    def save_document(
        cls,
        db: Session,
        doc_model: KnowledgeDocument,
        chunks: List[KnowledgeChunk],
    ) -> UserDocument:
        """Saves KnowledgeDocument and associated DocumentChunks to PostgreSQL."""
        user_uuid: Optional[UUID] = None
        if doc_model.user_id:
            try:
                user_uuid = UUID(doc_model.user_id)
            except ValueError:
                pass

        doc_uuid = UUID(doc_model.id)
        db_doc = UserDocument(
            id=doc_uuid,
            user_id=user_uuid,
            title=doc_model.title,
            source=doc_model.source,
            source_type=doc_model.source_type,
            visibility=doc_model.visibility.value,
            status=doc_model.status.value,
            hash_fingerprint=doc_model.hash_fingerprint,
            subject=doc_model.subject,
            topic=doc_model.topic,
            doc_metadata=doc_model.doc_metadata,
        )
        db.add(db_doc)

        for c in chunks:
            c_uuid = UUID(c.id)
            db_chunk = DocumentChunk(
                id=c_uuid,
                document_id=doc_uuid,
                chunk_index=c.chunk_index,
                chunk_text=c.chunk_text,
                page_number=c.page_number,
                section_title=c.section_title,
                chunk_metadata=c.chunk_metadata,
            )
            db_chunk.set_embedding(c.embedding)
            db.add(db_chunk)

        db.commit()
        db.refresh(db_doc)
        logger.info("[RAG_REPO] Persisted document '%s' with %d chunks", db_doc.title, len(chunks))
        return db_doc

    @classmethod
    def find_existing_by_hash(
        cls,
        db: Session,
        user_id: Optional[str],
        hash_fingerprint: str,
    ) -> Optional[UserDocument]:
        """Finds existing document by hash fingerprint to prevent duplicate ingestion."""
        if not hash_fingerprint:
            return None

        query = db.query(UserDocument).filter(UserDocument.hash_fingerprint == hash_fingerprint)
        if user_id:
            try:
                user_uuid = UUID(user_id)
                query = query.filter(UserDocument.user_id == user_uuid)
            except ValueError:
                pass
        return query.first()

    @classmethod
    def search_chunks(
        cls,
        db: Session,
        query_embedding: List[float],
        user_id: Optional[str] = None,
        top_k: int = 5,
        min_score: float = 0.40,
        subject_filter: Optional[str] = None,
        topic_filter: Optional[str] = None,
        document_id_filter: Optional[str] = None,
    ) -> List[KnowledgeRetrievalResult]:
        """
        Executes vector similarity search with strict multi-tenant access control:
        `(UserDocument.user_id == user_id OR UserDocument.visibility IN ['growthos_public', 'approved_shared'])`.

        On PostgreSQL: Executes 100% database-native vector cosine similarity ranking
        using pgvector `ORDER BY embedding <=> query_embedding LIMIT top_k`.
        On SQLite (unit test mode): Falls back to in-memory cosine similarity scanning.
        """
        user_uuid: Optional[UUID] = None
        if user_id:
            try:
                user_uuid = UUID(user_id)
            except ValueError:
                pass

        if user_uuid:
            access_condition = or_(
                UserDocument.user_id == user_uuid,
                UserDocument.visibility.in_(["growthos_public", "approved_shared"]),
            )
        else:
            access_condition = UserDocument.visibility.in_(["growthos_public", "approved_shared"])

        is_postgresql = False
        try:
            if db and db.bind and "postgresql" in db.bind.dialect.name.lower():
                is_postgresql = True
        except Exception:
            pass

        if is_postgresql:
            distance_expr = DocumentChunk.embedding.cosine_distance(query_embedding)

            query = (
                db.query(DocumentChunk, UserDocument, distance_expr.label("distance"))
                .join(UserDocument, DocumentChunk.document_id == UserDocument.id)
                .filter(UserDocument.status == DocumentStatus.READY.value)
                .filter(access_condition)
            )

            if subject_filter:
                query = query.filter(UserDocument.subject == subject_filter)
            if topic_filter:
                query = query.filter(UserDocument.topic == topic_filter)
            if document_id_filter:
                try:
                    doc_uuid = UUID(document_id_filter)
                    query = query.filter(UserDocument.id == doc_uuid)
                except ValueError:
                    pass

            results = query.order_by(distance_expr.asc()).limit(top_k).all()
            scored_candidates: List[KnowledgeRetrievalResult] = []

            for chunk, doc, distance in results:
                dist_val = float(distance) if distance is not None else 1.0
                score = max(0.0, min(1.0, 1.0 - dist_val))

                if score >= min_score:
                    scored_candidates.append(
                        KnowledgeRetrievalResult(
                            chunk_id=str(chunk.id),
                            document_id=str(doc.id),
                            title=doc.title,
                            source=doc.source,
                            chunk_text=chunk.chunk_text,
                            score=score,
                            page_number=chunk.page_number,
                            section_title=chunk.section_title,
                            visibility=DocumentVisibility(doc.visibility),
                        )
                    )
            return scored_candidates

        else:
            query = (
                db.query(DocumentChunk, UserDocument)
                .join(UserDocument, DocumentChunk.document_id == UserDocument.id)
                .filter(UserDocument.status == DocumentStatus.READY.value)
                .filter(access_condition)
            )

            if subject_filter:
                query = query.filter(UserDocument.subject == subject_filter)
            if topic_filter:
                query = query.filter(UserDocument.topic == topic_filter)
            if document_id_filter:
                try:
                    doc_uuid = UUID(document_id_filter)
                    query = query.filter(UserDocument.id == doc_uuid)
                except ValueError:
                    pass

            results: List[tuple[DocumentChunk, UserDocument]] = query.all()
            scored_candidates: List[KnowledgeRetrievalResult] = []

            for chunk, doc in results:
                vector = chunk.get_embedding()
                score = cosine_similarity(query_embedding, vector)

                if score >= min_score:
                    scored_candidates.append(
                        KnowledgeRetrievalResult(
                            chunk_id=str(chunk.id),
                            document_id=str(doc.id),
                            title=doc.title,
                            source=doc.source,
                            chunk_text=chunk.chunk_text,
                            score=score,
                            page_number=chunk.page_number,
                            section_title=chunk.section_title,
                            visibility=DocumentVisibility(doc.visibility),
                        )
                    )

            scored_candidates.sort(key=lambda x: x.score, reverse=True)
            return scored_candidates[:top_k]
