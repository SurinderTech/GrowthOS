"""
Backend/nova/knowledge/models.py

Backwards-compatibility module re-exporting ORM models from Backend.nova.rag.models.
"""

from Backend.nova.rag.models import Base, UserDocument, DocumentChunk, VectorType

__all__ = ["Base", "UserDocument", "DocumentChunk", "VectorType"]
