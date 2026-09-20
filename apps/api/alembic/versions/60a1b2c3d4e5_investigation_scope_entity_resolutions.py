"""scope entity_resolutions to their owning investigation (Phase A)

Revision ID: 60a1b2c3d4e5
Revises: 50a1b2c3d4e5
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.db.types import Uuid

revision: str = "60a1b2c3d4e5"
down_revision: str | Sequence[str] | None = "50a1b2c3d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add as nullable so pre-existing resolution rows can be backfilled.
    #    batch_alter_table(recreate="always") lets SQLite rebuild the table to
    #    apply the NOT NULL / FK / index below; PostgreSQL issues plain ALTERs.
    with op.batch_alter_table("entity_resolutions", recreate="always") as batch_op:
        batch_op.add_column(sa.Column("investigation_id", Uuid, nullable=True))
    # 2. Backfill from the owning investigation of the primary entity (portable
    #    SQL: runs on both PostgreSQL and SQLite).
    op.execute(
        """
        UPDATE entity_resolutions
        SET investigation_id = (
            SELECT entities.investigation_id
            FROM entities
            WHERE entities.id = entity_resolutions.entity_id_1
        )
        """
    )
    # 3. Enforce the invariant.
    with op.batch_alter_table("entity_resolutions", recreate="always") as batch_op:
        batch_op.alter_column(
            "investigation_id",
            nullable=False,
            existing_type=Uuid,
            existing_nullable=True,
        )
        batch_op.create_foreign_key(
            "fk_entity_resolutions_investigation_id",
            "investigations",
            ["investigation_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_index(
            "ix_entity_resolutions_investigation_id",
            ["investigation_id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("entity_resolutions", recreate="always") as batch_op:
        batch_op.drop_index("ix_entity_resolutions_investigation_id")
        batch_op.drop_constraint(
            "fk_entity_resolutions_investigation_id",
            type_="foreignkey",
        )
        batch_op.drop_column("investigation_id")
