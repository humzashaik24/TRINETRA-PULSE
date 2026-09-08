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
    with op.batch_alter_table('data_provenance') as batch_op:
        batch_op.add_column(sa.Column('investigation_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('dataset_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('ingestion_job_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('checksum', sa.String(length=128), nullable=True))

        batch_op.create_index('ix_data_provenance_investigation_id', ['investigation_id'], unique=False)
        batch_op.create_index('ix_data_provenance_dataset_id', ['dataset_id'], unique=False)

        batch_op.create_foreign_key(
            'fk_data_provenance_investigation_id',
            'investigations',
            ['investigation_id'],
            ['id'],
            ondelete='CASCADE',
        )
        batch_op.create_foreign_key(
            'fk_data_provenance_dataset_id',
            'datasets',
            ['dataset_id'],
            ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_foreign_key(
            'fk_data_provenance_ingestion_job_id',
            'ingestion_jobs',
            ['ingestion_job_id'],
            ['id'],
            ondelete='SET NULL',
        )


def downgrade() -> None:
    """Remove extended columns from data_provenance."""
    with op.batch_alter_table('data_provenance') as batch_op:
        batch_op.drop_constraint('fk_data_provenance_ingestion_job_id', type_='foreignkey')
        batch_op.drop_constraint('fk_data_provenance_dataset_id', type_='foreignkey')
        batch_op.drop_constraint('fk_data_provenance_investigation_id', type_='foreignkey')
        batch_op.drop_index('ix_data_provenance_dataset_id', table_name='data_provenance')
        batch_op.drop_index('ix_data_provenance_investigation_id', table_name='data_provenance')
        batch_op.drop_column('checksum')
        batch_op.drop_column('ingestion_job_id')
        batch_op.drop_column('dataset_id')
        batch_op.drop_column('investigation_id')