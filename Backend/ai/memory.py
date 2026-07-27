"""
Backend/ai/memory.py

Shared Memory / Context Layer.

The Orchestrator builds ONE MemoryContext per request and hands it to
whichever agent(s) run — agents never query the DB themselves for user
context, so every agent sees a consistent snapshot and we don't refetch
the same rows five times in a multi-agent turn.

Everything here is read-only and defensive: any missing table/relationship
degrades gracefully (empty list / sane default) rather than raising, since
not every user has a growth plan, streak row, etc. yet.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from Backend.models.dashboard import GrowthPlan, DailyTask, AIInsight
from Backend.models.growth_plan import UserGrowthPlan, GrowthPhase, GrowthTask
from Backend.models.practice import UserStreak, UserSkillProgress
from Backend.models.smart_task import SmartDailyTask
from Backend.models.onboarding import UserOnboarding


@dataclass
class MemoryContext:
    """Everything an agent could plausibly need about a user, gathered once."""

    # Optional because lightweight/back-compat callers (old service functions
    # that only ever had a plain `profile` dict, no DB session) build a
    # context with no real user_id. Anything DB-backed always sets it.
    user_id: UUID | None = None
    profile: dict[str, Any] = field(default_factory=dict)

    # Missions / goals
    active_growth_plan: dict[str, Any] | None = None      # legacy dashboard.GrowthPlan
    active_mission: dict[str, Any] | None = None           # growth_plan.UserGrowthPlan (phases/xp/streak)

    # Habits / consistency
    streak: dict[str, Any] = field(default_factory=dict)
    skill_progress: list[dict[str, Any]] = field(default_factory=list)

    # Today
    todays_tasks: list[dict[str, Any]] = field(default_factory=list)
    completed_today: list[dict[str, Any]] = field(default_factory=list)

    # History
    recent_insights: list[dict[str, Any]] = field(default_factory=list)
    conversation_history: list[dict[str, str]] = field(default_factory=list)

    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_prompt_block(self) -> str:
        """
        Renders the context as a compact text block agents can drop straight
        into a prompt. Keeps prompts self-contained without every agent
        re-implementing its own formatting.
        """
        lines: list[str] = []
        p = self.profile
        lines.append(f"User type: {p.get('user_type', 'unknown')}")
        if p.get("primary_goal"):
            lines.append(f"Primary goal: {p['primary_goal']}")
        if p.get("twelve_month_goal"):
            lines.append(f"12-month goal: {p['twelve_month_goal']}")
        if p.get("career_goal"):
            lines.append(f"Career goal: {p['career_goal']}")

        if self.active_mission:
            m = self.active_mission
            lines.append(
                f"Active mission: {m.get('goal')} — "
                f"{m.get('overall_progress', 0)}% complete, "
                f"phase {m.get('current_phase_id', 1)}, "
                f"streak {m.get('streak', 0)} days"
            )
        elif self.active_growth_plan:
            g = self.active_growth_plan
            lines.append(f"Active growth plan: {g.get('title')} — {g.get('summary', '')}")

        if self.streak:
            lines.append(
                f"Current streak: {self.streak.get('current_streak', 0)} days "
                f"(longest: {self.streak.get('longest_streak', 0)}), "
                f"practiced today: {self.streak.get('practiced_today', False)}"
            )

        if self.todays_tasks:
            done = len(self.completed_today)
            total = len(self.todays_tasks)
            lines.append(f"Today's tasks: {done}/{total} completed")
            for t in self.todays_tasks[:8]:
                mark = "x" if t.get("completed") else " "
                lines.append(f"  [{mark}] {t.get('title')}")

        if self.skill_progress:
            top = sorted(self.skill_progress, key=lambda s: -s.get("progress_pct", 0))[:5]
            skills_str = ", ".join(f"{s['topic']} ({s['progress_pct']}%)" for s in top)
            lines.append(f"Skill progress: {skills_str}")

        if self.recent_insights:
            lines.append("Recent AI insights:")
            for i in self.recent_insights[:3]:
                lines.append(f"  - ({i.get('insight_type')}) {i.get('insight')}")

        return "\n".join(lines)


def _safe_query_one(db: Session, model, **filters):
    try:
        q = db.query(model)
        for k, v in filters.items():
            q = q.filter(getattr(model, k) == v)
        return q.first()
    except Exception:
        return None


def _safe_query_all(db: Session, model, order_by=None, limit: int | None = None, **filters):
    try:
        q = db.query(model)
        for k, v in filters.items():
            q = q.filter(getattr(model, k) == v)
        if order_by is not None:
            q = q.order_by(order_by)
        if limit:
            q = q.limit(limit)
        return q.all()
    except Exception:
        return []


def build_memory_context(user_id: UUID, db: Session, profile: dict[str, Any] | None = None) -> MemoryContext:
    """
    Build a full MemoryContext for a user in one pass. `profile` can be
    passed in if the caller already built it (e.g. via routers.dashboard's
    get_user_profile) to avoid a duplicate onboarding query.
    """
    if profile is None:
        ob = _safe_query_one(db, UserOnboarding, user_id=user_id)
        profile = _onboarding_to_profile(ob) if ob else {"user_type": "student"}

    ctx = MemoryContext(user_id=user_id, profile=profile)

    growth_plan = _safe_query_one(db, GrowthPlan, user_id=user_id, is_active=True)
    if growth_plan:
        ctx.active_growth_plan = {
            "id": str(growth_plan.id),
            "title": growth_plan.title,
            "summary": growth_plan.summary,
            "months": growth_plan.months,
        }

    mission = _safe_query_one(db, UserGrowthPlan, user_id=user_id, is_active=True)
    if mission:
        ctx.active_mission = {
            "id": str(mission.id),
            "goal": mission.goal,
            "category": mission.category,
            "overall_progress": mission.overall_progress,
            "current_phase_id": mission.current_phase_id,
            "total_xp": mission.total_xp,
            "streak": mission.streak,
        }

    streak = _safe_query_one(db, UserStreak, user_id=user_id)
    if streak:
        ctx.streak = {
            "current_streak": streak.current_streak,
            "longest_streak": streak.longest_streak,
            "last_practice_date": str(streak.last_practice_date) if streak.last_practice_date else None,
            "practiced_today": streak.practiced_today,
        }

    skills = _safe_query_all(db, UserSkillProgress, user_id=user_id)
    ctx.skill_progress = [
        {"topic": s.topic, "progress_pct": s.progress_pct} for s in skills
    ]

    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
    tasks = _safe_query_all(db, DailyTask, user_id=user_id)
    todays = [t for t in tasks if t.task_date and t.task_date >= today_start] or tasks[-10:]
    ctx.todays_tasks = [
        {"id": str(t.id), "title": t.title, "completed": t.completed, "priority": t.priority}
        for t in todays
    ]
    ctx.completed_today = [t for t in ctx.todays_tasks if t["completed"]]

    insights = _safe_query_all(
        db, AIInsight, user_id=user_id,
        order_by=AIInsight.generated_at.desc(), limit=5,
    )
    ctx.recent_insights = [
        {"insight": i.insight, "insight_type": i.insight_type} for i in insights
    ]

    return ctx


def lightweight_context(profile: dict[str, Any]) -> MemoryContext:
    """
    Builds a MemoryContext from a plain profile dict with no DB access.
    Used by legacy service-layer wrappers (gemini_service.py etc.) that were
    only ever called with `user_profile: dict`, not a user_id + db session.
    Degrades gracefully — every field beyond `profile` stays empty, and
    to_prompt_block() already handles empty fields fine.
    """
    return MemoryContext(user_id=None, profile=profile or {"user_type": "student"})


def _onboarding_to_profile(ob) -> dict[str, Any]:
    """Mirrors routers.dashboard.get_user_profile — kept here too so the AI
    layer never has a hard dependency on the routers package (avoids
    circular imports)."""
    profile = {
        "user_type": ob.user_type or "student",
        "primary_goal": ob.primary_goal or "grow career",
        "twelve_month_goal": ob.twelve_month_goal or "get a job",
        "interests": ob.interests or ["programming"],
        "daily_time": ob.daily_time or "2-3hours",
        "career_goal": ob.career_goal or "",
        "productivity_style": ob.productivity_style or "deep_focus",
        "country": ob.country or "India",
        "experience_level": getattr(ob, "experience_level", "") or "",
        "exam_type": getattr(ob, "exam_type", "") or "",
    }
    return profile
