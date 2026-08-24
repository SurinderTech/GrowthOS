"""
Backend/nova/knowledge/embeddings.py

Backwards-compatibility module re-exporting embeddings from Backend.nova.rag.embeddings.
"""

from Backend.nova.rag.embeddings import EmbeddingProvider, cosine_similarity

__all__ = ["EmbeddingProvider", "cosine_similarity"]
