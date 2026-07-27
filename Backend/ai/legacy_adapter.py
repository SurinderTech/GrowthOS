"""
Backend/ai/legacy_adapter.py

Adapter so the ORIGINAL service functions (gemini_service.py, growth_plan_ai.py,
smart_task_service.py, accountability_service.py, evaluator.py,
question_generator.py) keep their exact prompts, output schemas, and
`.generate_content(prompt, request_options=...)` call shape — while the actual
network call underneath now goes through the shared OpenRouterClient +
ModelRouter instead of the old raw Mesh HTTP client.

Why this exists: those six files have prompts whose output schemas the
frontend already depends on verbatim (task fields like resource_url /
action_type, career-graph node/edge shapes, exam-specific fallback plans,
etc). Rewriting their prompts to fit the new generic agent templates would
be a functional change disguised as a migration. Phase 1 of this migration
is "swap the engine, not the car" — this adapter is that engine swap.

Any NEW capability (behavior analysis, reflection, focus coach, etc.) should
be built as a proper Agent under Backend/ai/agents/ and called through the
Orchestrator, not added here.
"""

from __future__ import annotations

from dataclasses import dataclass

from Backend.ai.model_router import TaskType, get_model_router
from Backend.ai.openrouter_client import get_openrouter_client


@dataclass
class LegacyResponse:
    """Matches the old MeshResponse shape: callers read `.text`."""
    text: str


class LegacyModelAdapter:
    """Drop-in replacement for the old MeshModel — identical .generate_content() shape."""

    def __init__(self, task_type: TaskType = TaskType.JSON):
        self.client = get_openrouter_client()
        self.router = get_model_router()
        self.task_type = task_type
        # Kept for any code that introspects `.model_name` the way it used to
        # with MeshModel (e.g. gemini_service.print_models_safe).
        self.model_name = self.router.model_for(task_type)

    def generate_content(self, prompt: str, request_options: dict | None = None) -> LegacyResponse:
        timeout = 30
        if request_options and request_options.get("timeout"):
            timeout = request_options["timeout"]

        model = self.router.model_for(self.task_type)
        fallback = self.router.fallback_chain_for(self.task_type)

        response = self.client.chat(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            fallback_models=fallback,
            temperature=0.7,
            timeout=timeout,
        )
        return LegacyResponse(text=response.text)


def create_legacy_model(task_type: TaskType = TaskType.JSON) -> LegacyModelAdapter:
    return LegacyModelAdapter(task_type=task_type)
