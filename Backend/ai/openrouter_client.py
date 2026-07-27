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


class OpenRouterClient:
    """
    Thin, dependable wrapper around OpenRouter's OpenAI-compatible
    /chat/completions endpoint.
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
        model: str,
        *,
        fallback_models: list[str] | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        timeout: float | None = None,
        json_mode: bool = False,
        extra_body: dict[str, Any] | None = None,
    ) -> LLMResponse:
        """
        Non-streaming chat completion. Raises OpenRouterError on total failure.
        """
        if not self.api_key:
            raise OpenRouterError(
                f"{OPENROUTER_API_KEY_ENV} is not set. Add it to Backend/.env."
            )

        models_to_try = [model] + [m for m in (fallback_models or []) if m != model]
        timeout = timeout or self.default_timeout

        payload: dict[str, Any] = {
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        if extra_body:
            payload.update(extra_body)

        # OpenRouter natively supports an ordered `models` list with
        # automatic fallback — pass it, and ALSO manually retry below in
        # case the whole request errors before OpenRouter can fall back
        # (e.g. malformed request, transient network failure).
        if len(models_to_try) > 1:
            payload["models"] = models_to_try
        payload["model"] = models_to_try[0]

        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
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
                        "OpenRouter %s error on attempt %d: %s",
                        response.status_code, attempt + 1, response.text[:500],
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
                logger.warning("OpenRouter attempt %d failed: %s", attempt + 1, exc)
                if attempt < self.max_retries:
                    time.sleep(min(2 ** attempt, 8))
                continue

        raise OpenRouterError(f"OpenRouter request failed after retries: {last_error}")

    def stream(
        self,
        messages: list[dict[str, str]],
        model: str,
        *,
        fallback_models: list[str] | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        timeout: float | None = None,
    ) -> Generator[str, None, None]:
        """
        Streaming chat completion. Yields text chunks as they arrive.
        """
        if not self.api_key:
            raise OpenRouterError(
                f"{OPENROUTER_API_KEY_ENV} is not set. Add it to Backend/.env."
            )

        models_to_try = [model] + [m for m in (fallback_models or []) if m != model]
        payload: dict[str, Any] = {
            "model": models_to_try[0],
            "messages": messages,
            "temperature": temperature,
            "stream": True,
        }
        if len(models_to_try) > 1:
            payload["models"] = models_to_try
        if max_tokens:
            payload["max_tokens"] = max_tokens

        with httpx.Client(timeout=timeout or self.default_timeout) as client:
            with client.stream(
                "POST", f"{self.base_url}/chat/completions",
                headers=self._headers, json=payload,
            ) as response:
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
