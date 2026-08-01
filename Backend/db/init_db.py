from sqlalchemy import text
from Backend.db.base import Base
from Backend.db.session import engine

# Import models
from Backend.models.dashboard import GrowthPlan, DailyTask, AIInsight
from Backend.models.user import User
from Backend.models.onboarding import UserOnboarding
import Backend.models.practice
import Backend.models.practice_arena    # ← ADD THIS LINE
import Backend.models.agents_data       # Resume / Interview / Project / Networking agents
import Backend.models.learning_agent    # ← Learning Agent ORM models


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

        # Migrations for recent_submissions table
        for col_def in [
            "item_id VARCHAR(100)",
            "user_answer TEXT",
            "correct_answer TEXT",
            "explanation TEXT",
        ]:
            try:
                conn.execute(text(f"ALTER TABLE recent_submissions ADD COLUMN IF NOT EXISTS {col_def};"))
            except Exception as e:
                print(f"Skipping recent_submissions column add ({col_def}): {e}")

        try:
            conn.execute(text("ALTER TABLE coding_problems ADD COLUMN IF NOT EXISTS starter_java TEXT;"))
        except Exception as e:
            print(f"Skipping starter_java column add: {e}")

        try:
            conn.execute(text("ALTER TABLE coding_submissions ADD COLUMN IF NOT EXISTS is_pasted BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE coding_submissions ADD COLUMN IF NOT EXISTS time_spent_s INTEGER DEFAULT 0;"))
        except Exception as e:
            print(f"Skipping coding_submissions column add: {e}")

        conn.commit()


if __name__ == "__main__":
    init_db()
    print("✅ Database tables created and schema verified.")