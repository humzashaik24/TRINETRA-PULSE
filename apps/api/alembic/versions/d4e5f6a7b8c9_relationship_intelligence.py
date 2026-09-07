"""add relationship intelligence columns for Phase 21

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-06 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.db.types import JSONB


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Phase 21 relationship intelligence columns."""
    op.add_column(
        'relationships',
        sa.Column(
            'intelligence_status',
            sa.Enum(
                'OBSERVED',
                'CORRELATED',
                'REVIEW_REQUIRED',
                'CONFIRMED',
                'REJECTED',
                name='intelligencestatus',
            ),
            nullable=False,
            server_default='OBSERVED',
        ),
    )
    op.add_column(
        'relationships', sa.Column('linkage_score', sa.Float(), nullable=False, server_default='0')
    )
    op.add_column(
        'relationships',
        sa.Column(
            'correlation_version',
            sa.String(length=100),
            nullable=False,
            server_default='relationship-intelligence-v1',
        ),
    )
    op.add_column(
        'relationships', sa.Column('correlation_key', sa.String(length=300), nullable=True)
    )
    op.add_column(
        'relationships', sa.Column('observation_count', sa.Integer(), nullable=False, server_default='0')
    )
    op.add_column(
        'relationships', sa.Column('source_count', sa.Integer(), nullable=False, server_default='0')
    )
    op.add_column(
        'relationships', sa.Column('first_observed_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'relationships', sa.Column('last_observed_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'relationships', sa.Column('conflict_flags', JSONB(), nullable=False, server_default='[]')
    )
    op.add_column(
        'relationships', sa.Column('verified_by', sa.String(length=200), nullable=True)
    )
    op.add_column(
        'relationships', sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'relationships', sa.Column('rejection_reason', sa.Text(), nullable=True)
    )

    op.create_index(
        'ix_relationships_intelligence_status',
        'relationships',
        ['intelligence_status'],
        unique=False,
    )
    op.create_index(
        'ix_relationships_correlation_key',
        'relationships',
        ['correlation_key'],
        unique=False,
    )


def downgrade() -> None:
    """Drop Phase 21 relationship intelligence columns."""
    op.drop_index('ix_relationships_correlation_key', table_name='relationships')
    op.drop_index('ix_relationships_intelligence_status', table_name='relationships')
    op.drop_column('relationships', 'rejection_reason')
    op.drop_column('relationships', 'verified_at')
    op.drop_column('relationships', 'verified_by')
    op.drop_column('relationships', 'conflict_flags')
    op.drop_column('relationships', 'last_observed_at')
    op.drop_column('relationships', 'first_observed_at')
    op.drop_column('relationships', 'source_count')
    op.drop_column('relationships', 'observation_count')
    op.drop_column('relationships', 'correlation_key')
    op.drop_column('relationships', 'correlation_version')
    op.drop_column('relationships', 'linkage_score')
    op.drop_column('relationships', 'intelligence_status')
    op.execute('DROP TYPE IF EXISTS intelligencestatus')