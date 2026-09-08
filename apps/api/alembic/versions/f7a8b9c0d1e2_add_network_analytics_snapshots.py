"""persist investigation-scoped network analytics snapshots

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.db.types import JSONB, Uuid

revision: str = "f7a8b9c0d1e2"
down_revision: str | Sequence[str] | None = "e6f7a8b9c0d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "network_analytics_snapshots",
        sa.Column("id", Uuid, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("investigation_id", Uuid, nullable=False),
        sa.Column("algorithm_version", sa.String(length=32), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("entity_count", sa.Integer(), nullable=False),
        sa.Column("relationship_count", sa.Integer(), nullable=False),
        sa.Column("payload", JSONB, nullable=False),
        sa.ForeignKeyConstraint(
            ["investigation_id"],
            ["investigations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("investigation_id", name="uq_network_analytics_investigation"),
    )
    op.create_index(
        "ix_network_analytics_snapshots_investigation_id",
        "network_analytics_snapshots",
        ["investigation_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_network_analytics_snapshots_investigation_id",
        table_name="network_analytics_snapshots",
    )
    op.drop_table("network_analytics_snapshots")
