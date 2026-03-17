"""add ai fields to onboarding"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "b6e0110138be"
down_revision = "08dae697df16"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_onboarding",
        sa.Column("generated_skills", sa.JSON(), nullable=True)
    )
    op.add_column(
        "user_onboarding",
        sa.Column("generated_opportunities", sa.JSON(), nullable=True)
    )
    op.add_column(
        "user_onboarding",
        sa.Column("career_graph", sa.JSON(), nullable=True)
    )


def downgrade():
    op.drop_column("user_onboarding", "generated_skills")
    op.drop_column("user_onboarding", "generated_opportunities")
    op.drop_column("user_onboarding", "career_graph")