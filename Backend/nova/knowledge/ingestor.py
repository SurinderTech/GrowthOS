"""
Backend/nova/knowledge/ingestor.py

Backwards-compatibility module re-exporting DocumentIngestor from Backend.nova.rag.ingestor.
"""

from Backend.nova.rag.ingestor import DocumentIngestor

__all__ = ["DocumentIngestor"]
