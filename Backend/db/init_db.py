from sqlalchemy import text
from Backend.db.base import Base
from Backend.db.session import engine

# Import models
from Backend.models.dashboard import GrowthPlan, DailyTask, AIInsight
from Backend.models.user import User
from Backend.models.onboarding import UserOnboarding
import Backend.models.practice
import Backend.models.practice_arena    # ← Practice Arena
import Backend.models.agents_data       # Resume / Interview / Project / Networking agents
import Backend.models.learning_agent    # ← Learning Agent ORM models
import Backend.models.otp               # ← User OTP ORM models
import Backend.models.user_verification # ← Email Verification Token ORM models
import Backend.models.leaderboard       # ← UserXP, LeaderboardEvent
import Backend.models.leaderboard_history  # ← WeeklyLeaderboardSnapshot
import Backend.models.challenges        # ← Challenge, ChallengeParticipant
import Backend.models.community         # ← CommunityPost, CommunityReaction
import Backend.models.social            # ← UserFriendship, UserPresence
import Backend.models.arena             # ← Arena: profiles, battles, ELO, boss, season, matchmaking
import Backend.nova.memory.models       # ← NOVA User Memory ORM models
import Backend.nova.resources.models    # ← NOVA Resource Intelligence ORM models
import Backend.nova.critic.models       # ← NOVA Critic & Verification ORM models
import Backend.nova.planner.models      # ← NOVA Planner ORM models
import Backend.nova.progress.models     # ← NOVA Progress Intelligence ORM models
import Backend.nova.adaptive.models     # ← NOVA Adaptive Engine ORM models
import Backend.nova.rag.models          # ← NOVA RAG ORM models
import Backend.nova.knowledge.models    # ← NOVA Knowledge Base RAG ORM models (alias)


def init_db():
    # create tables
    Base.metadata.create_all(bind=engine, checkfirst=True)

    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_method VARCHAR(20) DEFAULT 'email';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;"))
        except Exception as e:
            print(f"Skipping users column migration add: {e}")


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

        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.execute(text("ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(384);"))
            conn.execute(text("UPDATE document_chunks SET embedding = embedding_json::vector WHERE embedding_json IS NOT NULL AND embedding IS NULL;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);"))
        except Exception as e:
            print(f"Skipping pgvector extension/column setup: {e}")

        # ── Leaderboard v2 scale columns ──────────────────────────────────────
        for col_def in [
            "cached_score BIGINT DEFAULT 0",
            "field_key VARCHAR(100)",
            "batch_key VARCHAR(150)",
            "previous_weekly_rank INTEGER",
        ]:
            try:
                conn.execute(text(f"ALTER TABLE user_xp ADD COLUMN IF NOT EXISTS {col_def};"))
            except Exception as e:
                print(f"Skipping user_xp column add ({col_def}): {e}")

        # Indexes for leaderboard v2 scale queries
        for idx_sql in [
            "CREATE INDEX IF NOT EXISTS idx_uxp_field_score  ON user_xp (field_key, cached_score);",
            "CREATE INDEX IF NOT EXISTS idx_uxp_batch_score  ON user_xp (batch_key, cached_score);",
            "CREATE INDEX IF NOT EXISTS idx_uxp_global_score ON user_xp (cached_score);",
        ]:
            try:
                conn.execute(text(idx_sql))
            except Exception as e:
                print(f"Skipping index create: {e}")

        # ── Onboarding institution fields ─────────────────────────────────────
        for col_def in [
            "institution_name VARCHAR(200)",
            "graduation_year  VARCHAR(10)",
        ]:
            try:
                conn.execute(text(f"ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS {col_def};"))
            except Exception as e:
                print(f"Skipping user_onboarding column add ({col_def}): {e}")

        conn.commit()


    print("[SUCCESS] Database tables created and schema verified.")