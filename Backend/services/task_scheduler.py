from scheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from db.session import SessionLocal
from models.dashboard import DailyTask
from models.onboarding import UserOnboarding
from services.gemini_service import generate_daily_tasks
from routers.dashboard import get_user_profile


def generate_tasks_for_all_users():
    db: Session = SessionLocal()

    users = db.query(UserOnboarding).all()

    for user in users:
        profile = get_user_profile(user.user_id, db)

        try:
            tasks_data = generate_daily_tasks(profile)

            for t in tasks_data:
                task = DailyTask(
                    user_id=user.user_id,
                    title=t.get("title", ""),
                    description=t.get("description", ""),
                    priority=t.get("priority", "medium"),
                    estimated_minutes=t.get("estimated_minutes", 30),
                    category=t.get("category", "Learning"),
                    task_date=datetime.now(timezone.utc)
                )

                db.add(task)

            db.commit()

        except Exception as e:
            print("Task generation failed:", e)

    db.close()


scheduler = BackgroundScheduler(timezone="UTC")

scheduler.add_job(
    generate_tasks_for_all_users,
    "cron",
    hour=0,
    minute=5
)