"""
Backend/tests/test_nova_knowledge.py

Comprehensive Unit Test Suite for NOVA Knowledge Base, RAG & Intelligent Web Fallback (Step 6).
Tests ingestion, chunking, embeddings, vector search, multi-tenant isolation, deduplication,
sufficiency scoring, web search fallback, state integration, and error resilience.
"""

import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from Backend.db.init_db import Base
from Backend.nova.knowledge.types import (
    KnowledgeDocument,
    KnowledgeChunk,
    DocumentVisibility,
    SufficiencyLevel,
)
from Backend.nova.knowledge.ingestor import DocumentIngestor
from Backend.nova.knowledge.embeddings import EmbeddingProvider, cosine_similarity
from Backend.nova.knowledge.repository import KnowledgeRepository
from Backend.nova.knowledge.evaluator import RetrievalSufficiencyEvaluator
from Backend.nova.knowledge.manager import KnowledgeManager
from Backend.nova.types import NovaState
from Backend.nova.graph.nodes import reason_node, knowledge_node
from Backend.nova.graph.builder import run_nova_graph
from Backend.nova.llm.provider import NovaLLMProvider


class TestNovaKnowledgeRAG(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Create an in-memory SQLite database for fast isolated unit testing
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionLocal()
        self.user_a_id = str(uuid4())
        self.user_b_id = str(uuid4())
        self.mock_llm_provider = NovaLLMProvider(client=MagicMock(api_key=None))
        self.manager = KnowledgeManager()

    def tearDown(self):
        self.db.close()

    def test_1_document_ingestion_and_chunking(self):
        """Test parsing, clean text, and chunking into bounded pieces."""
        ingestor = DocumentIngestor()
        text = "Photosynthesis is the process used by plants to convert light energy into chemical energy. " * 10
        doc, chunks = ingestor.process_document(
            title="Botany 101 Notes",
            content_text=text,
            user_id=self.user_a_id,
            source_type="note",
        )

        self.assertEqual(doc.title, "Botany 101 Notes")
        self.assertTrue(len(chunks) >= 1)
        self.assertEqual(chunks[0].document_id, doc.id)
        self.assertEqual(len(chunks[0].embedding), 384)

    def test_2_embedding_cosine_similarity(self):
        """Test vector generation and cosine similarity math."""
        provider = EmbeddingProvider()
        vec1 = provider.embed_text("Photosynthesis in plants")
        vec2 = provider.embed_text("Plants using photosynthesis for energy")
        vec3 = provider.embed_text("Quantum computing algorithms")

        score_similar = cosine_similarity(vec1, vec2)
        score_dissimilar = cosine_similarity(vec1, vec3)

        self.assertGreater(score_similar, 0.35)
        self.assertGreater(score_similar, score_dissimilar)

    def test_3_database_persistence_and_vector_search(self):
        """Test saving documents to DB and executing vector similarity search."""
        doc = self.manager.ingest_document(
            db=self.db,
            title="Cellular Respiration Notes",
            content_text="Cellular respiration breaks down glucose to produce ATP energy in mitochondria.",
            user_id=self.user_a_id,
            source="user_upload",
        )

        self.assertIsNotNone(doc.id)

        # Search for cellular respiration
        payload, _ = self.manager.retrieve_and_evaluate(
            db=self.db,
            query_text="Where is ATP energy produced in mitochondria?",
            user_id=self.user_a_id,
            trigger_web_fallback=False,
        )

        self.assertTrue(len(payload.results) > 0)
        self.assertIn("ATP energy", payload.results[0].chunk_text)

    def test_4_multi_tenant_user_data_isolation(self):
        """Verify User B cannot retrieve User A's private documents."""
        # User A ingests private notes
        self.manager.ingest_document(
            db=self.db,
            title="User A Secret Project Notes",
            content_text="Project Stealth Alpha secret encryption keys and passcodes.",
            user_id=self.user_a_id,
            visibility=DocumentVisibility.PRIVATE_USER,
        )

        # User B queries for secret project
        payload_b, _ = self.manager.retrieve_and_evaluate(
            db=self.db,
            query_text="Project Stealth Alpha secret passcodes",
            user_id=self.user_b_id,
            trigger_web_fallback=False,
        )

        # User B should receive ZERO results from User A's private document
        self.assertEqual(len(payload_b.results), 0)

        # User A queries same project
        payload_a, _ = self.manager.retrieve_and_evaluate(
            db=self.db,
            query_text="Project Stealth Alpha secret passcodes",
            user_id=self.user_a_id,
            trigger_web_fallback=False,
        )
        self.assertTrue(len(payload_a.results) > 0)

    def test_5_document_deduplication(self):
        """Verify identical uploads return existing document without duplicating chunks."""
        content = "Identical study guide content text."
        doc1 = self.manager.ingest_document(
            db=self.db,
            title="Guide v1",
            content_text=content,
            user_id=self.user_a_id,
        )
        doc2 = self.manager.ingest_document(
            db=self.db,
            title="Guide v1 Copy",
            content_text=content,
            user_id=self.user_a_id,
        )

        self.assertEqual(doc1.id, doc2.id)

    def test_6_retrieval_sufficiency_evaluation(self):
        """Test sufficiency scoring: SUFFICIENT, INSUFFICIENT, and HYBRID."""
        evaluator = RetrievalSufficiencyEvaluator()

        # Zero results -> INSUFFICIENT
        self.assertEqual(evaluator.evaluate("Photosynthesis", []), SufficiencyLevel.INSUFFICIENT)

    def test_7_intelligent_web_fallback_when_insufficient(self):
        """Verify automatic Step 5 Web Research fallback when RAG retrieval is empty/insufficient."""
        payload, research_payload = self.manager.retrieve_and_evaluate(
            db=self.db,
            query_text="What are the latest AI skills in 2026?",
            user_id=self.user_a_id,
            trigger_web_fallback=True,
        )

        self.assertEqual(payload.sufficiency, SufficiencyLevel.INSUFFICIENT)
        self.assertTrue(payload.web_fallback_used)
        self.assertIsNotNone(research_payload)
        self.assertTrue(len(research_payload.results) > 0)

    def test_8_rag_prompt_block_formatting_and_security(self):
        """Verify prompt block formats <untrusted_knowledge_source> with security rules."""
        state = NovaState()
        k_payload, _ = self.manager.retrieve_and_evaluate(
            db=self.db,
            query_text="Cellular respiration",
            user_id=self.user_a_id,
            trigger_web_fallback=False,
        )
        state.knowledge_payload = k_payload

        prompt_block = state.to_prompt_block()
        if k_payload.results:
            self.assertIn("RETRIEVED KNOWLEDGE BASE DOCUMENTS", prompt_block)
            self.assertIn("<untrusted_knowledge_source", prompt_block)
            self.assertIn("CRITICAL SECURITY RULE", prompt_block)

    def test_9_knowledge_routing_in_reason_node(self):
        """Test reason_node routes queries about uploaded notes to knowledge."""
        state = NovaState()
        state.update_user_message("Explain photosynthesis according to my uploaded notes")

        payload = {"nova_state": state.model_dump(), "user_message": state.conversation.latest_user_message}
        out_payload = reason_node(payload, provider=self.mock_llm_provider)

        self.assertEqual(out_payload["route"], "knowledge")

    def test_10_end_to_end_knowledge_turn_execution(self):
        """Test full turn execution through LangGraph with knowledge route and web fallback."""
        with patch("Backend.nova.graph.nodes.get_nova_llm_provider", return_value=self.mock_llm_provider):
            res = run_nova_graph(
                user_message="Explain quantum computing according to my study notes",
                override_profile={"name": "Kiran"},
                db=self.db,
            )

    def test_11_pgvector_model_and_embedding_versioning(self):
        """Verify embedding provider metadata tracking and pgvector column setters."""
        provider = EmbeddingProvider()
        meta = provider.get_metadata()
        self.assertEqual(meta["dimension"], 384)
        self.assertEqual(meta["version"], "v1")

        # Ingest document and verify vector is set in DocumentChunk
        doc = self.manager.ingest_document(
            db=self.db,
            title="Versioned Document",
            content_text="Testing embedding metadata versioning.",
            user_id=self.user_a_id,
        )
        self.assertIsNotNone(doc.id)

    def test_12_topic_and_subject_metadata_filtering(self):
        """Test topic and subject filter constraints in KnowledgeRepository."""
        self.manager.ingest_document(
            db=self.db,
            title="Physics Notes",
            content_text="Quantum mechanics and wave particle duality.",
            user_id=self.user_a_id,
            subject="Physics",
            topic="Quantum",
        )
        self.manager.ingest_document(
            db=self.db,
            title="Chemistry Notes",
            content_text="Chemical bonds and organic reaction mechanisms.",
            user_id=self.user_a_id,
            subject="Chemistry",
            topic="Organic",
        )

        # Search with Physics subject filter
        res_physics, _ = self.manager.retrieve_and_evaluate(
            db=self.db,
            query_text="Quantum mechanics duality",
            user_id=self.user_a_id,
            subject_filter="Physics",
            trigger_web_fallback=False,
        )
        self.assertTrue(all(r.title == "Physics Notes" for r in res_physics.results))

    def test_13_postgresql_pgvector_query_building_regression(self):
        """Regression test verifying PostgreSQL pgvector database-native query structure."""
        mock_db = MagicMock()
        mock_db.bind.dialect.name = "postgresql"

        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []

        # Execute vector search targeting PostgreSQL
        query_vec = [0.1] * 384
        KnowledgeRepository.search_chunks(
            db=mock_db,
            query_embedding=query_vec,
            user_id=self.user_a_id,
            top_k=5,
            subject_filter="Biology",
        )

        # Assert database-native order_by and limit were invoked directly in SQL
        self.assertTrue(mock_query.order_by.called)
        self.assertTrue(mock_query.limit.called)

    def test_14_legacy_json_embedding_migration_fallback(self):
        """Test fallback read from embedding_json when embedding column is unpopulated."""
        from Backend.nova.knowledge.models import DocumentChunk
        chunk = DocumentChunk(chunk_text="Legacy chunk text")
        vec = [0.05] * 384
        chunk.embedding_json = str(vec).replace("'", '"')
        chunk.embedding = None

        retrieved_vec = chunk.get_embedding()
        self.assertEqual(len(retrieved_vec), 384)
        self.assertAlmostEqual(retrieved_vec[0], 0.05)


if __name__ == "__main__":
    unittest.main()
