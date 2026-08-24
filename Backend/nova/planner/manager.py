"""
Backend/nova/planner/manager.py

High-Level Planning & Goal Decomposition Orchestrator for NOVA (Step 9).
Coordinates Current State Gap Analysis, Phase/Milestone/Task Generation, Dependency Sorting, Time Budgeting,
Resource Association, Critic Validation, and Persistence.
"""

from __future__ import annotations

import logging
import time
from typing import List, Optional, TYPE_CHECKING
from uuid import UUID
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from Backend.nova.types import NovaState

from Backend.nova.planner.types import (
    GoalCategory,
    HorizonType,
    PlanPhaseItem,
    PlanningPayload,
    TaskItem,
)
from Backend.nova.planner.gap_analyzer import GapAnalyzer
from Backend.nova.planner.dependency_engine import DependencyEngine
from Backend.nova.planner.task_generator import TaskGenerator
from Backend.nova.planner.time_budget import TimeBudgetEvaluator
from Backend.nova.planner.prioritizer import PriorityCalculator
from Backend.nova.planner.resource_integrator import ResourceIntegrator
from Backend.nova.planner.critic_integrator import PlanCriticIntegrator

logger = logging.getLogger("growthos.nova.planner.manager")


def infer_goal_category(user_query: str) -> GoalCategory:
    """Infers GoalCategory from query text."""
    q_lower = user_query.lower()
    if any(k in q_lower for k in ["routine", "habit", "health", "meditation", "personal"]):
        return GoalCategory.PERSONAL
    elif any(k in q_lower for k in ["neet", "jee", "upsc", "exam", "syllabus", "degree"]):
        return GoalCategory.EDUCATION
    elif any(k in q_lower for k in ["startup", "business", "launch company", "saas"]):
        return GoalCategory.BUSINESS
    elif any(k in q_lower for k in ["youtube", "channel", "content creator", "podcast"]):
        return GoalCategory.CREATOR
    elif any(k in q_lower for k in ["freelance", "clients", "upwork", "fiverr"]):
        return GoalCategory.FREELANCE
    elif any(k in q_lower for k in ["ai engineer", "developer", "software engineer", "data scientist", "python", "tech"]):
        return GoalCategory.TECHNOLOGY
    elif "study" in q_lower:
        return GoalCategory.EDUCATION
    else:
        return GoalCategory.CAREER


