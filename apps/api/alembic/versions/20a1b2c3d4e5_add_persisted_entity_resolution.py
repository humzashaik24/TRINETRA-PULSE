"""persist investigation-scoped entity resolution (Phase 20)

Revision ID: 20a1b2c3d4e5
Revises: f7a8b9c0d1e2
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.db.types import JSONB, Uuid

revision: str = "20a1b2c3d4e5"
down_revision: str | Sequence[str] | None = "f7a8b9c0d1e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    def common() -> list[sa.Column]:
        return [
            sa.Column("id", Uuid, nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        ]
    op.create_table(
        "candidate_observations",
        *common(),
        sa.Column("investigation_id", Uuid, nullable=False),
        sa.Column("dataset_id", Uuid, nullable=True),
        sa.Column("ingestion_job_id", Uuid, nullable=True),
        sa.Column("entity_type", sa.String(64), nullable=False),
        sa.Column("raw_value", sa.Text(), nullable=False),
        sa.Column("display_value", sa.String(500), nullable=False),
        sa.Column("normalized_value", sa.String(500), nullable=False),
        sa.Column("block_key", sa.String(600), nullable=False),
        sa.Column("source", sa.String(500), nullable=False),
        sa.Column("source_record", sa.String(500), nullable=False),
        sa.Column("row_identity", sa.String(256), nullable=False),
        sa.Column("observation_key", sa.String(128), nullable=False),
        sa.Column("attributes", JSONB, nullable=False),
        sa.Column("provenance", JSONB, nullable=False),
        sa.Column("features", JSONB, nullable=False),
        sa.Column("algorithm_version", sa.String(32), nullable=False),
        sa.Column("state", sa.String(32), nullable=False),
        sa.Column("resolved_entity_id", Uuid, nullable=True),
        sa.Column("reviewed_by", Uuid, nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_reason", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["investigation_id"], ["investigations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["ingestion_job_id"], ["ingestion_jobs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["resolved_entity_id"], ["entities.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("investigation_id", "observation_key", name="uq_candidate_observation_key"),
    )
    for name, cols in (
        ("ix_candidate_observations_investigation_id", ["investigation_id"]),
        ("ix_candidate_observations_dataset_id", ["dataset_id"]),
        ("ix_candidate_observations_ingestion_job_id", ["ingestion_job_id"]),
        ("ix_candidate_observations_entity_type", ["entity_type"]),
        ("ix_candidate_observations_normalized_value", ["normalized_value"]),
        ("ix_candidate_observations_block_key", ["block_key"]),
        ("ix_candidate_observations_row_identity", ["row_identity"]),
        ("ix_candidate_observations_state", ["state"]),
    ):
        op.create_index(name, "candidate_observations", cols)

    op.create_table(
        "candidate_resolutions",
        *common(),
        sa.Column("investigation_id", Uuid, nullable=False),
        sa.Column("candidate_observation_id", Uuid, nullable=False),
        sa.Column("matched_observation_id", Uuid, nullable=True),
        sa.Column("matched_entity_id", Uuid, nullable=True),
        sa.Column("entity_type", sa.String(64), nullable=False),
        sa.Column("resolution_type", sa.String(64), nullable=False),
        sa.Column("state", sa.String(32), nullable=False),
        sa.Column("decision", sa.String(32), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("features", JSONB, nullable=False),
        sa.Column("reasons", JSONB, nullable=False),
        sa.Column("contradictions", JSONB, nullable=False),
        sa.Column("provenance", JSONB, nullable=False),
        sa.Column("algorithm_version", sa.String(32), nullable=False),
        sa.Column("reviewed_by", Uuid, nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_reason", sa.Text(), nullable=True),
        sa.Column("merged_target_id", Uuid, nullable=True),
        sa.ForeignKeyConstraint(["investigation_id"], ["investigations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["candidate_observation_id"], ["candidate_observations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["matched_observation_id"], ["candidate_observations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["matched_entity_id"], ["entities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["merged_target_id"], ["entities.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "investigation_id", "candidate_observation_id", "matched_observation_id",
            "matched_entity_id", name="uq_candidate_resolution_pair",
        ),
    )
    for name, cols in (
        ("ix_candidate_resolutions_investigation_id", ["investigation_id"]),
        ("ix_candidate_resolutions_candidate_observation_id", ["candidate_observation_id"]),
        ("ix_candidate_resolutions_matched_observation_id", ["matched_observation_id"]),
        ("ix_candidate_resolutions_matched_entity_id", ["matched_entity_id"]),
        ("ix_candidate_resolutions_state", ["state"]),
    ):
        op.create_index(name, "candidate_resolutions", cols)

    op.create_table(
        "candidate_resolution_audit",
        *common(),
        sa.Column("investigation_id", Uuid, nullable=False),
        sa.Column("observation_id", Uuid, nullable=True),
        sa.Column("resolution_id", Uuid, nullable=True),
        sa.Column("actor_id", Uuid, nullable=True),
        sa.Column("actor_email", sa.String(320), nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("object_type", sa.String(64), nullable=False),
        sa.Column("object_id", sa.String(128), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("details", JSONB, nullable=False),
        sa.ForeignKeyConstraint(["investigation_id"], ["investigations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["observation_id"], ["candidate_observations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["resolution_id"], ["candidate_resolutions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    for name, cols in (
        ("ix_candidate_resolution_audit_investigation_id", ["investigation_id"]),
        ("ix_candidate_resolution_audit_observation_id", ["observation_id"]),
        ("ix_candidate_resolution_audit_resolution_id", ["resolution_id"]),
        ("ix_candidate_resolution_audit_actor_id", ["actor_id"]),
        ("ix_candidate_resolution_audit_action", ["action"]),
    ):
        op.create_index(name, "candidate_resolution_audit", cols)


def downgrade() -> None:
    for name in (
        "ix_candidate_resolution_audit_action",
        "ix_candidate_resolution_audit_actor_id",
        "ix_candidate_resolution_audit_resolution_id",
        "ix_candidate_resolution_audit_observation_id",
        "ix_candidate_resolution_audit_investigation_id",
    ):
        op.drop_index(name, table_name="candidate_resolution_audit")
    op.drop_table("candidate_resolution_audit")
    for name in (
        "ix_candidate_resolutions_state",
        "ix_candidate_resolutions_matched_entity_id",
        "ix_candidate_resolutions_matched_observation_id",
        "ix_candidate_resolutions_candidate_observation_id",
        "ix_candidate_resolutions_investigation_id",
    ):
        op.drop_index(name, table_name="candidate_resolutions")
    op.drop_table("candidate_resolutions")
    for name in (
        "ix_candidate_observations_state",
        "ix_candidate_observations_row_identity",
        "ix_candidate_observations_block_key",
        "ix_candidate_observations_normalized_value",
        "ix_candidate_observations_entity_type",
        "ix_candidate_observations_ingestion_job_id",
        "ix_candidate_observations_dataset_id",
        "ix_candidate_observations_investigation_id",
    ):
        op.drop_index(name, table_name="candidate_observations")
    op.drop_table("candidate_observations")
