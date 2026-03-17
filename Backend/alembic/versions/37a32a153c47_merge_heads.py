"""merge_heads

Revision ID: 37a32a153c47
Revises: add_practice_tables, b2c3d4e5f6a7
Create Date: 2025-03-17

"""
from alembic import op
import sqlalchemy as sa

revision = "37a32a153c47"
down_revision = ("add_practice_tables", "b2c3d4e5f6a7")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass