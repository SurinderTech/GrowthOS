"""merge_heads_phase1

Revision ID: e1e6927f795c
Revises: 003_add_phone_verified_to_users, 004_add_pgvector, d7f3a8c2e1b9
Create Date: 2026-09-14

Merges all three diverged heads into one.
"""

from alembic import op

revision = "e1e6927f795c"
down_revision = ("003_add_phone_verified_to_users", "004_add_pgvector", "d7f3a8c2e1b9")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
