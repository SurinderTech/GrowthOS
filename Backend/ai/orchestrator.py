"""
Backend/ai/orchestrator.py

The AI Orchestrator — the single entry point for every AI-powered feature
in GrowthOS. No router or service should call an LLM directly; everything
routes through here.

Responsibilities:
- Owns the agent registry (which agent(s) exist).
- Builds the shared MemoryContext ONCE per request and hands it to
  whichever agent(s) run, so a multi-agent call never refetches the
  same rows twice.
- Decides which model an agent uses (delegated to ModelRouter, itself
  driven by each agent's declared TaskType — never a hardcoded name).
- Supports single-agent calls and multi-agent "collaborations" where
  several agents run against the same context and their outputs are
  merged into one payload (e.g. a daily briefing).
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from Backend.ai.agents import AGENT_CLASSES
from Backend.ai.base_agent import BaseAgent
from Backend.ai.memory import MemoryContext, build_memory_context, lightweight_context
from Backend.ai.model_router import ModelRouter, get_model_router
from Backend.ai.openrouter_client import OpenRouterClient, get_openrouter_client

logger = logging.getLogger("growthos.ai.orchestrator")


class Orchestrator:
    """
    Usage:
        orchestrator = get_orchestrator()
        result = orchestrator.run("task_planning", user_id=user.id, db=db)

        # or, for legacy/no-DB callers:
        result = orchestrator.run("mission_planner", profile=profile_dict)

        # multi-agent collaboration:
        briefing = orchestrator.daily_briefing(user_id=user.id, db=db)
    """

    def __init__(self, client: OpenRouterClient | None = None, router: ModelRouter | None = None):
        self.client = client or get_openrouter_client()
        self.router = router or get_model_router()
        # Agents are stateless and cheap — one shared instance per name.
        self._agents: dict[str, BaseAgent] = {
            name: cls(client=self.client, router=self.router)
            for name, cls in AGENT_CLASSES.items()
        }

    # ------------------------------------------------------------------ #
    # Introspection
    # ------------------------------------------------------------------ #

    def available_agents(self) -> list[dict[str, str]]:
        return [
            {"name": a.name, "description": a.description, "task_type": a.task_type.value}
            for a in self._agents.values()
        ]

    def get_agent(self, agent_name: str) -> BaseAgent:
        agent = self._agents.get(agent_name)
        if agent is None:
            raise KeyError(
                f"Unknown agent '{agent_name}'. Available: {sorted(self._agents)}"
            )
        return agent

    # ------------------------------------------------------------------ #
    # Context building
    # ------------------------------------------------------------------ #

    def build_context(
        self,
        *,
        user_id: UUID | None = None,
        db: Session | None = None,
        profile: dict[str, Any] | None = None,
        context: MemoryContext | None = None,
    ) -> MemoryContext:
        """
        Resolves a MemoryContext from whatever the caller provided:
        - an explicit `context` wins outright
        - `user_id` + `db` → full DB-backed context (preferred path)
        - `profile` only → lightweight context (legacy/no-DB callers)
        """
        if context is not None:
            return context
        if user_id is not None and db is not None:
            return build_memory_context(user_id, db, profile=profile)
        return lightweight_context(profile or {})

    # ------------------------------------------------------------------ #
    # Single-agent execution
    # ------------------------------------------------------------------ #

    def run(
        self,
        agent_name: str,
        *,
        user_id: UUID | None = None,
        db: Session | None = None,
        profile: dict[str, Any] | None = None,
        context: MemoryContext | None = None,
        **kwargs: Any,
    ) -> Any:
        """Decides the context, picks the agent, runs it, returns its output."""
        agent = self.get_agent(agent_name)
        ctx = self.build_context(user_id=user_id, db=db, profile=profile, context=context)
        logger.info("orchestrator dispatch agent=%s user_id=%s", agent_name, ctx.user_id)
        return agent.run(ctx, **kwargs)

    # ------------------------------------------------------------------ #
    # Multi-agent collaboration
    # ------------------------------------------------------------------ #

    def daily_briefing(
        self,
        *,
        user_id: UUID | None = None,
        db: Session | None = None,
        profile: dict[str, Any] | None = None,
        context: MemoryContext | None = None,
    ) -> dict[str, Any]:
        """
        Example multi-agent collaboration: builds context once, then runs
        Task Planning + Accountability Coach + Progress Tracking against the
        SAME context and merges the outputs into one payload. This is the
        pattern to follow for any future "N agents, one merged result" feature.
        """
        ctx = self.build_context(user_id=user_id, db=db, profile=profile, context=context)

        merged: dict[str, Any] = {}
        for agent_name, key in [
            ("task_planning", "tasks"),
            ("accountability_coach", "coaching"),
            ("progress_tracking", "progress"),
        ]:
            try:
                merged[key] = self.get_agent(agent_name).run(ctx)
            except Exception as exc:  # one agent failing shouldn't sink the briefing
                logger.warning("daily_briefing: agent=%s failed: %s", agent_name, exc)
                merged[key] = None

        return merged

    def weekly_review(
        self,
        *,
        user_id: UUID | None = None,
        db: Session | None = None,
        profile: dict[str, Any] | None = None,
        context: MemoryContext | None = None,
    ) -> dict[str, Any]:
        """Reflection + Behavior Analysis + Analytics, merged, over one context."""
        ctx = self.build_context(user_id=user_id, db=db, profile=profile, context=context)

        merged: dict[str, Any] = {}
        try:
            merged["reflection"] = self.get_agent("reflection").run(ctx, period="week")
        except Exception as exc:
            logger.warning("weekly_review: reflection failed: %s", exc)
            merged["reflection"] = None
        for agent_name, key in [("behavior_analysis", "behavior"), ("analytics", "analytics")]:
            try:
                merged[key] = self.get_agent(agent_name).run(ctx)
            except Exception as exc:
                logger.warning("weekly_review: agent=%s failed: %s", agent_name, exc)
                merged[key] = None

        return merged


_default_orchestrator: Orchestrator | None = None


def get_orchestrator() -> Orchestrator:
    global _default_orchestrator
    if _default_orchestrator is None:
        _default_orchestrator = Orchestrator()
    return _default_orchestrator
