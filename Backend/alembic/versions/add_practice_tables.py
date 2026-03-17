"""
alembic/versions/add_practice_tables.py

Alembic migration — adds 4 new tables for Practice Arena.
Run with: alembic upgrade head

If you don't use Alembic, use the raw SQL at the bottom of this file instead.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_practice_tables'
down_revision = None   # set this to your latest existing migration revision
branch_labels = None
depends_on = None


def upgrade():

    # ── practice_questions ─────────────────────────────────────────────────
    op.create_table(
        "practice_questions",
        sa.Column("id",             postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_type",      sa.String(50),  nullable=False),
        sa.Column("topic",          sa.String(200), nullable=False),
        sa.Column("subtopic",       sa.String(200), nullable=True),
        sa.Column("difficulty",     sa.String(20),  nullable=False),
        sa.Column("q_type",         sa.String(20),  nullable=False),
        sa.Column("question_text",  sa.Text,        nullable=False),
        sa.Column("options",        postgresql.JSON, nullable=True),
        sa.Column("correct_answer", sa.String(500), nullable=True),
        sa.Column("explanation",    sa.Text,        nullable=False),
        sa.Column("created_by",     sa.String(20),  server_default="ai"),
        sa.Column("created_at",     sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index(
        "idx_pq_user_type_topic",
        "practice_questions",
        ["user_type", "topic"]
    )

    # ── user_practice_sessions ─────────────────────────────────────────────
    op.create_table(
        "user_practice_sessions",
        sa.Column("id",            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id",       postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic",         sa.String(200), nullable=True),
        sa.Column("correct_count", sa.Integer,     default=0),
        sa.Column("total_count",   sa.Integer,     default=0),
        sa.Column("accuracy_pct",  sa.Integer,     default=0),
        sa.Column("session_date",  sa.Date,        nullable=False),
        sa.Column("completed_at",  sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ── user_practice_answers ──────────────────────────────────────────────
    op.create_table(
        "user_practice_answers",
        sa.Column("id",          postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id",  postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("user_practice_sessions.id", ondelete="CASCADE")),
        sa.Column("user_id",     postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("practice_questions.id"), nullable=False),
        sa.Column("user_answer", sa.Text,    nullable=True),
        sa.Column("is_correct",  sa.Boolean, default=False),
        sa.Column("time_taken_s",sa.Integer, default=0),
        sa.Column("answered_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ── user_streaks ───────────────────────────────────────────────────────
    op.create_table(
        "user_streaks",
        sa.Column("user_id",             postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("current_streak",      sa.Integer, default=0),
        sa.Column("longest_streak",      sa.Integer, default=0),
        sa.Column("last_practice_date",  sa.Date,    nullable=True),
        sa.Column("practiced_today",     sa.Boolean, default=False),
        sa.Column("updated_at",          sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ── user_skill_progress ────────────────────────────────────────────────
    op.create_table(
        "user_skill_progress",
        sa.Column("id",           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id",      postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic",        sa.String(200), nullable=False),
        sa.Column("progress_pct", sa.Integer,     default=0),
        sa.Column("updated_at",   sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "topic", name="uq_user_topic"),
    )


def downgrade():
    op.drop_table("user_skill_progress")
    op.drop_table("user_streaks")
    op.drop_table("user_practice_answers")
    op.drop_table("user_practice_sessions")
    op.drop_table("practice_questions")


# ══════════════════════════════════════════════════════════════════════════════
# RAW SQL (if you don't use Alembic — paste in your PostgreSQL console)
# ══════════════════════════════════════════════════════════════════════════════
"""
CREATE TABLE practice_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type       VARCHAR(50)  NOT NULL,
    topic           VARCHAR(200) NOT NULL,
    subtopic        VARCHAR(200),
    difficulty      VARCHAR(20)  NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
    q_type          VARCHAR(20)  NOT NULL CHECK (q_type IN ('mcq','short','numeric','coding','statement')),
    question_text   TEXT         NOT NULL,
    options         JSONB,
    correct_answer  VARCHAR(500),
    explanation     TEXT         NOT NULL,
    created_by      VARCHAR(20)  DEFAULT 'ai',
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_pq_user_type_topic ON practice_questions(user_type, topic);

CREATE TABLE user_practice_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic         VARCHAR(200),
    correct_count INT  DEFAULT 0,
    total_count   INT  DEFAULT 0,
    accuracy_pct  INT  DEFAULT 0,
    session_date  DATE NOT NULL,
    completed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_practice_answers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID REFERENCES user_practice_sessions(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id  UUID NOT NULL REFERENCES practice_questions(id),
    user_answer  TEXT,
    is_correct   BOOLEAN DEFAULT FALSE,
    time_taken_s INT     DEFAULT 0,
    answered_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_streaks (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak      INT  DEFAULT 0,
    longest_streak      INT  DEFAULT 0,
    last_practice_date  DATE,
    practiced_today     BOOLEAN DEFAULT FALSE,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_skill_progress (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic        VARCHAR(200) NOT NULL,
    progress_pct INT DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic)
);
"""