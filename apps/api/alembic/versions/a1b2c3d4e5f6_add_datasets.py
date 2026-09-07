"""add datasets data_sources ingestion_jobs

Revision ID: a1b2c3d4e5f6
Revises: 029f568507fd
Create Date: 2026-09-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.db.types import JSONB


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '029f568507fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add data_sources, datasets, and ingestion_jobs tables."""
    op.create_table(
        'data_sources',
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('format', sa.String(length=50), nullable=False),
        sa.Column('icon', sa.String(length=100), nullable=True),
        sa.Column('accepted_extensions', JSONB(), nullable=False),
        sa.Column('max_file_size', sa.Integer(), nullable=False),
        sa.Column('metadata', JSONB(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_data_sources_category'), 'data_sources', ['category'], unique=False)

    op.create_table(
        'datasets',
        sa.Column('investigation_id', sa.Uuid(), nullable=False),
        sa.Column('data_source_id', sa.Uuid(), nullable=True),
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('source_name', sa.String(length=500), nullable=True),
        sa.Column('format', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('status', sa.Enum('uploading', 'validating', 'processing', 'ready', 'failed', 'archived', name='datasetstatus'), nullable=False),
        sa.Column('record_count', sa.Integer(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('file_name', sa.String(length=1000), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=False),
        sa.Column('warnings', sa.Integer(), nullable=False),
        sa.Column('errors', sa.Integer(), nullable=False),
        sa.Column('duplicates', sa.Integer(), nullable=False),
        sa.Column('last_ingestion_id', sa.Uuid(), nullable=True),
        sa.Column('metadata', JSONB(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['data_source_id'], ['data_sources.id'], ),
        sa.ForeignKeyConstraint(['investigation_id'], ['investigations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_datasets_data_source_id'), 'datasets', ['data_source_id'], unique=False)
    op.create_index(op.f('ix_datasets_investigation_id'), 'datasets', ['investigation_id'], unique=False)

    op.create_table(
        'ingestion_jobs',
        sa.Column('investigation_id', sa.Uuid(), nullable=False),
        sa.Column('dataset_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.Enum('queued', 'running', 'completed', 'failed', 'cancelled', name='ingestionjobstatus'), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=False),
        sa.Column('records_processed', sa.Integer(), nullable=False),
        sa.Column('entities_extracted', sa.Integer(), nullable=False),
        sa.Column('candidates_created', sa.Integer(), nullable=False),
        sa.Column('matches_found', sa.Integer(), nullable=False),
        sa.Column('errors', JSONB(), nullable=False),
        sa.Column('warnings', JSONB(), nullable=False),
        sa.Column('created_by', sa.String(length=500), nullable=True),
        sa.Column('started_at', sa.String(length=100), nullable=True),
        sa.Column('completed_at', sa.String(length=100), nullable=True),
        sa.Column('metadata', JSONB(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['investigation_id'], ['investigations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_ingestion_jobs_dataset_id'), 'ingestion_jobs', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_ingestion_jobs_investigation_id'), 'ingestion_jobs', ['investigation_id'], unique=False)


def downgrade() -> None:
    """Remove data_sources, datasets, and ingestion_jobs tables."""
    op.drop_table('ingestion_jobs')
    op.drop_table('datasets')
    op.drop_table('data_sources')
