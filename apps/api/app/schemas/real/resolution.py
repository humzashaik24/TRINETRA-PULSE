"""Pydantic schemas for the real (database-backed) entity resolution layer.

Phase 20 — Entity Resolution & Identity Correlation Intelligence.

These schemas mirror the shape that the web layer consumes while preserving
the neutral, explainable language required by the feature: resolution
identifies potential identity equivalence, never criminality or guilt.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import SchemaBase, UUIDMixin


class MatchFeatureRead(SchemaBase):
    feature: str
    label: str
    matched: bool | None = None
    value: str = ""
    weight: float = 0.0
    value_1: Any = None
    value_2: Any = None
    normalized_1: Any = None
    normalized_2: Any = None
    source_1: str | None = None
    source_2: str | None = None


class ContradictionRead(SchemaBase):
    type: str
    field: str
    values: list[Any] = Field(default_factory=list)
    detail: str | None = None
    label: str | None = None


class SourceRefRead(SchemaBase):
    source_dataset: str = ""
    source_record: str | None = None
    source_type: str | None = None
    original_value: str | None = None
    normalized_value: str | None = None
    dataset_id: str | None = None
    evidence_refs: list[str] = Field(default_factory=list)


class EntityResolutionRead(SchemaBase, UUIDMixin):
    investigation_id: UUID
    entity_id_1: UUID
    entity_id_2: UUID
    entity_1_name: str | None = None
    entity_2_name: str | None = None
    entity_1_type: str | None = None
    entity_2_type: str | None = None
    confidence: str = "LOW"
    linkage_score: float = 0.0
    resolution_version: str = "entity-resolution-v1"
    resolution_method: str = "auto"
    matched_features: list[MatchFeatureRead] = Field(default_factory=list)
    contradictions: list[ContradictionRead] = Field(default_factory=list)
    source_refs: list[SourceRefRead] = Field(default_factory=list)
    matching_attributes: list[Any] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    verification_state: str = "needs_review"
    last_evaluated_at: datetime | None = None
    verified_by: str | None = None
    verified_at: datetime | None = None
    rejection_reason: str | None = None
    metadata_: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias="metadata",
        serialization_alias="metadata",
    )
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class ResolutionCandidatesRead(SchemaBase):
    investigation_id: UUID
    entity_id: UUID | None = None
    candidates: list[EntityResolutionRead] = Field(default_factory=list)
    algorithm_version: str = "entity-resolution-v1"
    evaluated_at: datetime


class ResolutionConfirmRequest(SchemaBase):
    reason: str | None = None


class ResolutionRejectRequest(SchemaBase):
    reason: str | None = None


class ResolutionEvaluationResponse(SchemaBase):
    investigation_id: UUID
    evaluated_pairs: int = 0
    created_resolutions: int = 0
    skipped_existing: int = 0
    algorithm_version: str = "entity-resolution-v1"
    evaluated_at: datetime


class ResolutionProvenanceRead(SchemaBase, UUIDMixin):
    investigation_id: UUID | None = None
    dataset_id: UUID | None = None
    entity_id: UUID | None = None
    source_type: str
    source_name: str | None = None
    source_document_id: str | None = None
    timestamp: datetime | None = None
    extraction_method: str | None = None
    confidence: float | None = None
    evidence_refs: list[str] = Field(default_factory=list)
    checksum: str | None = None
    notes: str | None = None
    metadata_: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias="metadata",
        serialization_alias="metadata",
    )
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}
