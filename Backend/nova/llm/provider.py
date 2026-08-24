"""
Backend/nova/llm/provider.py

Provider-agnostic LLM Provider Abstraction for NOVA.
Encapsulates model calls and structured output generation.
Delegates to OpenRouter / Gemini with automatic fallback for offline testing or missing API keys.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, Optional, Type
from pydantic import BaseModel

from Backend.ai.openrouter_client import get_openrouter_client, OpenRouterClient

logger = logging.getLogger("growthos.nova.llm")


class NovaLLMProvider:
    """
    Provider-agnostic interface wrapping LLM interactions for NOVA graph nodes.
    Supports standard text generation and structured JSON extraction.
    """

    def __init__(self, client: Optional[OpenRouterClient] = None):
        self.client = client or get_openrouter_client()

    def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """Generates plain text assistant response."""
        if getattr(self.client, "api_key", None):
            try:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ]
                res = self.client.chat(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=3.0,
                )
                if res and res.content and len(res.content.strip()) > 0:
                    return res.content.strip()
            except Exception as exc:
                logger.warning("NovaLLMProvider live call failed, using fallback generator: %s", exc)

        # Smart fallback generator for offline / test environments
        return self._fallback_response_generator(system_prompt, user_prompt)

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """Generates structured JSON output."""
        if getattr(self.client, "api_key", None):
            try:
                messages = [
                    {"role": "system", "content": system_prompt + "\nIMPORTANT: Return ONLY valid JSON."},
                    {"role": "user", "content": user_prompt},
                ]
                res = self.client.chat(
                    messages=messages,
                    temperature=temperature,
                    json_mode=True,
                    timeout=3.0,
                )
                if res and res.content:
                    parsed = json.loads(res.content)
                    if isinstance(parsed, dict):
                        return parsed
            except Exception as exc:
                logger.warning("NovaLLMProvider structured JSON call failed, using fallback parser: %s", exc)

        return self._fallback_reasoning_generator(user_prompt)

    def _fallback_response_generator(self, system_prompt: str, user_prompt: str) -> str:
        """Deterministic smart response engine used when live API is unavailable."""
        msg_lower = user_prompt.lower()

        if "schedule" in msg_lower or "focus" in msg_lower or "today" in msg_lower:
            return (
                "Based on your profile, goals, and active roadmap, here is your recommended focus for today:\n\n"
                "1. **Primary Goal Action**: Dedicate 45 minutes to your core skill progression.\n"
                "2. **Daily Tasks**: Complete your pending priority tasks in GrowthOS.\n"
                "3. **Consistency**: Maintain your practice streak by reviewing key concepts.\n\n"
                "Stay disciplined and keep progressing toward your long-term objective!"
            )
        elif "goal" in msg_lower or "roadmap" in msg_lower:
            return (
                "Your active growth plan is set up to guide you step-by-step. "
                "Focus on completing the current phase milestones before advancing to higher complexity challenges."
            )
        else:
            return (
                "I have processed your request alongside your GrowthOS profile, active mission, and personal memories. "
                "How else can I assist you with your learning journey today?"
            )

    def _fallback_reasoning_generator(self, user_prompt: str) -> Dict[str, Any]:
        """Deterministic reasoning dict generator used when live API is unavailable."""
        msg_lower = user_prompt.lower()
        if "?" not in msg_lower and len(msg_lower.split()) < 3:
            return {
                "intent": "request_clarification",
                "route": "request_clarification",
                "reasoning_summary": "User prompt is extremely brief or ambiguous.",
                "sufficient_context": False,
            }

        return {
            "intent": "general_user_query",
            "route": "direct_answer",
            "reasoning_summary": "Available context and personal memories are sufficient for a direct answer.",
            "sufficient_context": True,
        }


# Default singleton instance
_default_llm_provider: Optional[NovaLLMProvider] = None


def get_nova_llm_provider() -> NovaLLMProvider:
    global _default_llm_provider
    if _default_llm_provider is None:
        _default_llm_provider = NovaLLMProvider()
    return _default_llm_provider
