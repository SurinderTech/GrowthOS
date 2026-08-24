"""
Backend/nova/knowledge/evaluator.py

Backwards-compatibility module re-exporting RetrievalSufficiencyEvaluator from Backend.nova.rag.evaluator.
"""

from Backend.nova.rag.evaluator import RetrievalSufficiencyEvaluator

__all__ = ["RetrievalSufficiencyEvaluator"]
