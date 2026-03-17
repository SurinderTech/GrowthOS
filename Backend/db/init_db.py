from sqlalchemy import text
from db.base import Base
from db.session import engine

# Import models
from models.dashboard import GrowthPlan, DailyTask, AIInsight
from models.user import User
from models.onboarding import UserOnboarding
import models.practice
import models.practice_arena    # ← ADD THIS LINE


def init_db():
    # create tables
    Base.metadata.create_all(bind=engine, checkfirst=True)

    with engine.connect() as conn:
        # Some SQL dialects (like SQLite) don't support ADD COLUMN IF NOT EXISTS.
        # We wrap these in try-except to prevent the server from hanging or crashing.
        try:
            conn.execute(text("""
            ALTER TABLE user_onboarding
            ADD COLUMN IF NOT EXISTS generated_skills JSON;
            """))
        except Exception as e:
            print(f"Skipping generated_skills column add: {e}")

        try:
            conn.execute(text("""
            ALTER TABLE user_onboarding
            ADD COLUMN IF NOT EXISTS generated_opportunities JSON;
            """))
        except Exception as e:
            print(f"Skipping generated_opportunities column add: {e}")

        try:
            conn.execute(text("""
            ALTER TABLE user_onboarding
            ADD COLUMN IF NOT EXISTS career_graph JSON;
            """))
        except Exception as e:
            print(f"Skipping career_graph column add: {e}")

        conn.commit()


if __name__ == "__main__":
    init_db()
    print("✅ Database tables created and schema verified.")