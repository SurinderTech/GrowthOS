"""add career_graph

Revision ID: 9f173cfaa957
Revises: 
Create Date: 2026-03-14
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "9f173cfaa957"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_onboarding",
        sa.Column("career_graph", sa.JSON(), nullable=True)
    )


def downgrade():
    op.drop_column("user_onboarding", "career_graph")