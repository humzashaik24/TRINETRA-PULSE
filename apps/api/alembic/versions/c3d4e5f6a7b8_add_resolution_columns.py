"""add entity resolution columns for Phase 20

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.db.types import JSONB


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Phase 20 entity resolution columns."""
    op.add_column('entity_resolutions', sa.Column('investigation_id', sa.Uuid(), nullable=True))
    op.add_column('entity_resolutions', sa.Column('linkage_score', sa.Float(), nullable=False, server_default='0'))
    op.add_column('entity_resolutions', sa.Column('resolution_version', sa.String(length=100), nullable=False, server_default='entity-resolution-v1'))
    op.add_column('entity_resolutions', sa.Column('resolution_method', sa.Enum('AUTO', 'MANUAL', 'IMPORTED', name='resolutionmethod'), nullable=False, server_default='AUTO'))
    op.add_column('entity_resolutions', sa.Column('matched_features', JSONB(), nullable=False, server_default='[]'))
    op.add_column('entity_resolutions', sa.Column('contradictions', JSONB(), nullable=False, server_default='[]'))
    op.add_column('entity_resolutions', sa.Column('source_refs', JSONB(), nullable=False, server_default='[]'))
    op.add_column('entity_resolutions', sa.Column('last_evaluated_at', sa.DateTime(timezone=True), nullable=True))

    op.create_index('ix_entity_resolutions_investigation_id', 'entity_resolutions', ['investigation_id'], unique=False)

    op.create_foreign_key(
        'fk_entity_resolutions_investigation_id',
        'entity_resolutions', 'investigations',
        ['investigation_id'],
        ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    """Drop Phase 20 entity resolution columns."""
    op.drop_constraint('fk_entity_resolutions_investigation_id', 'entity_resolutions', type_='foreignkey')
    op.drop_index('ix_entity_resolutions_investigation_id', table_name='entity_resolutions')
    op.drop_column('entity_resolutions', 'last_evaluated_at')
    op.drop_column('entity_resolutions', 'source_refs')
    op.drop_column('entity_resolutions', 'contradictions')
    op.drop_column('entity_resolutions', 'matched_features')
    op.drop_column('entity_resolutions', 'resolution_method')
    op.drop_column('entity_resolutions', 'resolution_version')
    op.drop_column('entity_resolutions', 'linkage_score')
    op.drop_column('entity_resolutions', 'investigation_id')