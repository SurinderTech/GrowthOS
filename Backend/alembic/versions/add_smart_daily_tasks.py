"""add_smart_daily_tasks_table

Revision ID: b2c3d4e5f6a7
Revises: <your_last_revision_id>   ← set this to your actual last migration revision
Create Date: 2025-01-01 00:00:00

Run: alembic upgrade head
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision      = "b2c3d4e5f6a7"
down_revision = "b6e0110138be"   # ← SET THIS to your last migration e.g. "a1b2c3d4e5f6"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "smart_daily_tasks",
        sa.Column("id",                postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id",           postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title",             sa.String(200),  nullable=False),
        sa.Column("question",          sa.Text,         nullable=False),
        sa.Column("description",       sa.String(500),  nullable=True),
        sa.Column("difficulty",        sa.String(10),   nullable=False, server_default="hard"),
        sa.Column("category",          sa.String(80),   nullable=False, server_default="Learning"),
        sa.Column("skill_tag",         sa.String(80),   nullable=True),
        sa.Column("resource_url",      sa.String(500),  nullable=True),
        sa.Column("priority",          sa.String(10),   nullable=False, server_default="high"),
        sa.Column("estimated_minutes", sa.Integer,      nullable=False, server_default="45"),
        sa.Column("xp_reward",         sa.Integer,      nullable=False, server_default="50"),
        sa.Column("task_date",         sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed",         sa.Boolean,      nullable=False, server_default="false"),
        sa.Column("completed_at",      sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_answer",       sa.Text,         nullable=True),
        sa.Column("ai_feedback",       sa.Text,         nullable=True),
        sa.Column("created_at",        sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_sdt_user_id",   "smart_daily_tasks", ["user_id"])
    op.create_index("ix_sdt_task_date", "smart_daily_tasks", ["task_date"])
    # Composite index for "today's tasks for user X" query
    op.create_index("ix_sdt_user_date", "smart_daily_tasks", ["user_id", "task_date"])


def downgrade() -> None:
    op.drop_index("ix_sdt_user_date", table_name="smart_daily_tasks")
    op.drop_index("ix_sdt_task_date",  table_name="smart_daily_tasks")
    op.drop_index("ix_sdt_user_id",    table_name="smart_daily_tasks")
    op.drop_table("smart_daily_tasks")