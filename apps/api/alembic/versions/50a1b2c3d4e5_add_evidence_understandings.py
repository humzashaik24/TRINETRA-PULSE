"""add multimedia evidence understanding table (Phase 24)

Revision ID: 50a1b2c3d4e5
Revises: 40a1b2c3d4e5

Persists one row per server-side AI analysis of an IMAGE / VIDEO / AUDIO
evidence item. Rows are immutable snapshots: provider binding + the SHA-256 of
the analyzed payload + a validated canonical ``result_json``. Enum-shaped
columns are stored as VARCHAR (native_enum=False) so the table stays portable
across PostgreSQL and SQLite, consistent with the ai_config_providers table.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.db.types import JSONB, Uuid

revision: str = "50a1b2c3d4e5"
down_revision: str | Sequence[str] | None = "40a1b2c3d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "evidence_understandings",
        sa.Column("id", Uuid, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("evidence_id", Uuid, nullable=False),
        sa.Column("investigation_id", Uuid, nullable=False),
        sa.Column("media_type", sa.String(length=32), nullable=False),
        sa.Column("capability", sa.String(length=32), nullable=False),
        sa.Column("provider_type", sa.String(length=32), nullable=False),
        sa.Column("provider_name", sa.String(length=120), nullable=False),
        sa.Column("model", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("result_json", JSONB, nullable=False),
        sa.Column("checksum_at_analysis", sa.String(length=64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(length=100), nullable=True),
        sa.Column("created_by", Uuid, nullable=True),
        sa.ForeignKeyConstraint(["evidence_id"], ["evidence.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["investigation_id"], ["investigations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_evidence_understandings_evidence_id",
        "evidence_understandings",
        ["evidence_id"],
    )
    op.create_index(
        "ix_evidence_understandings_investigation_id",
        "evidence_understandings",
        ["investigation_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_evidence_understandings_investigation_id",
        table_name="evidence_understandings",
    )
    op.drop_index(
        "ix_evidence_understandings_evidence_id",
        table_name="evidence_understandings",
    )
    op.drop_table("evidence_understandings")
