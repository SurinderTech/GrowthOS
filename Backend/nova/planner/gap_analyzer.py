"""
Backend/nova/planner/gap_analyzer.py

Gap Analyzer for NOVA Planning Engine.
Analyzes user's Current State vs Desired Goal State to identify actionable gaps.
"""

from __future__ import annotations

import logging
import re
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.planner.types import GapAnalysisItem, PriorityLevel

logger = logging.getLogger("growthos.nova.planner.gap_analyzer")


class GapAnalyzer:
    """
    Evaluates current user state (level, known skills, time) vs target goal to identify strategic gaps.
    """

    def analyze_gaps(
        self,
        goal_title: str,
        state: Optional[NovaState] = None,
    ) -> List[GapAnalysisItem]:
        """
        Performs gap analysis between user current state and target goal.
        """
        gaps: List[GapAnalysisItem] = []
        g_lower = goal_title.lower()

        u_level = ((state.user.experience_level if state and state.user else None) or "beginner").lower()
        known_skills: set[str] = set()
        if state and state.progress_context and state.progress_context.skills:
            for s in state.progress_context.skills:
                known_skills.add(s.topic.lower())

        if "ai engineer" in g_lower or "machine learning" in g_lower:
            if "python" not in known_skills:
                gaps.append(
                    GapAnalysisItem(
                        skill_or_topic="Python Programming & Data Structures",
                        current_level="beginner" if u_level == "beginner" else "intermediate",
                        target_level="advanced",
                        importance=PriorityLevel.CRITICAL,
                        effort_mins=180,
                        prerequisites=[],
                    )
                )
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic="Mathematics & Statistics for ML",
                    current_level="none",
                    target_level="intermediate",
                    importance=PriorityLevel.HIGH,
                    effort_mins=150,
                    prerequisites=["Python Programming & Data Structures"],
                )
            )
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic="Machine Learning Core Algorithms",
                    current_level="none",
                    target_level="intermediate",
                    importance=PriorityLevel.CRITICAL,
                    effort_mins=240,
                    prerequisites=["Python Programming & Data Structures", "Mathematics & Statistics for ML"],
                )
            )
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic="Deep Learning & Neural Networks",
                    current_level="none",
                    target_level="intermediate",
                    importance=PriorityLevel.HIGH,
                    effort_mins=240,
                    prerequisites=["Machine Learning Core Algorithms"],
                )
            )
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic="LLMs, RAG & Prompt Engineering",
                    current_level="none",
                    target_level="advanced",
                    importance=PriorityLevel.HIGH,
                    effort_mins=200,
                    prerequisites=["Deep Learning & Neural Networks"],
                )
            )
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic="Model Deployment & API System Design",
                    current_level="none",
                    target_level="intermediate",
                    importance=PriorityLevel.MEDIUM,
                    effort_mins=160,
                    prerequisites=["LLMs, RAG & Prompt Engineering"],
                )
            )
        elif "exam" in g_lower or "neet" in g_lower or "jee" in g_lower or "upsc" in g_lower:
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic="Syllabus Core Concepts Mastery",
                    current_level=u_level,
                    target_level="advanced",
                    importance=PriorityLevel.CRITICAL,
                    effort_mins=300,
                )
            )
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic="High-Yield Practice Questions & Past Papers",
                    current_level="none",
                    target_level="advanced",
                    importance=PriorityLevel.CRITICAL,
                    effort_mins=240,
                    prerequisites=["Syllabus Core Concepts Mastery"],
                )
            )
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic="Speed, Accuracy & Mock Test Strategy",
                    current_level="none",
                    target_level="intermediate",
                    importance=PriorityLevel.HIGH,
                    effort_mins=180,
                    prerequisites=["High-Yield Practice Questions & Past Papers"],
                )
            )
        else:
            # Domain-agnostic default gaps
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic=f"Foundations of {goal_title}",
                    current_level=u_level,
                    target_level="intermediate",
                    importance=PriorityLevel.CRITICAL,
                    effort_mins=120,
                )
            )
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic=f"Practical Application & Exercises",
                    current_level="none",
                    target_level="intermediate",
                    importance=PriorityLevel.HIGH,
                    effort_mins=150,
                    prerequisites=[f"Foundations of {goal_title}"],
                )
            )
            gaps.append(
                GapAnalysisItem(
                    skill_or_topic=f"Advanced Mastery & Portfolio Project",
                    current_level="none",
                    target_level="advanced",
                    importance=PriorityLevel.MEDIUM,
                    effort_mins=180,
                    prerequisites=[f"Practical Application & Exercises"],
                )
            )

        logger.info("[GAP_ANALYZER] Analyzed %d gaps for goal='%s'", len(gaps), goal_title)
        return gaps
