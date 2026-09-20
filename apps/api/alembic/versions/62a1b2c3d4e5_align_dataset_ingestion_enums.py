"""align dataset/ingestion enum values with the persisted representation (Phase A)

Revision ID: 62a1b2c3d4e5
Revises: 61a1b2c3d4e5
"""
from collections.abc import Mapping, Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "62a1b2c3d4e5"
down_revision: str | Sequence[str] | None = "61a1b2c3d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# SQLAlchemy persists enum member *names* (uppercase) for these columns, but
# the original ``a1b2c3d4e5f6`` migration created the native PostgreSQL types
# with lowercase *values*. On a migration-created database the seed would then
# fail on inserts (Postgres rejects 'READY' when the type only allows
# 'ready'). PostgreSQL ``ALTER TYPE ... RENAME VALUE`` migrates both the type
# and any existing rows, so the databases converge on the uppercase form that
# ``Base.metadata.create_all`` already produces.
TYPE_RENAMES: dict[str, Mapping[str, str]] = {
    "datasetstatus": {
        "uploading": "UPLOADING",
        "validating": "VALIDATING",
        "processing": "PROCESSING",
        "ready": "READY",
        "failed": "FAILED",
        "archived": "ARCHIVED",
    },
    "ingestionjobstatus": {
        "queued": "QUEUED",
        "running": "RUNNING",
        "completed": "COMPLETED",
        "failed": "FAILED",
        "cancelled": "CANCELLED",
    },
}


def _existing_values(conn, type_name: str) -> set[str]:
    rows = conn.execute(
        sa.text(
            "SELECT enumlabel FROM pg_enum e "
            "JOIN pg_type t ON t.oid = e.enumtypid "
            "WHERE t.typname = :name"
        ).bindparams(sa.bindparam("name", type_name))
    )
    return {str(row) for row in rows.scalars().all()}


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return
    for type_name, renames in TYPE_RENAMES.items():
        existing = _existing_values(conn, type_name)
        for old, new in renames.items():
            if old in existing and new not in existing:
                op.execute(f"ALTER TYPE {type_name} RENAME VALUE '{old}' TO '{new}'")


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return
    for type_name, renames in TYPE_RENAMES.items():
        existing = _existing_values(conn, type_name)
        for old, new in renames.items():
            if new in existing and old not in existing:
                op.execute(f"ALTER TYPE {type_name} RENAME VALUE '{new}' TO '{old}'")
