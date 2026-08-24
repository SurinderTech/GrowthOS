"""
Backend/nova/memory/extractor.py

Provider-agnostic Memory Extractor for NOVA.
Extracts candidate memory records from incoming user messages and state snapshot.
Currently uses deterministic pattern recognition for testing; designed for pluggable LLM extraction in future steps.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from Backend.nova.memory.types import (
    MemoryCandidate,
    MemorySource,
    MemoryType,
)

if TYPE_CHECKING:
    from Backend.nova.types import NovaState


class MemoryExtractor:
    """
    Extracts structured MemoryCandidate objects from user messages or system context.
    Provider-agnostic abstraction suitable for heuristic or LLM-based extractions.
    """

    PREFERENCE_PATTERNS = [
        r"i prefer (.*)",
        r"i like to (.*)",
        r"my preference is (.*)",
        r"i prefer studying (.*)",
    ]

    GOAL_PATTERNS = [
        r"my goal is (to )?(.*)",
        r"i want to achieve (.*)",
        r"i am aiming to (.*)",
        r"my target is (.*)",
    ]

    DECISION_PATTERNS = [
        r"i decided to (.*)",
        r"i have chosen to (.*)",
        r"i will focus on (.*)",
    ]

    def extract_candidates(
        self,
        user_message: Optional[str] = None,
        state: Optional[NovaState] = None,
    ) -> List[MemoryCandidate]:
        """
        Extracts candidate memories from message and state.

        Returns:
            List of MemoryCandidate items ready for policy evaluation.
        """
        candidates: List[MemoryCandidate] = []

        if not user_message:
            return candidates

        clean_text = user_message.strip()

        # 1. Deterministic Preference Extraction
        for pat in self.PREFERENCE_PATTERNS:
            match = re.search(pat, clean_text, re.IGNORECASE)
            if match:
                val = match.group(1).strip(".!?")
                candidates.append(
                    MemoryCandidate(
                        memory_type=MemoryType.PREFERENCE,
                        content=f"User prefers: {val}",
                        source=MemorySource.EXPLICIT_USER,
                        confidence=1.0,
                        importance=0.7,
                    )
                )

        # 2. Deterministic Goal Extraction
        for pat in self.GOAL_PATTERNS:
            match = re.search(pat, clean_text, re.IGNORECASE)
            if match:
                val = match.group(2) if match.lastindex and match.lastindex >= 2 else match.group(1)
                candidates.append(
                    MemoryCandidate(
                        memory_type=MemoryType.GOAL,
                        content=f"Goal statement: {val.strip('.!?')}",
                        source=MemorySource.EXPLICIT_USER,
                        confidence=1.0,
                        importance=0.9,
                    )
                )

        # 3. Deterministic Decision Extraction
        for pat in self.DECISION_PATTERNS:
            match = re.search(pat, clean_text, re.IGNORECASE)
            if match:
                val = match.group(1).strip(".!?")
                candidates.append(
                    MemoryCandidate(
                        memory_type=MemoryType.DECISION,
                        content=f"User decision: {val}",
                        source=MemorySource.EXPLICIT_USER,
                        confidence=1.0,
                        importance=0.8,
                    )
                )

        return candidates
