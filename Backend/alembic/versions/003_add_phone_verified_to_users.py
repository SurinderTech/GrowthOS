"""
Alembic migration: add phone_verified and phone_verified_at to users table
"""

from alembic import op
import sqlalchemy as sa

revision = '003_add_phone_verified_to_users'
down_revision = '002_dashboard'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('phone_verified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('phone_verified_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'phone_verified_at')
    op.drop_column('users', 'phone_verified')
