"""add blockchain evidence integrity anchoring for Phase 21

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-06 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.db.types import JSONB


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Phase 21 blockchain evidence integrity persistence.

    Only the anchor is a persisted ledger of record; the custody chain is
    derived deterministically at read time (see evidence_integrity.ledger).
    """
    op.create_table(
        'evidence_blockchain_anchors',
        sa.Column('id', sa.CHAR(length=32), nullable=False),
        sa.Column(
            'investigation_id',
            sa.CHAR(length=32),
            sa.ForeignKey('investigations.id', name='fk_anchor_investigation', ondelete='CASCADE'),
            nullable=False,
            index=True,
        ),
        sa.Column(
            'evidence_id',
            sa.CHAR(length=32),
            sa.ForeignKey('evidence.id', name='fk_anchor_evidence', ondelete='CASCADE'),
            nullable=False,
            index=True,
        ),
        sa.Column('custody_chain_hash', sa.String(length=64), nullable=False),
        sa.Column('anchor_digest', sa.String(length=64), nullable=False),
        sa.Column('network', sa.String(length=200), nullable=False),
        sa.Column('transaction_id', sa.String(length=100), nullable=True),
        sa.Column('block_number', sa.BigInteger(), nullable=True),
        sa.Column('contract_address', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('is_mock', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('reason', sa.String(length=500), nullable=True),
        sa.Column('anchored_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name='pk_evidence_blockchain_anchors'),
        sa.UniqueConstraint(
            'evidence_id', 'anchor_digest', name='uq_anchor_evidence_digest'
        ),
        sa.UniqueConstraint('anchor_digest', name='uq_anchor_digest'),
    )

    op.add_column(
        'evidence',
        sa.Column('checksum', sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    """Drop Phase 21 blockchain evidence integrity persistence."""
    op.drop_column('evidence', 'checksum')
    op.drop_table('evidence_blockchain_anchors')