"""
Backend/nova/context_builder.py

State Resolver / Context Builder for NOVA.

Resolves existing database models and session data into a fully-typed NovaState object.
Guarantees graceful degradation: if database records, user IDs, or specific relationships
do not exist yet, safe default structures are generated without raising exceptions.
"""

from __future__ import annotations

import logging
from datetime import datetime, date, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from Backend.nova.types import (
    NovaState,
    UserProfileContext,
    ConversationContext,
    ChatMessage,
    GoalContext,
    TaskContext,
    TaskItem,
    RoadmapContext,
    PhaseSummary,
    ProgressContext,
    SkillItem,
    ActivityContext,
    InsightItem,
    MetadataContext,
)

# SQLAlchemy Models
from Backend.models.user import User
from Backend.models.onboarding import UserOnboarding
from Backend.models.growth_plan import UserGrowthPlan, GrowthPhase, GrowthTask
from Backend.models.dashboard import GrowthPlan, DailyTask, AIInsight
from Backend.models.practice import UserStreak, UserSkillProgress
from Backend.nova.memory import get_memory_manager

logger = logging.getLogger("growthos.nova.context_builder")


def _safe_query_one(db: Session, model: Any, **filters: Any) -> Any:
    """Helper to query single DB entity safely without throwing errors."""
    try:
        q = db.query(model)
        for k, v in filters.items():
            q = q.filter(getattr(model, k) == v)
        return q.first()
    except Exception as exc:
        logger.debug("Failed safe_query_one for %s: %s", model, exc)
        return None


def _safe_query_all(db: Session, model: Any, order_by: Any = None, limit: Optional[int] = None, **filters: Any) -> List[Any]:
    """Helper to query multiple DB entities safely without throwing errors."""
    try:
        q = db.query(model)
        for k, v in filters.items():
            q = q.filter(getattr(model, k) == v)
        if order_by is not None:
            q = q.order_by(order_by)
        if limit:
            q = q.limit(limit)
        return q.all()
    except Exception as exc:
        logger.debug("Failed safe_query_all for %s: %s", model, exc)
        return []


