"""add_settings_columns_to_onboarding

Revision ID: a520815fe1f8
Revises: 37a32a153c47
Create Date: 2025-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a520815fe1f8"
down_revision = "37a32a153c47"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_onboarding",
        sa.Column("notification_settings", postgresql.JSONB, nullable=True))
    op.add_column("user_onboarding",
        sa.Column("appearance_settings", postgresql.JSONB, nullable=True))
    op.add_column("user_onboarding",
        sa.Column("privacy_settings", postgresql.JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("user_onboarding", "privacy_settings")
    op.drop_column("user_onboarding", "appearance_settings")
    op.drop_column("user_onboarding", "notification_settings")