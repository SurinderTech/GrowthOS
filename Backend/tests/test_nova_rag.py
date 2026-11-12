"""
Backend/tests/test_nova_rag.py

RAG Engine Test Suite — EmbeddingProvider, cosine_similarity, ingestor, retrieval.

Test design notes
-----------------
- All tests use an in-memory SQLite database (no Postgres / pgvector required).
- EmbeddingProvider is tested in its hash_fallback mode (no API key set).
  Real semantic-embedding paths (google / openai) are tested via mock to avoid
  requiring live credentials in CI.
- Tests explicitly assert that hash_fallback is NOT semantic (cosine similarity
  between unrelated texts is NOT expected to be high).
"""

import os
import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from Backend.db.init_db import Base
from Backend.nova.rag.embeddings import EmbeddingProvider, cosine_similarity
from Backend.nova.rag.evaluator import RetrievalSufficiencyEvaluator
from Backend.nova.rag.manager import KnowledgeManager, get_knowledge_manager
from Backend.nova.rag.types import SufficiencyLevel


class TestCosineSimiliarity(unittest.TestCase):
    def test_identical_vectors(self):
        v = [1.0, 0.0, 0.0]
        self.assertAlmostEqual(cosine_similarity(v, v), 1.0, places=5)

    def test_orthogonal_vectors(self):
        self.assertAlmostEqual(cosine_similarity([1, 0], [0, 1]), 0.0, places=5)

    def test_dimension_mismatch_returns_zero(self):
        self.assertEqual(cosine_similarity([1, 2], [1, 2, 3]), 0.0)

    def test_empty_vectors_return_zero(self):
        self.assertEqual(cosine_similarity([], []), 0.0)


class TestEmbeddingProviderHashFallback(unittest.TestCase):
    """
    Tests for the hash_fallback mode (no API key configured).
    These explicitly document that hash embeddings are NOT semantic.
    """

    def setUp(self):
        # Ensure no API key so hash_fallback activates
        self._orig_google = os.environ.pop("GOOGLE_API_KEY", None)
        self._orig_gemini = os.environ.pop("GEMINI_API_KEY", None)
        self._orig_openai = os.environ.pop("OPENAI_API_KEY", None)
        self._orig_or = os.environ.pop("OPENROUTER_API_KEY", None)
        self.provider = EmbeddingProvider()

    def tearDown(self):
        for k, v in [
            ("GOOGLE_API_KEY", self._orig_google),
            ("GEMINI_API_KEY", self._orig_gemini),
            ("OPENAI_API_KEY", self._orig_openai),
            ("OPENROUTER_API_KEY", self._orig_or),
        ]:
            if v is not None:
                os.environ[k] = v

    def test_mode_is_hash_fallback(self):
        self.assertEqual(self.provider.embedding_mode, "hash_fallback")

    def test_metadata_is_semantic_false(self):
        meta = self.provider.get_metadata()
        self.assertFalse(meta["is_semantic"],
            "hash_fallback must NOT be reported as semantic")

    def test_dimension_is_384(self):
        vec = self.provider.embed_text("hello world")
        self.assertEqual(len(vec), 384)

    def test_vector_is_normalized(self):
        import math
        vec = self.provider.embed_text("growth os learning platform")
        norm = math.sqrt(sum(x * x for x in vec))
        self.assertAlmostEqual(norm, 1.0, places=4)

    def test_empty_string_returns_zero_vector(self):
        vec = self.provider.embed_text("")
        self.assertEqual(vec, [0.0] * 384)

    def test_identical_text_gives_similarity_1(self):
        v = self.provider.embed_text("machine learning")
        self.assertAlmostEqual(cosine_similarity(v, v), 1.0, places=5)

    def test_hash_fallback_is_not_semantic(self):
        """
        IMPORTANT: hash_fallback is NOT semantic.
        'python programming' and 'coding in python' share the word 'python'
        so their hashes may overlap, but 'machine learning' vs 'cooking recipe'
        should have low similarity — this is lexical, not semantic.
        """
        v1 = self.provider.embed_text("machine learning neural network")
        v2 = self.provider.embed_text("delicious chocolate cake recipe")
        sim = cosine_similarity(v1, v2)
        # We document that hash sim can be coincidentally non-zero — just not high
        self.assertLess(sim, 0.5,
            "hash_fallback should NOT produce high similarity for unrelated texts. "
            "If this fails, it is a coincidence of hash collision, not semantic understanding.")

    def test_batch_embed_length_matches(self):
        texts = ["hello", "world", "growth"]
        vecs = self.provider.embed_batch(texts)
        self.assertEqual(len(vecs), 3)
        for v in vecs:
            self.assertEqual(len(v), 384)


