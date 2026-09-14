"""add_battle_task_nullable_user_ai_duel_rating

Revision ID: d7f3a8c2e1b9
Revises: c1a9e2f3b4d5
Create Date: 2026-09-14

Changes:
  - Add battle_tasks table
  - Make battle_players.user_id nullable (for AI rows)
  - Drop unique index on (battle_id, user_id) - replaced with non-unique
  - Add ai_duel_rating, ai_duel_wins, ai_duel_losses to arena_profiles
  - Add task_id FK to battle_submissions
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "d7f3a8c2e1b9"
down_revision = "c1a9e2f3b4d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. arena_profiles: add AI duel columns
    op.add_column("arena_profiles", sa.Column("ai_duel_rating", sa.Integer(), nullable=False, server_default="800"))
    op.add_column("arena_profiles", sa.Column("ai_duel_wins",   sa.Integer(), nullable=False, server_default="0"))
    op.add_column("arena_profiles", sa.Column("ai_duel_losses", sa.Integer(), nullable=False, server_default="0"))

    # 2. battle_players: make user_id nullable
    try:
        op.drop_index("idx_bp_battle_user", table_name="battle_players")
    except Exception:
        pass
    op.alter_column(
        "battle_players", "user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    op.create_index("idx_bp_battle_user", "battle_players", ["battle_id", "user_id"])
    try:
        op.drop_constraint("battle_players_user_id_fkey", "battle_players", type_="foreignkey")
    except Exception:
        pass
    op.create_foreign_key(
        "battle_players_user_id_fkey", "battle_players",
        "users", ["user_id"], ["id"],
        ondelete="SET NULL",
    )

    # 3. battle_tasks table
    op.create_table(
        "battle_tasks",
        sa.Column("id",           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("battle_id",    postgresql.UUID(as_uuid=True), sa.ForeignKey("battles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("round_id",     postgresql.UUID(as_uuid=True), sa.ForeignKey("battle_rounds.id", ondelete="CASCADE"), nullable=True),
        sa.Column("challenge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("challenges.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_type",    sa.String(30),  nullable=False, server_default="mcq"),
        sa.Column("order",        sa.Integer(),   nullable=False, server_default="1"),
        sa.Column("assigned_to",  sa.String(50),  nullable=True,  server_default="all"),
        sa.Column("starts_at",    sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at",      sa.DateTime(timezone=True), nullable=True),
        sa.Column("status",       sa.String(20),  nullable=True,  server_default="pending"),
        sa.Column("max_score",    sa.Integer(),   nullable=True,  server_default="100"),
        sa.Column("config",       postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column("created_at",   sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_bt_battle_order", "battle_tasks", ["battle_id", "order"])
    op.create_index("idx_bt_round",        "battle_tasks", ["round_id"])

    # 4. battle_submissions: add task_id FK
    op.add_column("battle_submissions", sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "battle_submissions_task_id_fkey", "battle_submissions",
        "battle_tasks", ["task_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("battle_submissions_task_id_fkey", "battle_submissions", type_="foreignkey")
    op.drop_column("battle_submissions", "task_id")
    op.drop_index("idx_bt_round",        table_name="battle_tasks")
    op.drop_index("idx_bt_battle_order", table_name="battle_tasks")
    op.drop_table("battle_tasks")
    op.drop_index("idx_bp_battle_user", table_name="battle_players")
    op.drop_constraint("battle_players_user_id_fkey", "battle_players", type_="foreignkey")
    op.alter_column("battle_players", "user_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.create_foreign_key("battle_players_user_id_fkey", "battle_players", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_index("idx_bp_battle_user", "battle_players", ["battle_id", "user_id"], unique=True)
    op.drop_column("arena_profiles", "ai_duel_losses")
    op.drop_column("arena_profiles", "ai_duel_wins")
    op.drop_column("arena_profiles", "ai_duel_rating")
