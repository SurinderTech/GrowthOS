"""
Backend/nova/knowledge/manager.py

Backwards-compatibility module re-exporting KnowledgeManager from Backend.nova.rag.manager.
"""

from Backend.nova.rag.manager import KnowledgeManager, get_knowledge_manager

__all__ = ["KnowledgeManager", "get_knowledge_manager"]
