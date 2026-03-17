"""merge dashboard and career_graph heads

Revision ID: 08dae697df16
Revises: 002_dashboard, 9f173cfaa957
Create Date: 2026-03-14
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "08dae697df16"
down_revision = ("002_dashboard", "9f173cfaa957")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass