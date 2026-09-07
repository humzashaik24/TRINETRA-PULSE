"""Relationship intelligence schemas (real application layer, Phase 21).

Mirror the shape the frontend ``@trinetra/types`` consumes for relationship
intelligence while keeping UUID identities and additive semantics. These are
read/compute views: nothing here accepts actor identity from the client.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import SchemaBase


class RelationshipObservationRead(SchemaBase):
    id: UUID
    relationship_id: UUID
    source_dataset: str
    source_type: str | None = None
    source_record: str | None = None
    extraction_method: str | None = None
    observed_at: datetime | None = None
    confidence: float | None = None
    evidence_refs: list[str] = Field(default_factory=list)
    provenance: bool = True


class RelationshipConflictRead(SchemaBase):
    type: str
    field: str
    sources: list[str] = Field(default_factory=list)
    values: list[Any] = Field(default_factory=list)
    detail: str | None = None


class RelationshipEvidenceSupportRead(SchemaBase):
    relationship_id: UUID
    evidence_count: int = 0
    evidence_ids: list[UUID] = Field(default_factory=list)
    datasets: list[str] = Field(default_factory=list)
    linked: bool = False
    message: str = "No linked evidence"


class RelationshipIntelligenceRead(SchemaBase):
    relationship_id: UUID
    investigation_id: UUID
    source_entity_id: UUID
    source_entity_name: str | None = None
    source_entity_type: str | None = None
    target_entity_id: UUID
    target_entity_name: str | None = None
    target_entity_type: str | None = None
    relationship_type: str
    direction: str = "undirected"
    confidence: float = 0.0
    source: str | None = None
    evidence_refs: list[str] = Field(default_factory=list)
    verification_status: str | None = None
    extraction_method: str | None = None
    intelligence_status: str = "observed"
    linkage_score: float = 0.0
    confidence_label: str = "LOW"
    correlation_version: str = "relationship-intelligence-v1"
    correlation_key: str | None = None
    observation_count: int = 0
    source_count: int = 0
    observation_predicate: str = "observation"
    first_observed_at: datetime | None = None
    last_observed_at: datetime | None = None
    conflict_flags: list[dict[str, Any]] = Field(default_factory=list)
    observations: list[RelationshipObservationRead] = Field(default_factory=list)
    evidence: RelationshipEvidenceSupportRead
    verified_by: str | None = None
    verified_at: datetime | None = None
    rejection_reason: str | None = None
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime


class RelationshipIntelligenceItemRead(SchemaBase):
    """Lightweight list item (no full observations/evidence payloads)."""

    relationship_id: UUID
    investigation_id: UUID
    source_entity_id: UUID
    source_entity_name: str | None = None
    source_entity_type: str | None = None
    target_entity_id: UUID
    target_entity_name: str | None = None
    target_entity_type: str | None = None
    relationship_type: str
    direction: str = "undirected"
    confidence: float = 0.0
    verification_status: str | None = None
    extraction_method: str | None = None
    intelligence_status: str = "observed"
    linkage_score: float = 0.0
    confidence_label: str = "LOW"
    correlation_version: str = "relationship-intelligence-v1"
    correlation_key: str | None = None
    observation_count: int = 0
    source_count: int = 0
    observation_predicate: str = "observation"
    first_observed_at: datetime | None = None
    last_observed_at: datetime | None = None
    conflict_count: int = 0
    evidence_count: int = 0
    verified_by: str | None = None
    verified_at: datetime | None = None
    rejection_reason: str | None = None


class RelationshipIntelligenceListRead(SchemaBase):
    investigation_id: UUID
    items: list[RelationshipIntelligenceItemRead] = Field(default_factory=list)
    algorithm_version: str
    evaluated_at: datetime


class RelationshipObservationsRead(SchemaBase):
    relationship_id: UUID
    investigation_id: UUID
    observations: list[RelationshipObservationRead] = Field(default_factory=list)
    algorithm_version: str
    evaluated_at: datetime


class RelationshipConfirmRequest(SchemaBase):
    reason: str | None = None


class RelationshipRejectRequest(SchemaBase):
    reason: str | None = None


class RelationshipEvaluationResponse(SchemaBase):
    investigation_id: UUID
    evaluated_relationships: int = 0
    correlation_groups: int = 0
    correlated_relationships: int = 0
    conflicts_detected: int = 0
    algorithm_version: str
    evaluated_at: datetime
