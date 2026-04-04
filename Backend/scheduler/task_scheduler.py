# scheduler/task_scheduler.py
# Drop-in replacement for your existing scheduler snippet.
# Generates smart tasks (2 hard + 1 easy) for ALL users at midnight UTC.
# Also adds a retry job at 00:30 for any users who failed.
#
# Usage in main.py:
#   from scheduler.task_scheduler import start_scheduler, shutdown_scheduler
#   @app.on_event("startup")  → start_scheduler()
#   @app.on_event("shutdown") → shutdown_scheduler()

import logging
from datetime import datetime, timezone, date
from sqlalchemy import cast, Date
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

from Backend.db.session import SessionLocal
from Backend.models.smart_task import SmartDailyTask
from Backend.models.onboarding import UserOnboarding

# Import your new smart task generator
from Backend.services.smart_task_service import generate_smart_daily_tasks

# ── Build profile from onboarding row (self-contained, no circular imports) ──

logger = logging.getLogger(__name__)


def _build_profile_from_row(ob: UserOnboarding) -> dict:
    """Build the same profile dict as get_user_profile() without importing it."""
    return {
        "user_type"          : ob.user_type or "student",
        "primary_goal"       : ob.primary_goal or "grow career",
        "twelve_month_goal"  : ob.twelve_month_goal or "get a job",
        "interests"          : ob.interests or [],
        "daily_time"         : ob.daily_time or "2-3hours",
        "career_goal"        : ob.career_goal or "",
        "productivity_style" : ob.productivity_style or "deep_focus",
        "country"            : ob.country or "India",
        "exam_type"          : ob.exam_type or "",
        "weak_subjects"      : ob.weak_subjects or [],
        "attempt_year"       : ob.attempt_year or "",
        "field_of_study"     : ob.field_of_study or "",
        "education_level"    : ob.education_level or "",
        "primary_skill"      : ob.primary_skill or "",
        "services_offered"   : ob.services_offered or [],
        "monthly_income_goal": ob.monthly_income_goal or "",
        "business_type"      : ob.business_type or "",
        "revenue_stage"      : ob.revenue_stage or "",
        "business_goal"      : ob.business_goal or "",
        "creator_platform"   : ob.creator_platform or "",
        "content_niche"      : ob.content_niche or "",
        "audience_size"      : ob.audience_size or "",
        "creator_growth_goal": ob.creator_growth_goal or "",
    }


def _generate_for_user(ob: UserOnboarding, db, today: date) -> bool:
    """Generate and save smart tasks for a single user. Returns True on success."""
    # Skip if tasks already exist for today
    existing = db.query(SmartDailyTask).filter(
        SmartDailyTask.user_id == ob.user_id,
        cast(SmartDailyTask.task_date, Date) == today,
    ).first()
    if existing:
        return True   # already done

    profile    = _build_profile_from_row(ob)
    tasks_data = generate_smart_daily_tasks(profile)

    if not tasks_data:
        logger.warning(f"[Scheduler] No tasks generated for user {ob.user_id}")
        return False

    for t in tasks_data:
        task = SmartDailyTask(
            user_id           = ob.user_id,
            title             = t.get("title", "Today's Task"),
            question          = t.get("question", t.get("description", "")),
            description       = t.get("description", ""),
            difficulty        = t.get("difficulty", "hard"),
            category          = t.get("category", "Learning"),
            skill_tag         = t.get("skill_tag", ""),
            resource_url      = t.get("resource_url", ""),
            priority          = t.get("priority", "high"),
            estimated_minutes = t.get("estimated_minutes", 45),
            xp_reward         = t.get("xp_reward", 50),
            task_date         = datetime.now(timezone.utc),
        )
        db.add(task)

    db.commit()
    return True


# ── Main job — runs at 00:05 UTC daily ───────────────────────────────────────

def generate_tasks_for_all_users():
    """
    Iterates all completed-onboarding users and generates their smart tasks.
    Skips users who already have tasks for today.
    """
    db    = SessionLocal()
    today = date.today()
    logger.info(f"[Scheduler] Starting smart task generation for {today}")

    failed_users = []

    try:
        # Only generate for users who completed onboarding
        users = db.query(UserOnboarding).filter(
            UserOnboarding.onboarding_completed == True
        ).all()

        logger.info(f"[Scheduler] Processing {len(users)} users")

        for ob in users:
            try:
                success = _generate_for_user(ob, db, today)
                if not success:
                    failed_users.append(ob.user_id)
            except Exception as e:
                logger.error(f"[Scheduler] Failed for user {ob.user_id}: {e}")
                failed_users.append(ob.user_id)
                db.rollback()

        logger.info(f"[Scheduler] Done. Failed users: {len(failed_users)}")

    except Exception as e:
        logger.error(f"[Scheduler] Fatal error: {e}")
    finally:
        db.close()


# ── Retry job — runs at 00:30 UTC for any failed users ───────────────────────

def retry_failed_users():
    """
    Retry task generation for users who don't yet have today's tasks.
    Covers edge cases: new signups after midnight, Gemini timeouts, etc.
    """
    db    = SessionLocal()
    today = date.today()
    logger.info("[Scheduler] Running retry job for users missing today's tasks")

    try:
        all_users = db.query(UserOnboarding).filter(
            UserOnboarding.onboarding_completed == True
        ).all()

        for ob in all_users:
            try:
                _generate_for_user(ob, db, today)
            except Exception as e:
                logger.error(f"[Scheduler Retry] Failed for {ob.user_id}: {e}")
                db.rollback()

    finally:
        db.close()


# ── Scheduler setup ───────────────────────────────────────────────────────────

_scheduler = BackgroundScheduler(timezone="UTC")

_scheduler.add_job(
    generate_tasks_for_all_users,
    "cron",
    hour=0, minute=5,
    id="daily_smart_tasks",
    replace_existing=True,
    misfire_grace_time=300,   # allow 5 min late start (server cold start)
)

_scheduler.add_job(
    retry_failed_users,
    "cron",
    hour=0, minute=30,
    id="retry_smart_tasks",
    replace_existing=True,
    misfire_grace_time=300,
)


def _job_listener(event):
    if event.exception:
        logger.error(f"[Scheduler] Job {event.job_id} crashed: {event.exception}")
    else:
        logger.info(f"[Scheduler] Job {event.job_id} completed successfully")

_scheduler.add_listener(_job_listener, EVENT_JOB_ERROR | EVENT_JOB_EXECUTED)


def start_scheduler():
    if not _scheduler.running:
        _scheduler.start()
        logger.info("[Scheduler] APScheduler started ✓")


def shutdown_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] APScheduler shut down ✓")