def build_nova_state(
    *,
    user_id: Optional[UUID | str] = None,
    db: Optional[Session] = None,
    user_message: Optional[str] = None,
    conversation_history: Optional[List[Dict[str, str] | ChatMessage]] = None,
    override_profile: Optional[Dict[str, Any]] = None,
    session_id: Optional[str] = None,
) -> NovaState:
    """
    Assembles a complete, typed NovaState snapshot.

    Arguments:
        user_id: Target user UUID string or object.
        db: SQLAlchemy DB Session.
        user_message: Initial message sent by user (if applicable).
        conversation_history: List of past message dicts or ChatMessage items.
        override_profile: Direct profile dictionary (used for guest or lightweight mode).
        session_id: Conversation session identifier.

    Returns:
        NovaState instance populated with user profile, goal, roadmap, task, progress, and activity context.
    """
    uid_str = str(user_id) if user_id else None
    state = NovaState()

    if session_id:
        state.conversation.session_id = session_id

    # ──────────────────────────────────────────────────────────────────────────
    # 1. User Profile Context
    # ──────────────────────────────────────────────────────────────────────────
    profile_data: Dict[str, Any] = override_profile or {}
    user_entity: Optional[User] = None
    onboarding_entity: Optional[UserOnboarding] = None

    if db and uid_str:
        user_entity = _safe_query_one(db, User, id=uid_str)
        onboarding_entity = _safe_query_one(db, UserOnboarding, user_id=uid_str)

    if user_entity:
        profile_data["name"] = profile_data.get("name") or user_entity.name
        profile_data["email"] = profile_data.get("email") or user_entity.email

    if onboarding_entity:
        profile_data.setdefault("user_type", onboarding_entity.user_type or "student")
        profile_data.setdefault("primary_goal", onboarding_entity.primary_goal)
        profile_data.setdefault("twelve_month_goal", onboarding_entity.twelve_month_goal)
        profile_data.setdefault("career_goal", onboarding_entity.career_goal)
        profile_data.setdefault("daily_time", onboarding_entity.daily_time)
        profile_data.setdefault("productivity_style", onboarding_entity.productivity_style)
        profile_data.setdefault("country", onboarding_entity.country)
        profile_data.setdefault("experience_level", getattr(onboarding_entity, "experience_level", None))
        profile_data.setdefault("exam_type", getattr(onboarding_entity, "exam_type", None))
        profile_data.setdefault("attempt_year", getattr(onboarding_entity, "attempt_year", None))
        profile_data.setdefault("field_of_study", getattr(onboarding_entity, "field_of_study", None))
        profile_data.setdefault("primary_skill", getattr(onboarding_entity, "primary_skill", None))
        profile_data.setdefault("monthly_income_goal", getattr(onboarding_entity, "monthly_income_goal", None))
        profile_data.setdefault("business_type", getattr(onboarding_entity, "business_type", None))
        profile_data.setdefault("business_goal", getattr(onboarding_entity, "business_goal", None))
        profile_data.setdefault("creator_platform", getattr(onboarding_entity, "creator_platform", None))
        profile_data.setdefault("content_niche", getattr(onboarding_entity, "content_niche", None))
        profile_data.setdefault("interests", onboarding_entity.interests or [])

    from Backend.routers.dashboard import resolve_exact_user_goal
    specific_goal = resolve_exact_user_goal(profile_data)

    state.user = UserProfileContext(
        user_id=uid_str,
        email=profile_data.get("email"),
        name=profile_data.get("name"),
        user_type=profile_data.get("user_type", "student"),
        primary_goal=specific_goal,
        twelve_month_goal=profile_data.get("twelve_month_goal"),
        career_goal=profile_data.get("career_goal"),
        daily_time=profile_data.get("daily_time"),
        productivity_style=profile_data.get("productivity_style"),
        country=profile_data.get("country"),
        experience_level=profile_data.get("experience_level"),
        exam_type=profile_data.get("exam_type"),
        interests=profile_data.get("interests", []),
    )

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Conversation Context
    # ──────────────────────────────────────────────────────────────────────────
    if user_message:
        state.conversation.latest_user_message = user_message

    if conversation_history:
        history_msgs: List[ChatMessage] = []
        for item in conversation_history:
            if isinstance(item, ChatMessage):
                history_msgs.append(item)
            elif isinstance(item, dict):
                history_msgs.append(
                    ChatMessage(
                        role=item.get("role", "user"),
                        content=item.get("content", ""),
                        timestamp=item.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                    )
                )
        state.conversation.history = history_msgs

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Goal & Roadmap Context
    # ──────────────────────────────────────────────────────────────────────────
    active_mission: Optional[UserGrowthPlan] = None
    if db and uid_str:
        active_mission = _safe_query_one(db, UserGrowthPlan, user_id=uid_str, is_active=True)

    if active_mission:
        state.current_goal = GoalContext(
            primary_goal=state.user.primary_goal,
            twelve_month_goal=state.user.twelve_month_goal,
            active_mission_title=active_mission.goal,
            category=active_mission.category,
            target_date=active_mission.target_date,
            overall_progress_pct=active_mission.overall_progress or 0,
        )

        phases_list: List[PhaseSummary] = []
        curr_phase_label: Optional[str] = None
        curr_phase_theme: Optional[str] = None

        phases_entities = _safe_query_all(db, GrowthPhase, plan_id=active_mission.id)
        for ph in phases_entities:
            phases_list.append(
                PhaseSummary(
                    id=str(ph.id),
                    phase_number=ph.phase_number,
                    label=ph.label,
                    theme=ph.theme,
                    status=ph.status,
                    progress=ph.progress or 0,
                )
            )
            if ph.phase_number == active_mission.current_phase_id:
                curr_phase_label = ph.label
                curr_phase_theme = ph.theme

        state.roadmap_context = RoadmapContext(
            plan_id=str(active_mission.id),
            title=active_mission.goal,
            summary=f"Category: {active_mission.category or 'General'}",
            current_phase_id=active_mission.current_phase_id or 1,
            current_phase_label=curr_phase_label,
            current_phase_theme=curr_phase_theme,
            overall_progress=active_mission.overall_progress or 0,
            phases=phases_list,
        )
    else:
        # Fallback to legacy dashboard GrowthPlan if present
        legacy_plan: Optional[GrowthPlan] = None
        if db and uid_str:
            legacy_plan = _safe_query_one(db, GrowthPlan, user_id=uid_str, is_active=True)

        if legacy_plan:
            state.roadmap_context = RoadmapContext(
                plan_id=str(legacy_plan.id),
                title=legacy_plan.title,
                summary=legacy_plan.summary,
            )

    # ──────────────────────────────────────────────────────────────────────────
    # 4. Task Context
    # ──────────────────────────────────────────────────────────────────────────
    if db and uid_str:
        daily_tasks_entities = _safe_query_all(db, DailyTask, user_id=uid_str)
        todays_items: List[TaskItem] = []
        completed_items: List[TaskItem] = []

        for t in daily_tasks_entities[-15:]:
            item = TaskItem(
                id=str(t.id),
                title=t.title,
                completed=t.completed or False,
                priority=t.priority or "medium",
                task_type=t.category or "daily",
            )
            todays_items.append(item)
            if t.completed:
                completed_items.append(item)

        # Check pending growth phase tasks
        pending_growth: List[TaskItem] = []
        if state.roadmap_context.plan_id:
            growth_tasks = _safe_query_all(db, GrowthTask, user_id=uid_str, completed=False, limit=10)
            for gt in growth_tasks:
                pending_growth.append(
                    TaskItem(
                        id=str(gt.id),
                        title=gt.title,
                        completed=False,
                        priority=gt.difficulty or "medium",
                        task_type=gt.task_type or "challenge",
                        xp=gt.xp or 50,
                    )
                )

        state.current_task = TaskContext(
            todays_tasks=todays_items,
            completed_today=completed_items,
            pending_growth_tasks=pending_growth,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 5. Progress Context
    # ──────────────────────────────────────────────────────────────────────────
    if db and uid_str:
        streak_row = _safe_query_one(db, UserStreak, user_id=uid_str)
        skills_rows = _safe_query_all(db, UserSkillProgress, user_id=uid_str)

        skill_items: List[SkillItem] = [
            SkillItem(topic=s.topic, progress_pct=s.progress_pct or 0) for s in skills_rows
        ]

        state.progress_context = ProgressContext(
            current_streak=streak_row.current_streak if streak_row else (active_mission.streak if active_mission else 0),
            longest_streak=streak_row.longest_streak if streak_row else 0,
            total_xp=active_mission.total_xp if active_mission else 0,
            rank=active_mission.rank if active_mission else None,
            practiced_today=streak_row.practiced_today if streak_row else False,
            skills=skill_items,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 6. Activity Context
    # ──────────────────────────────────────────────────────────────────────────
    if db and uid_str:
        insights_rows = _safe_query_all(db, AIInsight, user_id=uid_str, order_by=AIInsight.generated_at.desc(), limit=5)
        insight_items: List[InsightItem] = [
            InsightItem(
                insight=i.insight,
                insight_type=i.insight_type or "growth",
                generated_at=str(i.generated_at) if i.generated_at else None,
            )
            for i in insights_rows
        ]

        state.activity_context = ActivityContext(
            recent_insights=insight_items,
            recent_completed_tasks_count=len(state.current_task.completed_today),
            last_active_at=datetime.now(timezone.utc).isoformat(),
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 7. Personal Memory Layer (Step 2)
    # ──────────────────────────────────────────────────────────────────────────
    if db and uid_str:
        try:
            mem_mgr = get_memory_manager()
            retrieved_mems = mem_mgr.retrieve(
                db,
                user_id=uid_str,
                query_text=user_message,
                limit=5,
            )
            state.memories = retrieved_mems
        except Exception as exc:
            logger.debug("Failed memory retrieval during context build: %s", exc)
            state.memories = []

    state.metadata.execution_stage = "context_assembled"
    return state
