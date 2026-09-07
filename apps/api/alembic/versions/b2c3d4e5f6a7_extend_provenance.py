"""extend data_provenance with dataset/investigation/job FKs and checksum

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-04 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add investigation_id, dataset_id, ingestion_job_id, checksum to data_provenance."""
    op.add_column(
        'data_provenance',
        sa.Column('investigation_id', sa.Uuid(), nullable=True),
    )
    op.add_column(
        'data_provenance',
        sa.Column('dataset_id', sa.Uuid(), nullable=True),
    )
    op.add_column(
        'data_provenance',
        sa.Column('ingestion_job_id', sa.Uuid(), nullable=True),
    )
    op.add_column(
        'data_provenance',
        sa.Column('checksum', sa.String(length=128), nullable=True),
    )

    op.create_index(
        'ix_data_provenance_investigation_id',
        'data_provenance',
        ['investigation_id'],
        unique=False,
    )
    op.create_index(
        'ix_data_provenance_dataset_id',
        'data_provenance',
        ['dataset_id'],
        unique=False,
    )

    op.create_foreign_key(
        'fk_data_provenance_investigation_id',
        'data_provenance',
        'investigations',
        ['investigation_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        'fk_data_provenance_dataset_id',
        'data_provenance',
        'datasets',
        ['dataset_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_data_provenance_ingestion_job_id',
        'data_provenance',
        'ingestion_jobs',
        ['ingestion_job_id'],
        ['id'],
        ondelete='SET NULL',
    )

    # Add ON DELETE SET NULL to existing FKs that currently lack it
    op.alter_column(
        'data_provenance', 'entity_id',
        existing_foreign_key=sa.ForeignKey('entities.id'),
        new_foreign_key=sa.ForeignKey('entities.id', ondelete='SET NULL'),
    )
    op.alter_column(
        'data_provenance', 'relationship_id',
        existing_foreign_key=sa.ForeignKey('relationships.id'),
        new_foreign_key=sa.ForeignKey('relationships.id', ondelete='SET NULL'),
    )
    op.alter_column(
        'data_provenance', 'source_document_id',
        existing_foreign_key=sa.ForeignKey('case_evidence.id'),
        new_foreign_key=sa.ForeignKey('case_evidence.id', ondelete='SET NULL'),
    )


def downgrade() -> None:
    """Remove extended columns from data_provenance."""
    op.drop_constraint('fk_data_provenance_ingestion_job_id', 'data_provenance', type_='foreignkey')
    op.drop_constraint('fk_data_provenance_dataset_id', 'data_provenance', type_='foreignkey')
    op.drop_constraint('fk_data_provenance_investigation_id', 'data_provenance', type_='foreignkey')
    op.drop_index('ix_data_provenance_dataset_id', table_name='data_provenance')
    op.drop_index('ix_data_provenance_investigation_id', table_name='data_provenance')
    op.drop_column('data_provenance', 'checksum')
    op.drop_column('data_provenance', 'ingestion_job_id')
    op.drop_column('data_provenance', 'dataset_id')
    op.drop_column('data_provenance', 'investigation_id')
