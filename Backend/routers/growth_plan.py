"""
routers/growth_plan.py
All FastAPI endpoints for the Growth Plan system.

Endpoints:
  GET  /growth-plan/me              → Get or generate user's full plan
  POST /growth-plan/generate        → Force regenerate plan from AI
  POST /growth-plan/task/{task_id}/toggle → Mark task complete/incomplete
  GET  /growth-plan/progress        → Get overall progress stats
  POST /growth-plan/reset           → Reset plan (dev/testing)

All routes protected by JWT via get_current_user.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone, date, timedelta
from uuid import UUID

from Backend.db.session import get_db
from Backend.routers.auth import get_current_user
from Backend.models.growth_plan import UserGrowthPlan, GrowthPhase, GrowthTask
from Backend.models.practice import UserStreak              # reuse existing streak model
from Backend.routers.dashboard import get_user_profile      # reuse existing profile builder
from Backend.services.growth_plan_ai import (
    generate_full_growth_plan,
    generate_smart_message,
    get_fallback_plan,
)
from Backend.schemas.growth_plan import GrowthPlanResponse, TaskToggleResponse

router = APIRouter(tags=["Growth Plan"])


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _recalculate_progress(plan: UserGrowthPlan, db: Session) -> None:
    """
    Recalculate phase progress and overall plan progress after any task change.
    Called after every task toggle.
    """
    total_tasks_all  = 0
    done_tasks_all   = 0

    for phase in plan.phases:
        tasks     = db.query(GrowthTask).filter(GrowthTask.phase_id == phase.id).all()
        total     = len(tasks)
        done      = sum(1 for t in tasks if t.completed)

        total_tasks_all += total
        done_tasks_all  += done

        # Phase progress %
        phase.progress  = int((done / total) * 100) if total > 0 else 0
        phase.xp_earned = sum(t.xp for t in tasks if t.completed)

        # Phase status transitions
        if phase.progress == 100 and phase.status == "active":
            phase.status = "completed"
            # Unlock the next phase
            next_phase = db.query(GrowthPhase).filter(
                GrowthPhase.plan_id == plan.id,
                GrowthPhase.phase_number == phase.phase_number + 1
            ).first()
            if next_phase and next_phase.status == "locked":
                next_phase.status        = "active"
                plan.current_phase_id    = next_phase.phase_number

    # Overall plan progress
    plan.overall_progress = int((done_tasks_all / total_tasks_all) * 100) if total_tasks_all > 0 else 0
    plan.total_xp         = sum(t.xp for phase in plan.phases for t in db.query(GrowthTask).filter(GrowthTask.phase_id == phase.id, GrowthTask.completed == True).all())

    db.commit()


def _build_weekly_graph() -> list:
    """Build a 7-day activity graph with Mon–Sun labels."""
    today      = date.today()
    days       = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    start      = today - timedelta(days=today.weekday())   # Monday of current week
    graph      = []
    for i in range(7):
        d = start + timedelta(days=i)
        graph.append({"day": days[i], "done": 0, "total": 4})
    return graph


def _plan_to_response(plan: UserGrowthPlan, db: Session) -> dict:
    """
    Convert SQLAlchemy UserGrowthPlan to a dict the frontend expects.
    """
    phases_out = []
    for phase in sorted(plan.phases, key=lambda p: p.phase_number):
        tasks = db.query(GrowthTask).filter(GrowthTask.phase_id == phase.id).order_by(GrowthTask.created_at).all()
        phases_out.append({
            "id":               str(phase.id),
            "phase_number":     phase.phase_number,
            "label":            phase.label,
            "theme":            phase.theme,
            "status":           phase.status,
            "progress":         phase.progress,
            "xp_total":         phase.xp_total,
            "xp_earned":        phase.xp_earned,
            "milestone":        phase.milestone,
            "milestone_reward": phase.milestone_reward,
            "skills":           phase.skills or [],
            "tasks": [
                {
                    "id":         str(t.id),
                    "title":      t.title,
                    "xp":         t.xp,
                    "difficulty": t.difficulty,
                    "task_type":  t.task_type,
                    "completed":  t.completed,
                }
                for t in tasks
            ],
        })

    return {
        "id":               str(plan.id),
        "goal":             plan.goal,
        "goal_icon":        plan.goal_icon or "🎯",
        "category":         plan.category,
        "timeline":         plan.timeline,
        "start_date":       plan.start_date,
        "target_date":      plan.target_date,
        "overall_progress": plan.overall_progress,
        "current_phase_id": plan.current_phase_id,
        "total_xp":         plan.total_xp,
        "streak":           plan.streak or 0,
        "rank":             plan.rank,
        "weekly_graph":     plan.weekly_graph or _build_weekly_graph(),
        "smart_message": {
            "type": plan.smart_message_type or "info",
            "text": plan.smart_message_text or "Keep going — every task gets you closer to your goal.",
        },
        "phases": phases_out,
        "generated_at": plan.generated_at.isoformat() if plan.generated_at else None,
    }


def _save_plan_from_data(user_id: UUID, data: dict, db: Session) -> UserGrowthPlan:
    """
    Save a generated/fallback plan dict into the DB.
    Creates UserGrowthPlan → GrowthPhase → GrowthTask rows.
    """
    plan = UserGrowthPlan(
        user_id            = user_id,
        goal               = data.get("goal", "Your Growth Goal"),
        goal_icon          = data.get("goal_icon", "🎯"),
        category           = data.get("category", ""),
        timeline           = data.get("timeline", "6 months"),
        start_date         = data.get("start_date", ""),
        target_date        = data.get("target_date", ""),
        smart_message_type = data.get("smart_message_type", "info"),
        smart_message_text = data.get("smart_message_text", ""),
        weekly_graph       = _build_weekly_graph(),
        overall_progress   = 0,
        current_phase_id   = 2,   # Phase 2 is active by default
        total_xp           = 0,
        streak             = 0,
        is_active          = True,
    )
    db.add(plan)
    db.flush()   # get plan.id without full commit

    for phase_data in data.get("phases", []):
        phase = GrowthPhase(
            plan_id          = plan.id,
            user_id          = user_id,
            phase_number     = phase_data["phase_number"],
            label            = phase_data["label"],
            theme            = phase_data["theme"],
            status           = phase_data.get("status", "locked"),
            progress         = phase_data.get("progress", 0),
            xp_total         = phase_data.get("xp_total", 0),
            xp_earned        = phase_data.get("xp_earned", 0),
            milestone        = phase_data.get("milestone", ""),
            milestone_reward = phase_data.get("milestone_reward", ""),
            skills           = phase_data.get("skills", []),
        )
        db.add(phase)
        db.flush()   # get phase.id

        for task_data in phase_data.get("tasks", []):
            task = GrowthTask(
                phase_id   = phase.id,
                user_id    = user_id,
                title      = task_data["title"],
                xp         = task_data.get("xp", 50),
                difficulty = task_data.get("difficulty", "medium"),
                task_type  = task_data.get("task_type", "challenge"),
                completed  = task_data.get("completed", False),
                completed_at = datetime.now(timezone.utc) if task_data.get("completed") else None,
            )
            db.add(task)

    db.commit()
    db.refresh(plan)
    return plan


# ─────────────────────────────────────────────────────────────────────────────
# GET /growth-plan/me
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/me")
def get_my_growth_plan(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    """
    Returns the user's active growth plan.
    If no plan exists yet, generates one via Gemini AI (or fallback).
    Also syncs streak data from the practice streak table.
    """
    # ── Check for existing active plan ───────────────────────────────────────
    plan = db.query(UserGrowthPlan).filter(
        UserGrowthPlan.user_id   == current_user.id,
        UserGrowthPlan.is_active == True,
    ).first()

    if not plan:
        # ── Generate new plan ─────────────────────────────────────────────────
        profile  = get_user_profile(current_user.id, db)
        data     = generate_full_growth_plan(profile)   # AI or fallback
        plan     = _save_plan_from_data(current_user.id, data, db)

    # ── Sync streak from practice streak table ────────────────────────────────
    try:
        streak_row = db.query(UserStreak).filter(UserStreak.user_id == current_user.id).first()
        if streak_row:
            plan.streak = streak_row.current_streak
            db.commit()
    except Exception:
        pass

    # ── Check if user missed yesterday for smart message ─────────────────────
    try:
        streak_row    = db.query(UserStreak).filter(UserStreak.user_id == current_user.id).first()
        missed        = False
        if streak_row and streak_row.last_practice_date:
            last = streak_row.last_practice_date
            if isinstance(last, str):
                last = date.fromisoformat(last)
            yesterday = date.today() - timedelta(days=1)
            missed    = last < yesterday

        profile = get_user_profile(current_user.id, db)
        msg     = generate_smart_message(profile, {
            "streak":           plan.streak or 0,
            "phase_progress":   plan.phases[plan.current_phase_id - 1].progress if plan.phases else 0,
            "missed_yesterday": missed,
        })
        plan.smart_message_type = msg["type"]
        plan.smart_message_text = msg["text"]
        db.commit()
    except Exception:
        pass

    return _plan_to_response(plan, db)


# ─────────────────────────────────────────────────────────────────────────────
# POST /growth-plan/generate
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/generate")
def generate_growth_plan_endpoint(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    """
    Force-regenerate the user's growth plan via Gemini AI.
    Deactivates the old plan and creates a new one.
    """
    # Deactivate existing plans
    db.query(UserGrowthPlan).filter(
        UserGrowthPlan.user_id   == current_user.id,
        UserGrowthPlan.is_active == True,
    ).update({"is_active": False})
    db.commit()

    profile = get_user_profile(current_user.id, db)
    data    = generate_full_growth_plan(profile)
    plan    = _save_plan_from_data(current_user.id, data, db)

    return _plan_to_response(plan, db)


# ─────────────────────────────────────────────────────────────────────────────
# POST /growth-plan/task/{task_id}/toggle
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/task/{task_id}/toggle")
def toggle_task(
    task_id: UUID,
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    """
    Mark a growth task as complete or incomplete.
    Recalculates phase progress and overall plan progress after toggling.
    Returns updated progress numbers so the frontend can update live.
    """
    task = db.query(GrowthTask).filter(
        GrowthTask.id      == task_id,
        GrowthTask.user_id == current_user.id,
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Toggle
    task.completed   = not task.completed
    task.completed_at = datetime.now(timezone.utc) if task.completed else None
    db.commit()

    # Get the plan and recalculate
    phase = db.query(GrowthPhase).filter(GrowthPhase.id == task.phase_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    plan = db.query(UserGrowthPlan).filter(UserGrowthPlan.id == phase.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    _recalculate_progress(plan, db)
    db.refresh(phase)
    db.refresh(plan)

    return {
        "success":          True,
        "task_id":          str(task_id),
        "completed":        task.completed,
        "xp_earned":        task.xp if task.completed else 0,
        "phase_progress":   phase.progress,
        "overall_progress": plan.overall_progress,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /growth-plan/progress
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/progress")
def get_progress(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    """
    Returns a lightweight progress summary.
    Used by the dashboard header stats without loading the full plan.
    """
    plan = db.query(UserGrowthPlan).filter(
        UserGrowthPlan.user_id   == current_user.id,
        UserGrowthPlan.is_active == True,
    ).first()

    if not plan:
        return {
            "overall_progress": 0,
            "current_phase":    1,
            "total_xp":         0,
            "streak":           0,
            "goal":             "",
        }

    return {
        "overall_progress": plan.overall_progress,
        "current_phase":    plan.current_phase_id,
        "total_xp":         plan.total_xp,
        "streak":           plan.streak or 0,
        "goal":             plan.goal,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /growth-plan/reset   (dev/admin only)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/reset")
def reset_plan(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    """
    Deactivates all plans for the user.
    Next call to /me will regenerate a fresh plan.
    Useful for testing or when user changes their goal.
    """
    deleted = db.query(UserGrowthPlan).filter(
        UserGrowthPlan.user_id == current_user.id
    ).update({"is_active": False})
    db.commit()

    return {"success": True, "plans_deactivated": deleted}