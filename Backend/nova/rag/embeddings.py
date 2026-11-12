"""
Backend/nova/rag/embeddings.py

Provider-Agnostic Vector Embedding Interface for NOVA RAG Engine.

Embedding strategy (in priority order):
  1. Google text-embedding-004 via google-genai SDK  (768-dim, real semantic)
  2. OpenAI text-embedding-3-small via openai SDK    (1536-dim truncated to 384, real semantic)
  3. Deterministic SHA-256 word+bigram hashing       (384-dim, NO semantic meaning — fallback only)

The fallback is clearly labelled and only activates when no API key is available.
Callers can inspect `provider.embedding_mode` ("google" | "openai" | "hash_fallback") to
know which path is active.
"""

from __future__ import annotations

import hashlib
import logging
import math
import os
from typing import Any, List, Optional

logger = logging.getLogger("growthos.nova.rag.embeddings")


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculates cosine similarity between two vectors. Returns 0.0 on dimension mismatch."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    na = math.sqrt(sum(a * a for a in v1))
    nb = math.sqrt(sum(b * b for b in v2))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return max(0.0, min(1.0, float(dot / (na * nb))))


class EmbeddingProvider:
    """
    Provider-agnostic Embedding Service.

    Tries real semantic embedding APIs first; falls back to a deterministic
    hash-based approximation when no API key is configured.

    Check `self.embedding_mode` after construction to know which path is active:
      - "google"        → Google text-embedding-004 (768-dim)
      - "openai"        → OpenAI text-embedding-3-small (384-dim)
      - "hash_fallback" → SHA-256 word+bigram hashing (384-dim, NOT semantic)
    """

    HASH_DIMENSION: int = 384
    VERSION: str = "v2"

    def __init__(
        self,
        google_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
    ):
        self._google_key = google_api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self._openai_key = openai_api_key or os.getenv("OPENAI_API_KEY") or os.getenv("OPENROUTER_API_KEY")

        self.embedding_mode: str
        self.MODEL_NAME: str
        self.DIMENSION: int

        if self._google_key:
            self.embedding_mode = "google"
            self.MODEL_NAME = "text-embedding-004"
            self.DIMENSION = 768
            logger.info("[EMBEDDINGS] Mode=google model=text-embedding-004 dim=768")
        elif self._openai_key:
            self.embedding_mode = "openai"
            self.MODEL_NAME = "text-embedding-3-small"
            self.DIMENSION = 384
            logger.info("[EMBEDDINGS] Mode=openai model=text-embedding-3-small dim=384")
        else:
            self.embedding_mode = "hash_fallback"
            self.MODEL_NAME = "hash-sha256-bigram-384"
            self.DIMENSION = self.HASH_DIMENSION
            logger.warning(
                "[EMBEDDINGS] Mode=hash_fallback — no API key found. "
                "Embeddings are NOT semantically meaningful. "
                "Set GOOGLE_API_KEY or OPENAI_API_KEY for real semantic search."
            )

    # ── Public API ────────────────────────────────────────────────────────────

    def get_metadata(self) -> dict[str, Any]:
        return {
            "model_name": self.MODEL_NAME,
            "dimension": self.DIMENSION,
            "version": self.VERSION,
            "embedding_mode": self.embedding_mode,
            "is_semantic": self.embedding_mode != "hash_fallback",
        }

    def embed_text(self, text: str) -> List[float]:
        """Generates a normalized embedding vector for input text."""
        clean = text.strip()
        if not clean:
            return [0.0] * self.DIMENSION

        if self.embedding_mode == "google":
            return self._embed_google(clean)
        if self.embedding_mode == "openai":
            return self._embed_openai(clean)
        return self._embed_hash_fallback(clean)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generates embedding vectors for a list of texts."""
        return [self.embed_text(t) for t in texts]

    # ── Real embedding backends ────────────────────────────────────────────────

    def _embed_google(self, text: str) -> List[float]:
        """
        Calls Google text-embedding-004 via google-genai SDK.
        Falls back to hash on API error.
        """
        try:
            from google import genai as google_genai  # type: ignore
            client = google_genai.Client(api_key=self._google_key)
            result = client.models.embed_content(
                model="models/text-embedding-004",
                contents=text,
            )
            vec: List[float] = result.embeddings[0].values
            return self._normalize(vec)
        except Exception as exc:
            logger.error("[EMBEDDINGS] Google API error (%s) — falling back to hash", exc)
            return self._embed_hash_fallback(text)

    def _embed_openai(self, text: str) -> List[float]:
        """
        Calls OpenAI text-embedding-3-small, truncated to 384 dims.
        Falls back to hash on API error.
        """
        try:
            import openai  # type: ignore
            client = openai.OpenAI(api_key=self._openai_key)
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
                dimensions=384,
            )
            vec: List[float] = response.data[0].embedding
            return self._normalize(vec)
        except Exception as exc:
            logger.error("[EMBEDDINGS] OpenAI API error (%s) — falling back to hash", exc)
            return self._embed_hash_fallback(text)

    # ── Hash fallback (explicitly NOT semantic) ────────────────────────────────

    def _embed_hash_fallback(self, text: str) -> List[float]:
        """
        Deterministic SHA-256 word+bigram hashing producing a 384-dim vector.

        WARNING: This is a bag-of-words approximation. It is NOT a semantic
        embedding. Cosine similarity scores will reflect lexical overlap, not
        meaning. Only activated when no embedding API key is available.
        """
        words = [w.lower().strip(".,!?:;\"'()") for w in text.split() if len(w) > 1]
        vector = [0.0] * self.HASH_DIMENSION

        for word in words:
            h = int(hashlib.sha256(word.encode()).hexdigest(), 16)
            vector[h % self.HASH_DIMENSION] += 2.0
            vector[(h >> 8) % self.HASH_DIMENSION] += 1.0

        for i in range(len(words) - 1):
            bigram = f"{words[i]}_{words[i + 1]}"
            h = int(hashlib.sha256(bigram.encode()).hexdigest(), 16)
            vector[(h >> 4) % self.HASH_DIMENSION] += 1.5

        return self._normalize(vector)

    @staticmethod
    def _normalize(vector: List[float]) -> List[float]:
        norm = math.sqrt(sum(x * x for x in vector))
        if norm == 0.0:
            return vector
        return [x / norm for x in vector]