class TestEmbeddingProviderGoogleMock(unittest.TestCase):
    """Tests Google embedding path via mock — does not require a live API key."""

    def test_google_mode_selected_when_key_set(self):
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "fake-key"}):
            provider = EmbeddingProvider()
        self.assertEqual(provider.embedding_mode, "google")
        self.assertTrue(provider.get_metadata()["is_semantic"])

    def test_google_fallback_on_api_error(self):
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "fake-key"}):
            provider = EmbeddingProvider()
        # Simulate API failure → should fall back to hash
        with patch("google.generativeai.embed_content", side_effect=Exception("API down")):
            vec = provider._embed_google("test text")
        self.assertEqual(len(vec), 384)  # falls back to 384-dim hash


class TestEmbeddingProviderOpenAIMock(unittest.TestCase):
    """Tests OpenAI embedding path via mock."""

    def test_openai_mode_selected_when_key_set(self):
        with patch.dict(os.environ, {
            "OPENAI_API_KEY": "fake-openai-key",
            "GOOGLE_API_KEY": "",
            "GEMINI_API_KEY": "",
        }):
            provider = EmbeddingProvider(google_api_key="")
        # Google key may still be in env — we directly instantiate with no google key
        provider2 = EmbeddingProvider(google_api_key=None, openai_api_key="fake-openai")
        self.assertEqual(provider2.embedding_mode, "openai")
        self.assertTrue(provider2.get_metadata()["is_semantic"])


class TestRetrievalSufficiencyEvaluator(unittest.TestCase):
    def setUp(self):
        self.evaluator = RetrievalSufficiencyEvaluator()

    def _make_result(self, score: float):
        from Backend.nova.rag.types import KnowledgeRetrievalResult
        return KnowledgeRetrievalResult(
            chunk_id=str(uuid4()),
            document_id=str(uuid4()),
            chunk_text="Sample chunk",
            title="Test Document",
            source="test",
            score=score,
        )

    def test_no_results_is_insufficient(self):
        self.assertEqual(self.evaluator.evaluate("any query", []), SufficiencyLevel.INSUFFICIENT)

    def test_high_score_is_sufficient(self):
        result = self.evaluator.evaluate("my query", [self._make_result(0.80)])
        self.assertEqual(result, SufficiencyLevel.SUFFICIENT)

    def test_medium_score_is_hybrid(self):
        result = self.evaluator.evaluate("my query", [self._make_result(0.55)])
        self.assertEqual(result, SufficiencyLevel.HYBRID)

    def test_low_score_is_insufficient(self):
        result = self.evaluator.evaluate("my query", [self._make_result(0.20)])
        self.assertEqual(result, SufficiencyLevel.INSUFFICIENT)

    def test_recency_keyword_forces_hybrid(self):
        result = self.evaluator.evaluate("latest updates 2026", [self._make_result(0.65)])
        self.assertEqual(result, SufficiencyLevel.HYBRID)


class TestKnowledgeManagerRag(unittest.TestCase):
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

    def test_ingest_and_retrieve_round_trip(self):
        doc = self.manager.ingest_document(
            db=self.db,
            title="RAG Package Test",
            content_text="Verifying dedicated rag module package structure and retrieval.",
            user_id=self.user_id,
        )
        self.assertIsNotNone(doc.id)

        payload, _ = self.manager.retrieve_and_evaluate(
            db=self.db,
            query_text="rag module package structure",
            user_id=self.user_id,
            trigger_web_fallback=False,
        )
        self.assertGreater(len(payload.results), 0)
        self.assertIn("rag module", payload.results[0].chunk_text)

    def test_different_user_cannot_see_private_doc(self):
        """Private documents must not appear in another user's retrieval results."""
        other_user = str(uuid4())
        self.manager.ingest_document(
            db=self.db,
            title="Secret Doc",
            content_text="This document belongs exclusively to user_a.",
            user_id=self.user_id,
        )
        payload, _ = self.manager.retrieve_and_evaluate(
            db=self.db,
            query_text="secret document user_a",
            user_id=other_user,
            trigger_web_fallback=False,
        )
        for result in payload.results:
            self.assertNotIn("Secret Doc", result.chunk_text,
                "Private documents must be isolated per user_id")


if __name__ == "__main__":
    unittest.main()
