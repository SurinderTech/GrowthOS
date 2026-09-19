"""
Alembic migration: Add social layer, scale leaderboard columns, institution fields.

Revision: f9a3c1d2e8b4
Creates:
  - user_friendships table
  - user_presence table
  - weekly_leaderboard_snapshots table
  - Adds to user_xp: cached_score, field_key, batch_key, previous_weekly_rank
  - Adds to user_onboarding: institution_name, graduation_year
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

revision = 'f9a3c1d2e8b4'
down_revision = 'e1e6927f795c'   # most recent existing migration head
branch_labels = None
depends_on = None


def upgrade():
    # ── 1. user_friendships ───────────────────────────────────────────────────
    op.create_table(
        'user_friendships',
        sa.Column('id',           UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('requester_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('addressee_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status',       sa.String(20),       nullable=False, server_default='pending'),
        sa.Column('created_at',   sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at',   sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint('uq_friendship_pair', 'user_friendships', ['requester_id', 'addressee_id'])
    op.create_index('idx_friendship_requester_status', 'user_friendships', ['requester_id', 'status'])
    op.create_index('idx_friendship_addressee_status', 'user_friendships', ['addressee_id', 'status'])
    op.create_check_constraint(
        'ck_friendship_status', 'user_friendships',
        "status IN ('pending','accepted','rejected','blocked')"
    )

    # ── 2. user_presence ──────────────────────────────────────────────────────
    op.create_table(
        'user_presence',
        sa.Column('user_id',           UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('status',            sa.String(20),       nullable=False, server_default='offline'),
        sa.Column('last_seen_at',      sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('current_battle_id', UUID(as_uuid=True), nullable=True),
    )
    op.create_index('idx_presence_last_seen', 'user_presence', ['last_seen_at'])

    # ── 3. weekly_leaderboard_snapshots ───────────────────────────────────────
    op.create_table(
        'weekly_leaderboard_snapshots',
        sa.Column('id',         UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('scope',      sa.String(200), nullable=False),
        sa.Column('week_start', sa.String(20),  nullable=False),
        sa.Column('week_end',   sa.String(20),  nullable=False),
        sa.Column('rank',       sa.Integer(),   nullable=False),
        sa.Column('user_id',    UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('user_name',  sa.String(200), nullable=True),
        sa.Column('user_image', sa.String(500), nullable=True),
        sa.Column('score',      sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint(
        'uq_weekly_snap_scope_week_rank', 'weekly_leaderboard_snapshots',
        ['scope', 'week_start', 'rank']
    )
    op.create_index('idx_wls_scope_week', 'weekly_leaderboard_snapshots', ['scope', 'week_start'])
    op.create_index('idx_wls_user',       'weekly_leaderboard_snapshots', ['user_id'])

    # ── 4. user_xp new scale columns ─────────────────────────────────────────
    op.add_column('user_xp', sa.Column('cached_score',        sa.BigInteger(), nullable=False, server_default='0'))
    op.add_column('user_xp', sa.Column('field_key',           sa.String(100),  nullable=True))
    op.add_column('user_xp', sa.Column('batch_key',           sa.String(150),  nullable=True))
    op.add_column('user_xp', sa.Column('previous_weekly_rank', sa.Integer(),   nullable=True))

    op.create_index('idx_uxp_field_score',  'user_xp', ['field_key',  'cached_score'])
    op.create_index('idx_uxp_batch_score',  'user_xp', ['batch_key',  'cached_score'])
    op.create_index('idx_uxp_global_score', 'user_xp', ['cached_score'])

    # ── 5. user_onboarding new fields ────────────────────────────────────────
    op.add_column('user_onboarding', sa.Column('institution_name', sa.String(200), nullable=True))
    op.add_column('user_onboarding', sa.Column('graduation_year',  sa.String(10),  nullable=True))


def downgrade():
    # Reverse order
    op.drop_column('user_onboarding', 'graduation_year')
    op.drop_column('user_onboarding', 'institution_name')

    op.drop_index('idx_uxp_global_score', table_name='user_xp')
    op.drop_index('idx_uxp_batch_score',  table_name='user_xp')
    op.drop_index('idx_uxp_field_score',  table_name='user_xp')
    op.drop_column('user_xp', 'previous_weekly_rank')
    op.drop_column('user_xp', 'batch_key')
    op.drop_column('user_xp', 'field_key')
    op.drop_column('user_xp', 'cached_score')

    op.drop_table('weekly_leaderboard_snapshots')
    op.drop_table('user_presence')
    op.drop_table('user_friendships')
