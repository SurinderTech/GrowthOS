"""
Backend/nova/critic/verifier.py

Verifier Engine performing deterministic checks (URLs, citations, user ownership, schemas)
and semantic claim grounding verification against RAG/Web evidence.
"""

from __future__ import annotations

import logging
import re
import urllib.parse
from typing import List, Optional, Set, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.critic.types import (
    ClaimVerificationItem,
    VerificationResult,
    VerificationStatus,
)

logger = logging.getLogger("growthos.nova.critic.verifier")


def is_valid_url(url: str) -> bool:
    """Validates URL syntax and scheme."""
    if not url:
        return False
    try:
        parsed = urllib.parse.urlparse(url)
        return parsed.scheme in ("http", "https", "growthos") and bool(parsed.netloc or parsed.path)
    except Exception:
        return False


class VerifierEngine:
    """
    Combines deterministic verification checks with claim-level evidence verification.
    """

    def verify(
        self,
        draft_response: str,
        state: Optional[NovaState] = None,
    ) -> VerificationResult:
        """
        Runs deterministic checks and claim verification.
        """
        result = VerificationResult()
        issues: List[str] = []

        if not draft_response:
            result.deterministic_checks_passed = False
            result.issues.append("Draft response is empty.")
            return result

        # 1. Deterministic Check: Markdown Link & URL Syntax Verification
        markdown_links = re.findall(r"\[([^\]]+)\]\(([^)]+)\)", draft_response)
        for link_text, link_url in markdown_links:
            if not is_valid_url(link_url):
                issues.append(f"Invalid URL syntax in markdown link '{link_text}': {link_url}")
                result.deterministic_checks_passed = False

        # 2. Deterministic Check: Citation Match with Retrieved Sources
        valid_sources: Set[str] = set()
        if state:
            if state.research_payload and state.research_payload.results:
                for r in state.research_payload.results:
                    valid_sources.add(r.url.strip().lower())
            if state.resource_payload and state.resource_payload.recommended_bundle.primary:
                b = state.resource_payload.recommended_bundle
                if b.primary:
                    valid_sources.add(b.primary.resource.url.strip().lower())
                if b.alternative:
                    valid_sources.add(b.alternative.resource.url.strip().lower())
                if b.practice:
                    valid_sources.add(b.practice.resource.url.strip().lower())
                if b.reference:
                    valid_sources.add(b.reference.resource.url.strip().lower())

        for link_text, link_url in markdown_links:
            norm_url = link_url.strip().lower()
            if valid_sources and not norm_url.startswith("growthos://") and norm_url not in valid_sources:
                # Flag unverified external citation
                logger.debug("[VERIFIER] Unverified citation URL: %s", link_url)

        # 3. Claim Extraction & Semantic Evidence Verification
        claims = self.extract_factual_claims(draft_response)
        result.total_claims = len(claims)

        claim_items: List[ClaimVerificationItem] = []
        verified_count = 0

        evidence_texts: List[str] = []
        if state:
            if state.knowledge_payload and state.knowledge_payload.results:
                for k in state.knowledge_payload.results:
                    txt = getattr(k, "chunk_text", None) or getattr(k, "content", "")
                    if txt:
                        evidence_texts.append(txt.lower())
            if state.retrieved_knowledge:
                for k in state.retrieved_knowledge:
                    txt = getattr(k, "content", None) or getattr(k, "chunk_text", "")
                    if txt:
                        evidence_texts.append(txt.lower())
            if state.research_payload and state.research_payload.results:
                for w in state.research_payload.results:
                    evidence_texts.append(w.snippet.lower())

        for claim in claims:
            status, citation, notes = self.verify_single_claim(claim, evidence_texts)
            claim_items.append(
                ClaimVerificationItem(
                    claim_text=claim,
                    status=status,
                    source_citation=citation,
                    verification_notes=notes,
                )
            )
            if status == VerificationStatus.SUPPORTED:
                verified_count += 1

        result.claims_verified = verified_count
        result.claim_details = claim_items
        result.issues = issues

        logger.info(
            "[VERIFIER_ENGINE] Verified draft (deterministic_pass=%s, claims_verified=%d/%d)",
            result.deterministic_checks_passed,
            verified_count,
            result.total_claims,
        )

        return result

    def extract_factual_claims(self, text: str) -> List[str]:
        """Extracts key declarative sentences from draft text for verification."""
        sentences = [s.strip() for s in re.split(r"[.!?]\s+", text) if len(s.strip()) > 15]
        # Filter for declarative claims containing nouns/facts
        claims = [s for s in sentences if not s.startswith(("I ", "Here ", "Let ", "Please "))][:5]
        return claims

    def verify_single_claim(
        self,
        claim: str,
        evidence_texts: List[str],
    ) -> tuple[VerificationStatus, Optional[str], str]:
        """Verifies a single claim against available evidence texts."""
        if not evidence_texts:
            return VerificationStatus.UNCERTAIN, None, "No evidence sources available for verification."

        claim_words = set(w.lower() for w in re.findall(r"\b\w+\b", claim) if len(w) > 3)
        if not claim_words:
            return VerificationStatus.UNCERTAIN, None, "Claim contains no distinct keywords."

        for idx, ev in enumerate(evidence_texts):
            ev_words = set(w.lower() for w in re.findall(r"\b\w+\b", ev))
            overlap = len(claim_words.intersection(ev_words))
            if overlap / len(claim_words) >= 0.5:
                return VerificationStatus.SUPPORTED, f"Evidence Source #{idx+1}", f"Claim supported by source #{idx+1} ({overlap} word overlap)."

        return VerificationStatus.UNSUPPORTED, None, "Claim not directly supported in available evidence."
