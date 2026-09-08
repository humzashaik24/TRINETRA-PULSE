"""add AI/media provider configuration table (Phase 23)

Revision ID: 40a1b2c3d4e5
Revises: 30a1b2c3d4e5

A single ``ai_config_providers`` table backs the Phase 23 provider management
system: one row per (provider, capability) configuration with server-side
encrypted credentials (``encrypted_api_key`` is never plaintext). A partial
unique index guarantees at most one ``is_default`` row per capability.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.db.types import JSONB, Uuid

revision: str = "40a1b2c3d4e5"
down_revision: str | Sequence[str] | None = "30a1b2c3d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_config_providers",
        sa.Column("id", Uuid, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("provider_name", sa.String(length=120), nullable=False),
        sa.Column(
            "provider_type",
            sa.Enum(
                "openai",
                "gemini",
                "openrouter",
                "mock",
                name="provider_type",
                native_enum=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "capability",
            sa.Enum(
                "investigation_ai",
                "vision",
                "video",
                "transcription",
                name="provider_capability",
                native_enum=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("model", sa.String(length=200), nullable=False),
        sa.Column("base_url", sa.String(length=500), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("configuration", JSONB, nullable=True),
        sa.Column("encrypted_api_key", sa.Text(), nullable=True),
        sa.Column("created_by", Uuid, nullable=True),
        sa.Column("updated_by", Uuid, nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "capability", "provider_name", name="uq_ai_provider_capability_name"
        ),
    )
    op.create_index(
        "ix_ai_config_providers_capability",
        "ai_config_providers",
        ["capability"],
    )
    # One default per capability (PostgreSQL + SQLite partial-index support).
    op.create_index(
        "uq_ai_provider_default_per_capability",
        "ai_config_providers",
        ["capability"],
        unique=True,
        postgresql_where=sa.text("is_default"),
        sqlite_where=sa.text("is_default"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_ai_provider_default_per_capability",
        table_name="ai_config_providers",
    )
    op.drop_index(
        "ix_ai_config_providers_capability",
        table_name="ai_config_providers",
    )
    op.drop_table("ai_config_providers")
