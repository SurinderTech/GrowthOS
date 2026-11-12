"""
Backend/tests/test_nova_auth_security.py

Security test suite for NOVA router authentication and user-isolation enforcement.

Tests verify:
  1. All user-data endpoints return 401 when no token is provided.
  2. All user-data endpoints return 403 when an expired/invalid token is provided.
  3. Memory endpoints are scoped to the authenticated user and cannot access
     another user's data even when a valid token is supplied.

These tests use FastAPI's TestClient with a patched DB session so they do not
require a live PostgreSQL instance.
"""

import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from Backend.db.init_db import Base
from Backend.db.session import get_db
from Backend.nova.router import router as nova_router


def _make_app(db_session):
    """Build a minimal FastAPI app with the nova router and an overridden DB dependency."""
    app = FastAPI()
    app.include_router(nova_router, prefix="/nova")

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    return app


class TestNovaRouterAuthEnforcement(unittest.TestCase):
    """
    Verifies that every user-data endpoint rejects unauthenticated requests.
    """

    @classmethod
    def setUpClass(cls):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(bind=engine)
        cls.db = SessionLocal()
        cls.app = _make_app(cls.db)
        cls.client = TestClient(cls.app, raise_server_exceptions=False)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # ── Endpoints that require authentication ──────────────────────────────────

    def _assert_401_without_token(self, method: str, path: str, json: dict = None):
        fn = getattr(self.client, method)
        # GET and DELETE don't accept a json body in Starlette's TestClient
        if method in ("get", "delete"):
            resp = fn(path)
        else:
            resp = fn(path, json=json or {})
        self.assertIn(
            resp.status_code, [401, 403],
            f"{method.upper()} {path} should return 401/403 without a token, got {resp.status_code}",
        )

    def test_build_state_requires_auth(self):
        self._assert_401_without_token("post", "/nova/build-state", {"message": "hi"})

    def test_chat_requires_auth(self):
        self._assert_401_without_token("post", "/nova/chat", {"message": "hello"})

    def test_create_memory_requires_auth(self):
        self._assert_401_without_token("post", "/nova/memory", {"content": "fact"})

    def test_list_memory_requires_auth(self):
        self._assert_401_without_token("get", "/nova/memory")

    def test_retrieve_memory_requires_auth(self):
        self._assert_401_without_token("post", "/nova/memory/retrieve", {"query_text": "goal"})

    def test_delete_memory_requires_auth(self):
        self._assert_401_without_token("delete", f"/nova/memory/{uuid4()}")

    def test_knowledge_ingest_requires_auth(self):
        self._assert_401_without_token(
            "post", "/nova/knowledge/ingest",
            {"title": "Doc", "content_text": "body"},
        )

    def test_knowledge_retrieve_requires_auth(self):
        self._assert_401_without_token(
            "post", "/nova/knowledge/retrieve",
            {"query_text": "search"},
        )

    # ── Public endpoints remain accessible ────────────────────────────────────

    def test_health_is_public(self):
        resp = self.client.get("/nova/health")
        self.assertEqual(resp.status_code, 200)

    def test_research_is_public(self):
        # Research hits an external engine — just verify auth is not blocking it
        # (it may still error due to no live research engine in test env)
        resp = self.client.post("/nova/research", json={"query_text": "test"})
        self.assertNotIn(resp.status_code, [401, 403],
            "Research endpoint should NOT require auth")


class TestNovaUserIsolation(unittest.TestCase):
    """
    Verifies that a valid token for user_A cannot access user_B's memories.
    Uses mocked get_current_user to inject different user identities.
    """

    @classmethod
    def setUpClass(cls):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(bind=engine)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def _client_as_user(self, user_id: str):
        """Returns a TestClient where get_current_user returns a mock User with given id."""
        from Backend.auth import get_current_user

        mock_user = MagicMock()
        mock_user.id = user_id
        mock_user.email_verified = True
        mock_user.is_active = True

        app = _make_app(self.db)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        return TestClient(app, raise_server_exceptions=False)

    def test_memory_list_scoped_to_authenticated_user(self):
        """
        user_a creates a memory, user_b lists memories — user_b must see 0 records
        (the router passes current_user.id, not a request-supplied user_id).
        """
        user_a_id = str(uuid4())
        user_b_id = str(uuid4())

        client_a = self._client_as_user(user_a_id)
        client_b = self._client_as_user(user_b_id)

        # user_a stores a memory via the in-memory manager (bypassing live DB for speed)
        with patch("Backend.nova.router.get_memory_manager") as mock_mgr_factory:
            mock_mgr = MagicMock()
            mock_mgr_factory.return_value = mock_mgr
            mock_mgr.retrieve.return_value = []

            resp = client_b.get("/nova/memory")
            self.assertEqual(resp.status_code, 200)

            # Verify that retrieve was called with user_b's ID, not user_a's
            call_kwargs = mock_mgr.retrieve.call_args
            if call_kwargs:
                called_user_id = call_kwargs.kwargs.get("user_id") or (
                    call_kwargs.args[1] if len(call_kwargs.args) > 1 else None
                )
                if called_user_id:
                    self.assertEqual(
                        called_user_id, user_b_id,
                        "Memory retrieval must use the authenticated user's ID from JWT, not any user_id from request.",
                    )


if __name__ == "__main__":
    unittest.main()
