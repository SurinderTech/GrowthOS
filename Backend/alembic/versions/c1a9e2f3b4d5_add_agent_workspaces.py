"""add resume/interview/project/networking agent tables

Revision ID: c1a9e2f3b4d5
Down_revision: a520815fe1f8

NOTE: this repo's migration history has more than one head (run
`alembic heads` to check). If `a520815fe1f8` isn't your current head,
change down_revision below to whatever `alembic heads` reports, or just
merge heads first with `alembic merge heads`.

In practice this repo also calls Base.metadata.create_all() on startup
(Backend/db/init_db.py), so these tables get created automatically the
first time the app boots even without running this migration. Run the
migration anyway if you manage schema strictly via Alembic in production.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c1a9e2f3b4d5"
down_revision = "a520815fe1f8"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "resume_analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("resume_text", sa.Text, nullable=False),
        sa.Column("ats_score", sa.Integer, default=0),
        sa.Column("strengths", sa.JSON, default=list),
        sa.Column("improvements", sa.JSON, default=list),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "interview_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", sa.String(200), nullable=False),
        sa.Column("questions", sa.JSON, default=list),
        sa.Column("answers", sa.JSON, default=dict),
        sa.Column("status", sa.String(20), default="in_progress"),
        sa.Column("overall_score", sa.Integer, nullable=True),
        sa.Column("overall_feedback", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), default="idea"),
        sa.Column("github_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "contacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("role", sa.String(200), nullable=True),
        sa.Column("company", sa.String(200), nullable=True),
        sa.Column("platform", sa.String(50), default="LinkedIn"),
        sa.Column("status", sa.String(20), default="to_reach"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("last_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_table("contacts")
    op.drop_table("projects")
    op.drop_table("interview_sessions")
    op.drop_table("resume_analyses")
