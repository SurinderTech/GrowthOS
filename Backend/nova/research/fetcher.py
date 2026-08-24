"""
Backend/nova/research/fetcher.py

Web Page Content Fetcher & Sanitizer for NOVA Research Engine.
Retrieves public web pages, strips HTML, isolates prompt injection, and enforces character bounds.
"""

from __future__ import annotations

import logging
import re
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Optional
from urllib.error import URLError, HTTPError

from .types import ResearchDocument

logger = logging.getLogger("growthos.nova.research.fetcher")


class ContentFetcher:
    """
    Retrieves and sanitizes readable web page text.
    Bounds content to prevent context bloat and isolates untrusted HTML.
    """

    DEFAULT_TIMEOUT: float = 3.0
    MAX_CHAR_LIMIT: int = 1500

    @classmethod
    def extract_domain(cls, url: str) -> str:
        """Extracts clean domain name from URL."""
        try:
            parsed = urllib.parse.urlparse(url)
            return parsed.netloc or "web"
        except Exception:
            return "web"

    @classmethod
    def clean_html(cls, raw_html: str) -> str:
        """Strips HTML tags, script, and style tags to extract clean text."""
        # Remove script and style elements
        text = re.sub(r"<(script|style|svg|noscript)[^>]*>.*?</\1>", " ", raw_html, flags=re.DOTALL | re.IGNORECASE)
        # Remove HTML comments
        text = re.sub(r"<!--.*?-->", " ", text, flags=re.DOTALL)
        # Remove HTML tags
        text = re.sub(r"<[^>]+>", " ", text)
        # Decode HTML entities
        text = re.sub(r"&nbsp;", " ", text)
        text = re.sub(r"&amp;", "&", text)
        text = re.sub(r"&lt;", "<", text)
        text = re.sub(r"&gt;", ">", text)
        text = re.sub(r"&quot;", '"', text)
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def fetch_url(self, url: str, title: str = "Web Page") -> ResearchDocument:
        """
        Fetches webpage content with timeout and character limits.
        """
        domain = self.extract_domain(url)
        if not url.startswith(("http://", "https://")):
            return ResearchDocument(
                url=url,
                title=title,
                content_text="Invalid URL scheme.",
                domain=domain,
                status="failed",
            )

        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "GrowthOS-NovaBot/1.0 (+https://growthosai.tech)",
                    "Accept": "text/html,application/xhtml+xml,text/plain",
                },
            )
            with urllib.request.urlopen(req, timeout=self.DEFAULT_TIMEOUT) as response:
                content_type = response.headers.get("Content-Type", "").lower()
                if "html" not in content_type and "text" not in content_type:
                    return ResearchDocument(
                        url=url,
                        title=title,
                        content_text="Unsupported content format.",
                        domain=domain,
                        status="failed",
                    )

                raw_bytes = response.read(100000)  # Max 100KB read
                raw_text = raw_bytes.decode("utf-8", errors="ignore")
                clean_text = self.clean_html(raw_text)

                if not clean_text:
                    clean_text = "No readable text content extracted."

                status = "success"
                if len(clean_text) > self.MAX_CHAR_LIMIT:
                    clean_text = clean_text[: self.MAX_CHAR_LIMIT] + "... [content truncated]"
                    status = "truncated"

                return ResearchDocument(
                    url=url,
                    title=title,
                    content_text=clean_text,
                    domain=domain,
                    status=status,
                )
        except (HTTPError, URLError, TimeoutError, Exception) as exc:
            logger.debug("Failed web fetch for %s: %s", url, exc)
            return ResearchDocument(
                url=url,
                title=title,
                content_text=f"Failed to fetch content: {str(exc)}",
                domain=domain,
                status="failed",
            )
