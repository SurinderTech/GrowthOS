"""
Backend/ai/model_router.py

Single source of truth for "which model handles which kind of task".
No model name should ever be hardcoded in an agent or service — everyone
asks ModelRouter for a model by *task type*, never by name.

Every task-specific env var falls back to DEFAULT_MODEL, so the whole
system can run on one model (today's setup) while staying ready to
diversify per task later just by setting more env vars — no code changes.

Configure via Backend/.env:

    DEFAULT_MODEL=anthropic/claude-sonnet-4.5

    # Optional per-task overrides — leave unset to use DEFAULT_MODEL
    PLANNING_MODEL=
    REFLECTION_MODEL=
    ANALYSIS_MODEL=
    CHAT_MODEL=
    JSON_MODEL=
    VISION_MODEL=
    CREATIVE_MODEL=
    CHEAP_MODEL=

    # Optional ordered fallback list, comma-separated, used if the primary
    # model errors out or is rate-limited
    FALLBACK_MODELS=
"""

from __future__ import annotations

import os
from enum import Enum


class TaskType(str, Enum):
    """Every kind of AI work an agent might request a model for."""
    PLANNING = "planning"           # mission/growth plans, long-horizon reasoning
    REFLECTION = "reflection"       # end-of-day / weekly reviews
    ANALYSIS = "analysis"           # behavior analysis, analytics, deep reasoning
    CHAT = "chat"                   # fast conversational replies
    JSON = "json"                   # large structured JSON extraction/generation
    VISION = "vision"               # image/document understanding
    CREATIVE = "creative"           # creative writing, motivational copy
    CHEAP = "cheap"                 # cheap background/bulk tasks


_ENV_VAR_BY_TASK = {
    TaskType.PLANNING: "PLANNING_MODEL",
    TaskType.REFLECTION: "REFLECTION_MODEL",
    TaskType.ANALYSIS: "ANALYSIS_MODEL",
    TaskType.CHAT: "CHAT_MODEL",
    TaskType.JSON: "JSON_MODEL",
    TaskType.VISION: "VISION_MODEL",
    TaskType.CREATIVE: "CREATIVE_MODEL",
    TaskType.CHEAP: "CHEAP_MODEL",
}

# Used only if DEFAULT_MODEL itself is unset — keeps the app bootable even
# with a bare-minimum .env.
_HARD_FALLBACK_MODEL = "openrouter/auto"


class ModelRouter:
    """
    Resolves a TaskType to a concrete OpenRouter model string, and provides
    the ordered fallback chain to hand to OpenRouterClient.chat(fallback_models=...).
    """

    def __init__(self):
        self.default_model = os.getenv("DEFAULT_MODEL", _HARD_FALLBACK_MODEL).strip()
        fallback_raw = os.getenv("FALLBACK_MODELS", "")
        self.fallback_models = [m.strip() for m in fallback_raw.split(",") if m.strip()]

    def model_for(self, task_type: TaskType) -> str:
        env_var = _ENV_VAR_BY_TASK[task_type]
        override = os.getenv(env_var, "").strip()
        return override or self.default_model

    def fallback_chain_for(self, task_type: TaskType) -> list[str]:
        """Ordered list of backup models to try if the primary fails."""
        primary = self.model_for(task_type)
        return [m for m in self.fallback_models if m != primary]

    def config_snapshot(self) -> dict[str, str]:
        """Useful for a debug/admin endpoint — shows what's actually configured."""
        return {
            "default_model": self.default_model,
            "fallback_models": self.fallback_models,
            **{t.value: self.model_for(t) for t in TaskType},
        }


_default_router: ModelRouter | None = None


def get_model_router() -> ModelRouter:
    global _default_router
    if _default_router is None:
        _default_router = ModelRouter()
    return _default_router
