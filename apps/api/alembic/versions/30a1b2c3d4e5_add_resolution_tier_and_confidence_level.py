"""add resolution tier and confidence level (Phase 20)

Revision ID: 30a1b2c3d4e5
Revises: 20a1b2c3d4e5
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "30a1b2c3d4e5"
down_revision: str | Sequence[str] | None = "20a1b2c3d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "candidate_resolutions",
        sa.Column("tier", sa.String(length=64), nullable=False, server_default="none"),
    )
    op.add_column(
        "candidate_resolutions",
        sa.Column(
            "confidence_level",
            sa.String(length=16),
            nullable=False,
            server_default="low",
        ),
    )


def downgrade() -> None:
    op.drop_column("candidate_resolutions", "confidence_level")
    op.drop_column("candidate_resolutions", "tier")