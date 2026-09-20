"""extend relationshiptype enum with the canonical Nexus labels (Phase A)

Revision ID: 61a1b2c3d4e5
Revises: 60a1b2c3d4e5
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "61a1b2c3d4e5"
down_revision: str | Sequence[str] | None = "60a1b2c3d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# SQLAlchemy persists enum member *names* (uppercase) for these columns, so the
# canonical Nexus labels (USES/KNOWS/WORKS_FOR/OWNS_ACCOUNT/SENT_TRANSACTION/
# INVOLVED_IN/SUPPORTED_BY) must exist as values of the native PostgreSQL
# ``relationshiptype`` type.
NEW_RELATIONSHIP_TYPES: tuple[str, ...] = (
    "USES",
    "KNOWS",
    "WORKS_FOR",
    "OWNS_ACCOUNT",
    "SENT_TRANSACTION",
    "INVOLVED_IN",
    "SUPPORTED_BY",
)


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return
    existing = set(
        conn.execute(
            sa.text(
                "SELECT enumlabel FROM pg_enum e "
                "JOIN pg_type t ON t.oid = e.enumtypid "
                "WHERE t.typname = 'relationshiptype'"
            )
        ).scalars()
    )
    for value in NEW_RELATIONSHIP_TYPES:
        if value not in existing:
            op.execute(f"ALTER TYPE relationshiptype ADD VALUE '{value}'")


def downgrade() -> None:
    # PostgreSQL cannot remove an enum value; the newly added labels are simply
    # unused by any legacy data path.
    pass
