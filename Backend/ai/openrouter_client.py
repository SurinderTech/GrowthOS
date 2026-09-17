"""
Backend/ai/openrouter_client.py

The ONE reusable OpenRouter client for GrowthOS.
Every AI call in the system — every agent, every service — goes through this.
No other module should import `httpx` to talk to an LLM provider directly.

Features:
- retries with backoff
- per-call timeout
- streaming support (generator)
- structured JSON responses (response_format json_object)
- request/response logging
- token usage + rough cost tracking
- model switching + ordered fallback list (OpenRouter's native `models[]` fallback,
  plus a manual retry-with-next-model loop for extra safety)
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Generator, Iterable

import httpx

logger = logging.getLogger("growthos.ai.openrouter")

OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
OPENROUTER_API_KEY_ENV = "OPENROUTER_API_KEY"

# Rough $/1M tokens table for cost estimation when OpenRouter doesn't return
# pricing inline. This is intentionally coarse — it's a dashboard number, not
# a billing source of truth. Update as needed; never block a request on it.
_FALLBACK_COST_PER_MILLION = {
    "default": {"prompt": 3.0, "completion": 15.0},
}


@dataclass
class LLMUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0


@dataclass
class LLMResponse:
    text: str
    model: str
    usage: LLMUsage = field(default_factory=LLMUsage)
    raw: dict[str, Any] | None = None
    finish_reason: str | None = None

    # Backwards-compat: old MeshModel callers accessed `.text` directly, so
    # this already matches. Kept as an explicit alias for clarity.
    @property
    def content(self) -> str:
        return self.text


class OpenRouterError(RuntimeError):
    pass


_cached_free_models: list[str] = []
_last_free_models_fetch: float = 0.0


def fetch_live_free_models() -> list[str]:
    """Dynamically fetches active free model slugs directly from OpenRouter API."""
    global _cached_free_models, _last_free_models_fetch
    now = time.monotonic()
    if _cached_free_models and (now - _last_free_models_fetch < 1800):
        return _cached_free_models

    fallback_free_defaults = [
        "openrouter/free",
        "nex-agi/nex-n2.5-mini:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "nex-agi/nex-n2.5-pro:free",
        "poolside/laguna-s-2.1:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
    ]

    try:
        with httpx.Client(timeout=5.0) as client:
            res = client.get("https://openrouter.ai/api/v1/models")
            if res.status_code == 200:
                data = res.json()
                models_data = data.get("data", [])
                free_list = []
                for m in models_data:
                    m_id = m.get("id", "")
                    pricing = m.get("pricing", {})
                    is_free_pricing = (
                        str(pricing.get("prompt", "")).strip() in ("0", "0.0", "0.00") and
                        str(pricing.get("completion", "")).strip() in ("0", "0.0", "0.00")
                    )
                    if is_free_pricing or m_id.endswith(":free"):
                        free_list.append(m_id)
                
                if free_list:
                    priority_order = [
                        "openrouter/free",
                        "nex-agi/nex-n2.5-mini:free",
                        "nvidia/nemotron-3-super-120b-a12b:free",
                        "nex-agi/nex-n2.5-pro:free",
                        "poolside/laguna-s-2.1:free",
                        "nvidia/nemotron-3-ultra-550b-a55b:free",
                    ]
                    ordered = [m for m in priority_order if m in free_list]
                    for m in free_list:
                        if m not in ordered:
                            ordered.append(m)
                    _cached_free_models = ordered
                    _last_free_models_fetch = now
                    logger.info("Auto-discovered %d active free OpenRouter models", len(ordered))
                    return ordered
    except Exception as exc:
        logger.warning("Could not fetch live free models list from OpenRouter: %s", exc)

    _cached_free_models = fallback_free_defaults
    _last_free_models_fetch = now
    return fallback_free_defaults


class OpenRouterClient:
    """
    Thin, dependable wrapper around OpenRouter's OpenAI-compatible
    /chat/completions endpoint. Automatically auto-discovers and falls back across free models.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        default_timeout: float = 30.0,
        max_retries: int = 2,
        app_name: str = "GrowthOS",
        app_url: str = "https://growthos.app",
    ):
        self.api_key = api_key or os.getenv(OPENROUTER_API_KEY_ENV, "")
        self.base_url = (base_url or OPENROUTER_BASE_URL).rstrip("/")
        self.default_timeout = default_timeout
        self.max_retries = max_retries
        self._headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            # OpenRouter uses these for its public leaderboard attribution.
            "HTTP-Referer": app_url,
            "X-Title": app_name,
        }

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        *,
        fallback_models: list[str] | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        timeout: float | None = None,
        json_mode: bool = False,
        extra_body: dict[str, Any] | None = None,
    ) -> LLMResponse:
        """
        Non-streaming chat completion. Auto-falls back to active free models on error.
        """
        if not model:
            from Backend.ai.model_router import get_model_router, TaskType
            model = get_model_router().model_for(TaskType.CHAT)

        if not self.api_key:
            raise OpenRouterError(
                f"{OPENROUTER_API_KEY_ENV} is not set. Add it to Backend/.env."
            )

        live_free = fetch_live_free_models()
        raw_candidates = [model] + (fallback_models or []) + live_free
        models_to_try: list[str] = []
        for m in raw_candidates:
            if m and m not in models_to_try:
                models_to_try.append(m)

        timeout = timeout or self.default_timeout
        last_error: Exception | None = None

        for idx, target_model in enumerate(models_to_try):
            payload: dict[str, Any] = {
                "messages": messages,
                "temperature": temperature,
                "model": target_model,
            }
            remaining_models = models_to_try[idx:idx+3]
            if len(remaining_models) > 1:
                payload["models"] = remaining_models

            if max_tokens:
                payload["max_tokens"] = max_tokens
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
            if extra_body:
                payload.update(extra_body)

            try:
                start = time.monotonic()
                with httpx.Client(timeout=timeout) as client:
                    response = client.post(
                        f"{self.base_url}/chat/completions",
                        headers=self._headers,
                        json=payload,
                    )
                elapsed = time.monotonic() - start
                if response.status_code >= 400:
                    logger.warning(
                        "OpenRouter model '%s' error (HTTP %s): %s",
                        target_model, response.status_code, response.text[:300],
                    )
                    response.raise_for_status()

                data = response.json()
                result = self._parse_response(data)
                logger.info(
                    "OpenRouter call ok model=%s tokens=%s cost=$%.5f elapsed=%.2fs",
                    result.model, result.usage.total_tokens,
                    result.usage.estimated_cost_usd, elapsed,
                )
                return result

            except (httpx.HTTPError, OpenRouterError) as exc:
                last_error = exc
                logger.warning(
                    "OpenRouter candidate '%s' failed (%s). Retrying with next available free model...",
                    target_model, exc
                )
                time.sleep(0.3)
                continue

        raise OpenRouterError(f"All OpenRouter candidate models failed. Last error: {last_error}")

    def stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        *,
        fallback_models: list[str] | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        timeout: float | None = None,
    ) -> Generator[str, None, None]:
        """
        Streaming chat completion. Yields text chunks as they arrive.
        """
        if not model:
            from Backend.ai.model_router import get_model_router, TaskType
            model = get_model_router().model_for(TaskType.CHAT)

        if not self.api_key:
            raise OpenRouterError(
                f"{OPENROUTER_API_KEY_ENV} is not set. Add it to Backend/.env."
            )

        live_free = fetch_live_free_models()
        raw_candidates = [model] + (fallback_models or []) + live_free
        models_to_try: list[str] = []
        for m in raw_candidates:
            if m and m not in models_to_try:
                models_to_try.append(m)

        for idx, target_model in enumerate(models_to_try):
            payload: dict[str, Any] = {
                "model": target_model,
                "messages": messages,
                "temperature": temperature,
                "stream": True,
            }
            remaining_models = models_to_try[idx:idx+3]
            if len(remaining_models) > 1:
                payload["models"] = remaining_models
            if max_tokens:
                payload["max_tokens"] = max_tokens

            try:
                with httpx.Client(timeout=timeout or self.default_timeout) as client:
                    with client.stream(
                        "POST", f"{self.base_url}/chat/completions",
                        headers=self._headers, json=payload,
                    ) as response:
                        if response.status_code >= 400:
                            logger.warning(
                                "OpenRouter stream model '%s' error (HTTP %s)",
                                target_model, response.status_code
                            )
                            response.raise_for_status()

                        for line in response.iter_lines():
                            if not line or not line.startswith("data: "):
                                continue
                            chunk = line[len("data: "):]
                            if chunk.strip() == "[DONE]":
                                break
                            try:
                                event = json.loads(chunk)
                            except json.JSONDecodeError:
                                continue
                            delta = event.get("choices", [{}])[0].get("delta", {})
                            text = delta.get("content")
                            if text:
                                yield text
                        return
            except Exception as exc:
                logger.warning("Streaming candidate '%s' failed: %s. Retrying next...", target_model, exc)
                time.sleep(0.3)
                continue

    # ------------------------------------------------------------------ #
    # Internals
    # ------------------------------------------------------------------ #

    def _parse_response(self, data: dict[str, Any]) -> LLMResponse:
        choices = data.get("choices") or []
        if not choices:
            raise OpenRouterError(f"OpenRouter returned no choices: {data}")

        message = choices[0].get("message") or {}
        text = message.get("content") or ""
        finish_reason = choices[0].get("finish_reason")
        model = data.get("model", "unknown")

        usage_raw = data.get("usage") or {}
        prompt_tokens = usage_raw.get("prompt_tokens", 0)
        completion_tokens = usage_raw.get("completion_tokens", 0)
        total_tokens = usage_raw.get("total_tokens", prompt_tokens + completion_tokens)

        cost = usage_raw.get("cost")
        if cost is None:
            rates = _FALLBACK_COST_PER_MILLION["default"]
            cost = (
                prompt_tokens / 1_000_000 * rates["prompt"]
                + completion_tokens / 1_000_000 * rates["completion"]
            )

        usage = LLMUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            estimated_cost_usd=round(float(cost), 6),
        )
        return LLMResponse(text=text.strip(), model=model, usage=usage, raw=data,
                            finish_reason=finish_reason)


_default_client: OpenRouterClient | None = None


def get_openrouter_client() -> OpenRouterClient:
    """Process-wide singleton so connection/config setup happens once."""
    global _default_client
    if _default_client is None:
        _default_client = OpenRouterClient()
    return _default_client