class NovaPlanner:
    """
    High-level Orchestrator for Goal Decomposition and Executable Plan Generation.
    """

    def __init__(
        self,
        gap_analyzer: Optional[GapAnalyzer] = None,
        dependency_engine: Optional[DependencyEngine] = None,
        task_generator: Optional[TaskGenerator] = None,
        time_evaluator: Optional[TimeBudgetEvaluator] = None,
        prioritizer: Optional[PriorityCalculator] = None,
        resource_integrator: Optional[ResourceIntegrator] = None,
        critic_integrator: Optional[PlanCriticIntegrator] = None,
    ):
        self.gap_analyzer = gap_analyzer or GapAnalyzer()
        self.dependency_engine = dependency_engine or DependencyEngine()
        self.task_generator = task_generator or TaskGenerator()
        self.time_evaluator = time_evaluator or TimeBudgetEvaluator()
        self.prioritizer = prioritizer or PriorityCalculator()
        self.resource_integrator = resource_integrator or ResourceIntegrator()
        self.critic_integrator = critic_integrator or PlanCriticIntegrator()

    def generate_plan(
        self,
        user_query: str,
        state: Optional[NovaState] = None,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
        override_category: Optional[GoalCategory] = None,
    ) -> PlanningPayload:
        """
        Executes end-to-end Goal Decomposition and Plan Generation.
        """
        start_time = time.monotonic()
        category = override_category or infer_goal_category(user_query)
        goal_title = user_query.strip().title()

        logger.info("[NOVA_PLANNER] Generating plan for goal='%s' (category=%s, user_id=%s)", goal_title, category.value, user_id)

        # 1. Analyze Gaps between Current State and Desired Goal State
        gap_items = self.gap_analyzer.analyze_gaps(goal_title=goal_title, state=state)

        # 2. Generate Hierarchical Phases, Milestones, Objectives, and Tasks
        phases = self.task_generator.generate_phases_and_tasks(goal_title=goal_title, gap_items=gap_items, state=state)

        # Collect all tasks across phases
        all_tasks: List[TaskItem] = []
        for phase in phases:
            for ms in phase.milestones:
                for obj in ms.objectives:
                    all_tasks.extend(obj.tasks)

        # 3. Sort Tasks Topologically by Prerequisites
        sorted_tasks = self.dependency_engine.sort_tasks_topologically(all_tasks)
        dependencies = self.dependency_engine.extract_dependencies(all_tasks)

        # 4. Calculate Task Priorities
        self.prioritizer.calculate_task_priorities(all_tasks, dependencies)

        # 5. Evaluate Workload and Daily Time Budget
        total_mins, daily_budget, time_status, assumptions = self.time_evaluator.evaluate_workload(all_tasks, state)

        # 6. Associate Step 7 Resources with Tasks
        self.resource_integrator.attach_resources_to_tasks(all_tasks, db=db, user_id=user_id, state=state)

        duration_ms = round((time.monotonic() - start_time) * 1000.0, 2)

        user_current = (
            f"Level: {state.user.experience_level if state and state.user else 'beginner'}, "
            f"Primary Goal: {state.user.primary_goal if state and state.user else 'N/A'}"
        )

        payload = PlanningPayload(
            goal_title=goal_title,
            goal_category=category,
            horizon=HorizonType.MEDIUM_TERM,
            user_current_state=user_current,
            gap_analysis=gap_items,
            phases=phases,
            total_estimated_mins=total_mins,
            daily_time_budget_mins=daily_budget,
            time_feasibility_status=time_status,
            assumptions=assumptions,
            confidence=0.90,
            plan_version=1,
            execution_time_ms=duration_ms,
        )

        # 7. Validate Plan via Step 8 Critic Integrator
        payload = self.critic_integrator.validate_plan(payload, state=state)

        # 8. Persist Plan in Database
        if db and user_id:
            self.persist_plan(db, user_id, payload)

        logger.info(
            "[NOVA_PLANNER] Plan generation completed in %.2fms (%d phases, %d total tasks, total_mins=%d)",
            duration_ms,
            len(phases),
            len(all_tasks),
            total_mins,
        )
        return payload

    def persist_plan(self, db: Session, user_id: str, payload: PlanningPayload) -> bool:
        """Persists generated goal and plan records into database."""
        if not db or not user_id:
            return False

        try:
            from Backend.nova.planner.models import NovaGoalModel, NovaPlanModel, NovaPlanPhaseModel
            u_uuid = UUID(str(user_id))

            goal_rec = NovaGoalModel(
                user_id=u_uuid,
                title=payload.goal_title,
                category=payload.goal_category.value,
                status="active",
            )
            db.add(goal_rec)
            db.commit()
            db.refresh(goal_rec)

            plan_rec = NovaPlanModel(
                goal_id=goal_rec.id,
                user_id=u_uuid,
                version=payload.plan_version,
                total_estimated_mins=payload.total_estimated_mins,
                daily_time_budget_mins=payload.daily_time_budget_mins,
                time_feasibility=payload.time_feasibility_status,
                confidence=payload.confidence,
                assumptions_json=payload.assumptions,
            )
            db.add(plan_rec)
            db.commit()
            logger.info("[NOVA_PLANNER] Persisted goal id=%s and plan id=%s in DB", goal_rec.id, plan_rec.id)
            return True
        except Exception as exc:
            logger.debug("[NOVA_PLANNER] Failed to persist plan record: %s", exc)
            db.rollback()
            return False


# Global singleton instance
_default_nova_planner: Optional[NovaPlanner] = None


def get_nova_planner() -> NovaPlanner:
    global _default_nova_planner
    if _default_nova_planner is None:
        _default_nova_planner = NovaPlanner()
    return _default_nova_planner
