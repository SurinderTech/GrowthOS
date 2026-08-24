"""
Backend/tests/test_nova_rag.py

Unit Test Suite verifying direct imports and operations on Backend.nova.rag package.
"""

import unittest
from unittest.mock import MagicMock
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from Backend.db.init_db import Base
from Backend.nova.rag.types import (
    KnowledgeDocument,
    KnowledgeChunk,
    DocumentVisibility,
    SufficiencyLevel,
)
from Backend.nova.rag.ingestor import DocumentIngestor
from Backend.nova.rag.embeddings import EmbeddingProvider, cosine_similarity
from Backend.nova.rag.repository import KnowledgeRepository
from Backend.nova.rag.evaluator import RetrievalSufficiencyEvaluator
from Backend.nova.rag.manager import KnowledgeManager, get_knowledge_manager


class TestNovaRagPackage(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionLocal()
        self.user_id = str(uuid4())
        self.manager = get_knowledge_manager()

    def tearDown(self):
        self.db.close()

    def test_direct_rag_ingestion_and_retrieval(self):
        """Test document ingestion and retrieval directly using Backend.nova.rag."""
        doc = self.manager.ingest_document(
            db=self.db,
            title="RAG Package Dedicated Test",
            content_text="Verifying dedicated rag module package structure.",
            user_id=self.user_id,
        )
        self.assertIsNotNone(doc.id)

        payload, _ = self.manager.retrieve_and_evaluate(
            db=self.db,
            query_text="rag module package structure",
            user_id=self.user_id,
            trigger_web_fallback=False,
        )
        self.assertTrue(len(payload.results) > 0)
        self.assertIn("rag module", payload.results[0].chunk_text)


if __name__ == "__main__":
    unittest.main()
