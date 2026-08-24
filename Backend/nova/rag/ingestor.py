"""
Backend/nova/rag/ingestor.py

Document Ingestion, Parser, Text Cleaner, and Chunker for NOVA RAG Engine.
Handles document hashing, deduplication detection, character chunking, and embedding generation.
"""

from __future__ import annotations

import hashlib
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from Backend.nova.rag.types import (
    KnowledgeDocument,
    KnowledgeChunk,
    DocumentVisibility,
    DocumentStatus,
)
from Backend.nova.rag.embeddings import EmbeddingProvider

logger = logging.getLogger("growthos.nova.rag.ingestor")


class DocumentIngestor:
    """
    Parses, cleans, chunks, and embeds raw text documents.
    Enforces chunk size and overlap limits.
    """

    DEFAULT_CHUNK_SIZE: int = 500
    DEFAULT_CHUNK_OVERLAP: int = 50

    def __init__(self, embedding_provider: Optional[EmbeddingProvider] = None):
        self.embedding_provider = embedding_provider or EmbeddingProvider()

    @classmethod
    def compute_hash(cls, text: str) -> str:
        """Computes SHA256 fingerprint hash of raw document content."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    @classmethod
    def clean_text(cls, raw_text: str) -> str:
        """Strips control sequences and normalizes whitespace."""
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", raw_text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def chunk_text(
        self,
        text: str,
        *,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    ) -> List[Tuple[str, Optional[int], Optional[str]]]:
        """
        Splits document text into overlapping chunks.
        Returns List of (chunk_text, page_number, section_title).
        """
        clean = self.clean_text(text)
        if not clean:
            return []

        if len(clean) <= chunk_size:
            return [(clean, 1, "General")]

        chunks: List[Tuple[str, Optional[int], Optional[str]]] = []
        start = 0
        text_len = len(clean)
        page_num = 1

        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunk_slice = clean[start:end]

            if end < text_len:
                last_period = chunk_slice.rfind(". ")
                if last_period > chunk_size // 2:
                    end = start + last_period + 1
                    chunk_slice = clean[start:end]

            chunks.append((chunk_slice.strip(), page_num, f"Section {len(chunks)+1}"))
            start += chunk_size - chunk_overlap
            page_num += 1

        return chunks

    def process_document(
        self,
        *,
        title: str,
        content_text: str,
        user_id: Optional[str] = None,
        source: str = "user_upload",
        source_type: str = "note",
        visibility: DocumentVisibility = DocumentVisibility.PRIVATE_USER,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        doc_metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[KnowledgeDocument, List[KnowledgeChunk]]:
        """
        Parses, chunks, and embeds input document content.
        """
        clean_content = self.clean_text(content_text)
        doc_hash = self.compute_hash(clean_content)

        doc = KnowledgeDocument(
            user_id=user_id,
            title=title,
            source=source,
            source_type=source_type,
            visibility=visibility,
            status=DocumentStatus.READY if clean_content else DocumentStatus.FAILED,
            hash_fingerprint=doc_hash,
            subject=subject,
            topic=topic,
            doc_metadata=doc_metadata or {},
        )

        raw_chunks = self.chunk_text(clean_content)
        chunk_models: List[KnowledgeChunk] = []

        for idx, (chunk_str, page_no, sec_title) in enumerate(raw_chunks):
            embedding_vector = self.embedding_provider.embed_text(chunk_str)
            chunk_models.append(
                KnowledgeChunk(
                    document_id=doc.id,
                    chunk_text=chunk_str,
                    chunk_index=idx,
                    embedding=embedding_vector,
                    page_number=page_no,
                    section_title=sec_title,
                )
            )

        logger.info("[INGESTOR] Processed doc '%s' into %d chunks", title, len(chunk_models))
        return doc, chunk_models
