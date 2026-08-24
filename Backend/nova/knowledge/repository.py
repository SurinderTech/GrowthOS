"""
Backend/nova/knowledge/repository.py

Backwards-compatibility module re-exporting KnowledgeRepository from Backend.nova.rag.repository.
"""

from Backend.nova.rag.repository import KnowledgeRepository

__all__ = ["KnowledgeRepository"]
