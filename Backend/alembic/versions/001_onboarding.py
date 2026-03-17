"""
Alembic migration: create user_onboarding table
Run: alembic upgrade head
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_onboarding'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_onboarding',
        sa.Column('id', sa.String(), nullable=False),
sa.Column('user_id', sa.String(), nullable=False),

        # Step 1
        sa.Column('user_type', sa.String(50), nullable=True),

        # Step 2
        sa.Column('full_name', sa.String(200), nullable=True),
        sa.Column('age_group', sa.String(20), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('primary_goal', sa.String(100), nullable=True),

        # Step 3
        sa.Column('daily_time', sa.String(20), nullable=True),

        # Step 4
        sa.Column('interests', postgresql.JSON, nullable=True),

        # Step 5 — Student
        sa.Column('education_level', sa.String(50), nullable=True),
        sa.Column('field_of_study', sa.String(100), nullable=True),
        sa.Column('career_goal', sa.String(100), nullable=True),

        # Step 5 — Freelancer
        sa.Column('primary_skill', sa.String(100), nullable=True),
        sa.Column('experience_level', sa.String(50), nullable=True),
        sa.Column('monthly_income_goal', sa.String(50), nullable=True),
        sa.Column('freelance_platforms', postgresql.JSON, nullable=True),
        sa.Column('services_offered', postgresql.JSON, nullable=True),

        # Step 5 — Business
        sa.Column('business_type', sa.String(100), nullable=True),
        sa.Column('team_size', sa.String(50), nullable=True),
        sa.Column('revenue_stage', sa.String(50), nullable=True),
        sa.Column('business_challenge', sa.String(100), nullable=True),
        sa.Column('business_goal', sa.String(100), nullable=True),

        # Step 5 — Creator
        sa.Column('creator_platform', sa.String(50), nullable=True),
        sa.Column('content_niche', sa.String(100), nullable=True),
        sa.Column('audience_size', sa.String(50), nullable=True),
        sa.Column('creator_growth_goal', sa.String(100), nullable=True),

        # Step 5 — Exam
        sa.Column('exam_type', sa.String(50), nullable=True),
        sa.Column('attempt_year', sa.String(10), nullable=True),
        sa.Column('study_hours_daily', sa.String(20), nullable=True),
        sa.Column('weak_subjects', postgresql.JSON, nullable=True),

        # Step 6
        sa.Column('productivity_style', sa.String(50), nullable=True),

        # Step 7
        sa.Column('twelve_month_goal', sa.String(100), nullable=True),

        # Meta
        sa.Column('onboarding_completed', sa.Boolean, server_default='false'),
        sa.Column('current_step', sa.Integer, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index('ix_user_onboarding_user_id', 'user_onboarding', ['user_id'])


def downgrade():
    op.drop_index('ix_user_onboarding_user_id', table_name='user_onboarding')
    op.drop_table('user_onboarding')