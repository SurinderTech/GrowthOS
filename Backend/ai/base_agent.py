"""
Backend/ai/base_agent.py

Base class every specialized agent inherits from.

Design:
- Each agent owns exactly one prompt template file (prompts/<name>.md).
- Each agent declares which TaskType it needs a model for — it never
  names a model directly.
- `run()` renders the template with the MemoryContext + task-specific
  kwargs, calls the OpenRouter client, and (optionally) parses JSON.
- Agents are stateless and cheap to instantiate; the Orchestrator owns
  a singleton registry of them.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from Backend.ai.memory import MemoryContext
from Backend.ai.model_router import ModelRouter, TaskType, get_model_router
from Backend.ai.openrouter_client import OpenRouterClient, LLMResponse, get_openrouter_client

logger = logging.getLogger("growthos.ai.agent")

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(filename: str) -> str:
    path = PROMPTS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    return path.read_text(encoding="utf-8")


def safe_parse_json(text: str) -> Any:
    """Strip markdown fences / surrounding prose and parse JSON. Shared by
    every agent so parsing quirks get fixed in exactly one place."""
    clean = text.strip()
    if "```" in clean:
        parts = clean.split("```")
        if len(parts) >= 2:
            clean = parts[1]
            if clean.startswith("json"):
                clean = clean[4:]

    # Try object first, then array — whichever appears.
    obj_start, obj_end = clean.find("{"), clean.rfind("}")
    arr_start, arr_end = clean.find("["), clean.rfind("]")

    candidates = []
    if obj_start != -1 and obj_end != -1:
        candidates.append(clean[obj_start:obj_end + 1])
    if arr_start != -1 and arr_end != -1:
        candidates.append(clean[arr_start:arr_end + 1])
    # Prefer whichever candidate is longer (usually the real payload)
    candidates.sort(key=len, reverse=True)
    candidates.append(clean)  # last resort: raw text

    last_error = None
    for candidate in candidates:
        try:
            return json.loads(candidate.strip())
        except json.JSONDecodeError as exc:
            last_error = exc
            continue
    raise ValueError(f"Could not parse JSON from model output: {last_error}\nRaw: {text[:300]}")


class BaseAgent:
    """
    Subclass and set:
      name          - unique registry key, e.g. "task_planning"
      description   - one line, shown in orchestrator introspection
      prompt_file   - filename under ai/prompts/
      task_type     - TaskType used to resolve a model via ModelRouter
      expects_json  - if True, run() parses the response as JSON
      temperature   - sampling temperature
    """

    name: str = "base"
    description: str = ""
    prompt_file: str = ""
    task_type: TaskType = TaskType.CHAT
    expects_json: bool = False
    temperature: float = 0.7
    timeout: float = 20.0
    max_tokens: int | None = None

    def __init__(
        self,
        client: OpenRouterClient | None = None,
        router: ModelRouter | None = None,
    ):
        self.client = client or get_openrouter_client()
        self.router = router or get_model_router()
        self._template: str | None = None

    @property
    def template(self) -> str:
        if self._template is None:
            self._template = load_prompt(self.prompt_file)
        return self._template

    def build_prompt(self, context: MemoryContext, **kwargs: Any) -> str:
        """
        Renders the agent's .md template. Templates use simple {placeholder}
        syntax; `context_block` (the rendered MemoryContext) and any extra
        kwargs the caller passes are available as placeholders.
        """
        values = {"context_block": context.to_prompt_block(), **kwargs}
        try:
            return self.template.format(**values)
        except KeyError as exc:
            raise KeyError(
                f"Agent '{self.name}' prompt template references missing "
                f"placeholder {exc}. Passed keys: {list(values.keys())}"
            )

    def run(self, context: MemoryContext, **kwargs: Any) -> Any:
        """Runs the agent once. Returns parsed JSON (dict/list) if
        expects_json, else raw text."""
        prompt = self.build_prompt(context, **kwargs)
        model = self.router.model_for(self.task_type)
        fallback = self.router.fallback_chain_for(self.task_type)

        response: LLMResponse = self.client.chat(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            fallback_models=fallback,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            timeout=self.timeout,
            json_mode=self.expects_json,
        )
        logger.info(
            "agent=%s model=%s tokens=%s cost=$%.5f",
            self.name, response.model, response.usage.total_tokens,
            response.usage.estimated_cost_usd,
        )

        if self.expects_json:
            return safe_parse_json(response.text)
        return response.text
