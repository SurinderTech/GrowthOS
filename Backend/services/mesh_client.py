"""
services/mesh_client.py

Lightweight Mesh LLM client with an OpenAI-compatible chat-completions shape.
The rest of the backend keeps calling generate_content(prompt) so the provider
swap stays isolated here.
"""

from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any

import httpx


@dataclass
class MeshResponse:
    text: str


class MeshModel:
    def __init__(self, model_name: str | None = None,
                 api_key: str | None = None,
                 base_url: str | None = None):

        print("base_url argument =", repr(base_url))
        print("env MESH_BASE_URL =", repr(os.getenv("MESH_BASE_URL")))

        self.model_name = model_name or os.getenv("MESH_MODEL", "")
        self.api_key = api_key or os.getenv("MESH_API_KEY", "")
        self.base_url = (base_url or os.getenv("MESH_BASE_URL", "")).strip()

    def generate_content(self, prompt: str, request_options: dict[str, Any] | None = None) -> MeshResponse:
        if not self.api_key:
            raise RuntimeError("MESH_API_KEY is not set.")
        if not self.base_url:
            raise RuntimeError("MESH_BASE_URL is not set.")
        if not self.model_name:
            raise RuntimeError("MESH_MODEL is not set.")

        timeout = 30
        if request_options and request_options.get("timeout"):
            timeout = request_options["timeout"]

        endpoint = self.base_url.rstrip("/")
        if not endpoint.endswith("/chat/completions"):
            endpoint = f"{endpoint}/chat/completions"

        print("=" * 50)
        print("BASE URL :", repr(self.base_url))
        print("MODEL    :", repr(self.model_name))
        print("ENDPOINT :", repr(endpoint))
        print("=" * 50)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
        }

        with httpx.Client(timeout=timeout) as client:
            response = client.post(endpoint, headers=headers, json=payload)
        print("STATUS =", response.status_code)
        print("BODY =")
        print(response.text)
        response.raise_for_status()
        data = response.json()

        return MeshResponse(text=_extract_text(data))

def _extract_text(data: dict[str, Any]) -> str:
    if isinstance(data, dict):
        if isinstance(data.get("output_text"), str) and data["output_text"].strip():
            return data["output_text"].strip()

        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            first = choices[0] or {}
            message = first.get("message") if isinstance(first, dict) else None
            if isinstance(message, dict):
                content = message.get("content")
                if isinstance(content, str):
                    return content.strip()
                if isinstance(content, list):
                    parts = []
                    for item in content:
                        if isinstance(item, dict) and isinstance(item.get("text"), str):
                            parts.append(item["text"])
                    if parts:
                        return "".join(parts).strip()

            text = first.get("text") if isinstance(first, dict) else None
            if isinstance(text, str):
                return text.strip()

        if isinstance(data.get("text"), str):
            return data["text"].strip()

    return ""


def create_mesh_model() -> MeshModel:
    return MeshModel()