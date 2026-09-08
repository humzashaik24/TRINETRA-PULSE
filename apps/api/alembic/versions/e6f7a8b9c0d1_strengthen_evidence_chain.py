"""strengthen evidence custody event timestamps and action vocabulary

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, Sequence[str], None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "evidence_chain_entries",
        sa.Column("event_timestamp", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE evidence_chain_entries SET event_timestamp = created_at "
        "WHERE event_timestamp IS NULL"
    )
    with op.batch_alter_table("evidence_chain_entries") as batch_op:
        batch_op.alter_column("event_timestamp", nullable=False)


def downgrade() -> None:
    op.drop_column("evidence_chain_entries", "event_timestamp")
