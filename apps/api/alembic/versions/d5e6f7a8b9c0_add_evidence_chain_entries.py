"""create evidence_chain_entries table (Phase 18.2 chain-of-custody)

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-09-05 11:00:00.000000

Adds the ``evidence_chain_entries`` table: a tamper-evident, append-only hash
chain persisted per evidence item. Each entry stores the SHA-256 ``payload_``
/ ``metadata_hash`` / ``previous_entry_hash`` / ``entry_hash`` digests plus the
actor snapshot (``actor_id`` + ``actor_email``) and sequence number. The
``entry_hash`` links each entry to its predecessor so any mutation breaks the
chain.

This is a PostgreSQL held ledger for evidence custody — explicitly NOT a public
blockchain (no distributed ledger / external network). The enum action
vocabulary fits the existing native_enum=False, length=32 convention.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the evidence chain-of-custody ledger table."""
    op.create_table(
        'evidence_chain_entries',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('evidence_id', sa.Uuid(), nullable=False),
        sa.Column('investigation_id', sa.Uuid(), nullable=False),
        sa.Column('sequence_number', sa.Integer(), nullable=False),
        sa.Column(
            'action',
            sa.Enum(
                'evidence_created',
                'evidence_uploaded',
                'evidence_accessed',
                'evidence_verified',
                'evidence_metadata_updated',
                'evidence_exported',
                name='evidence_chain_action',
                native_enum=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column('payload_hash', sa.String(length=64), nullable=False),
        sa.Column('metadata_hash', sa.String(length=64), nullable=False),
        sa.Column('previous_entry_hash', sa.String(length=64), nullable=True),
        sa.Column('entry_hash', sa.String(length=64), nullable=False),
        sa.Column('actor_id', sa.Uuid(), nullable=True),
        sa.Column('actor_email', sa.String(length=320), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['evidence_id'], ['evidence.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['investigation_id'], ['investigations.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'evidence_id',
            'sequence_number',
            name='uq_evidence_chain_evidence_sequence',
        ),
    )
    op.create_index(
        op.f('ix_evidence_chain_entries_evidence_id'),
        'evidence_chain_entries',
        ['evidence_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_evidence_chain_entries_investigation_id'),
        'evidence_chain_entries',
        ['investigation_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_evidence_chain_entries_entry_hash'),
        'evidence_chain_entries',
        ['entry_hash'],
        unique=True,
    )


def downgrade() -> None:
    """Drop the evidence chain-of-custody table."""
    op.drop_index(
        op.f('ix_evidence_chain_entries_investigation_id'),
        table_name='evidence_chain_entries',
    )
    op.drop_index(
        op.f('ix_evidence_chain_entries_entry_hash'),
        table_name='evidence_chain_entries',
    )
    op.drop_index(
        op.f('ix_evidence_chain_entries_evidence_id'),
        table_name='evidence_chain_entries',
    )
    op.drop_table('evidence_chain_entries')
