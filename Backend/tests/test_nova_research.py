"""
Backend/tests/test_nova_research.py

Comprehensive Unit Test Suite for NOVA External Web Research Capability (Step 5).
Tests search provider abstraction, result normalization, research routing, node execution,
source citations, security prompt injection isolation, rate limits, and failure safety.
"""

import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from Backend.nova.research.types import (
    SearchResult,
    ResearchDocument,
    ResearchQueryRequest,
    ResearchContextPayload,
)
from Backend.nova.research.provider import WebResearchProvider
from Backend.nova.research.fetcher import ContentFetcher
from Backend.nova.research.engine import ResearchEngine
from Backend.nova.types import NovaState
from Backend.nova.graph.nodes import reason_node, research_node, response_node
from Backend.nova.graph.builder import run_nova_graph, route_decision
from Backend.nova.llm.provider import NovaLLMProvider


class TestNovaWebResearch(unittest.TestCase):

    def setUp(self):
        self.user_id = str(uuid4())
        self.mock_provider = NovaLLMProvider(client=MagicMock(api_key=None))

    def test_1_search_provider_abstraction(self):
        """Test WebResearchProvider returns normalized SearchResult objects."""
        provider = WebResearchProvider()
        req = ResearchQueryRequest(query_text="LangGraph documentation 2026", max_results=3)
        results = provider.search(req)

        self.assertIsInstance(results, list)
        self.assertTrue(len(results) > 0)
        self.assertIsInstance(results[0], SearchResult)
        self.assertIsNotNone(results[0].title)
        self.assertIsNotNone(results[0].url)

    def test_2_search_result_normalization(self):
        """Test normalization of domain, snippet, title, and score fields."""
        res = SearchResult(
            title="LangGraph Overview",
            url="https://python.langchain.com/docs/langgraph",
            snippet="Stateful multi-actor applications with LLMs.",
            source_domain="python.langchain.com",
            relevance_score=0.95,
        )
        self.assertEqual(res.source_domain, "python.langchain.com")
        self.assertEqual(res.relevance_score, 0.95)

    def test_3_research_routing(self):
        """Test that reason_node routes queries containing current/recent keywords to research."""
        state = NovaState()
        state.update_user_message("What are the latest AI skills in 2026?")

        payload = {"nova_state": state.model_dump(), "user_message": "What are the latest AI skills in 2026?"}
        out_payload = reason_node(payload, provider=self.mock_provider)

        self.assertEqual(out_payload["route"], "research")

    def test_4_no_search_path_for_normal_questions(self):
        """Test that static/general questions route to direct_answer without searching."""
        state = NovaState()
        state.update_user_message("What is Python?")

        payload = {"nova_state": state.model_dump(), "user_message": "What is Python?"}
        out_payload = reason_node(payload, provider=self.mock_provider)

        self.assertEqual(out_payload["route"], "direct_answer")

    def test_5_research_node_execution(self):
        """Test research_node executes search engine and populates state.research_payload."""
        state = NovaState()
        state.update_user_message("LangGraph tutorials 2026")

        payload = {
            "nova_state": state.model_dump(),
            "user_message": "LangGraph tutorials 2026",
        }

        out_payload = research_node(payload)
        self.assertEqual(out_payload["execution_stage"], "research_completed")

        restored_state = NovaState.model_validate(out_payload["nova_state"])
        self.assertIsNotNone(restored_state.research_payload)
        self.assertTrue(len(restored_state.research_payload.results) > 0)

    def test_6_research_results_enter_novastate_prompt_block(self):
        """Test that research results format with untrusted data security boundaries in to_prompt_block()."""
        state = NovaState()
        payload = ResearchContextPayload(
            queries_executed=["LangGraph docs"],
            results=[
                SearchResult(
                    title="LangGraph Python Docs",
                    url="https://python.langchain.com",
                    snippet="Official guide to building stateful agents.",
                )
            ],
            documents=[
                ResearchDocument(
                    title="LangGraph Python Docs",
                    url="https://python.langchain.com",
                    content_text="LangGraph coordinates graph nodes and state channels.",
                )
            ]
        )
        state.research_payload = payload

        prompt_block = state.to_prompt_block()
        self.assertIn("RETRIEVED EXTERNAL WEB RESEARCH", prompt_block)
        self.assertIn("LangGraph Python Docs", prompt_block)
        self.assertIn("<untrusted_web_source", prompt_block)
        self.assertIn("CRITICAL SECURITY RULE", prompt_block)

    def test_7_content_fetcher_html_sanitization(self):
        """Test ContentFetcher HTML tag stripping and whitespace normalization."""
        fetcher = ContentFetcher()
        raw_html = "<html><head><script>alert('xss')</script></head><body><h1>Hello World</h1><p>Main content text.</p></body></html>"
        clean = fetcher.clean_html(raw_html)

        self.assertNotIn("<script>", clean)
        self.assertNotIn("<h1>", clean)
        self.assertIn("Hello World Main content text.", clean)

    def test_8_query_result_limits(self):
        """Test that ResearchEngine limits total queries and max results."""
        engine = ResearchEngine()
        queries = engine.generate_queries("What are the latest AI frameworks in 2026?")

        self.assertLessEqual(len(queries), engine.MAX_QUERIES_PER_TURN)

    def test_9_search_failure_resilience(self):
        """Test that search engine failure yields empty payload without crashing graph."""
        broken_engine = ResearchEngine()
        broken_engine.provider.search = MagicMock(side_effect=Exception("Search Provider Rate Limit"))

        payload = broken_engine.research("What are the latest AI skills?")
        self.assertIsNotNone(payload)
        self.assertEqual(len(payload.results), 0)
        self.assertIn("Research failed safely", payload.summary)

    def test_10_end_to_end_research_turn_execution(self):
        """Test full turn execution through LangGraph with research route."""
        with patch("Backend.nova.graph.nodes.get_nova_llm_provider", return_value=self.mock_provider):
            res = run_nova_graph(
                user_message="Find the latest AI engineering skills in 2026",
                override_profile={"name": "Priya", "user_type": "student"},
            )

        self.assertIn("response", res)
        self.assertEqual(res["execution_stage"], "turn_completed")
        self.assertIsNotNone(res["state"].research_payload)


if __name__ == "__main__":
    unittest.main()
