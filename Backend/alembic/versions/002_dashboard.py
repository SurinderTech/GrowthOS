"""
Alembic migration: create growth_plans, daily_tasks, ai_insights tables
Run: alembic upgrade head
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002_dashboard'
down_revision = '001_onboarding'
branch_labels = None
depends_on = None


def upgrade():
    # growth_plans
    op.create_table('growth_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('months', postgresql.JSON, nullable=True),
        sa.Column('is_active', sa.Boolean, server_default='true'),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_growth_plans_user_id', 'growth_plans', ['user_id'])

    # daily_tasks
    op.create_table('daily_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('completed', sa.Boolean, server_default='false'),
        sa.Column('priority', sa.String(20), server_default='medium'),
        sa.Column('estimated_minutes', sa.Integer, server_default='30'),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('task_date', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'], ['growth_plans.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_daily_tasks_user_id', 'daily_tasks', ['user_id'])

    # ai_insights
    op.create_table('ai_insights',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('insight', sa.Text, nullable=False),
        sa.Column('insight_type', sa.String(50), server_default='growth'),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_ai_insights_user_id', 'ai_insights', ['user_id'])


def downgrade():
    op.drop_table('ai_insights')
    op.drop_table('daily_tasks')
    op.drop_table('growth_plans')