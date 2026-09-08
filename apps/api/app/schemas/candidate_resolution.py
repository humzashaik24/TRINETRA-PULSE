"""API contracts for persisted candidate observations and resolutions."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class CandidateObservationRead(BaseModel):
    id: UUID
    investigation_id: UUID
    dataset_id: UUID | None = None
    entity_type: str
    raw_value: str
    display_value: str
    normalized_value: str
    source: str
    source_record: str
    row_identity: str
    attributes: dict[str, Any] = Field(default_factory=dict)
    provenance: dict[str, Any] = Field(default_factory=dict)
    features: dict[str, Any] = Field(default_factory=dict)
    algorithm_version: str
    state: str
    resolved_entity_id: UUID | None = None
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    review_reason: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CandidateObservationCreate(BaseModel):
    investigation_id: UUID
    entity_type: str
    raw_value: str = Field(min_length=1)
    source: str = Field(min_length=1)
    source_record: str = ""
    row_identity: str = Field(min_length=1)
    dataset_id: UUID | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    provenance: dict[str, Any] = Field(default_factory=dict)


class CandidateResolutionRead(BaseModel):
    id: UUID
    investigation_id: UUID
    candidate_observation_id: UUID
    matched_observation_id: UUID | None = None
    matched_entity_id: UUID | None = None
    entity_type: str
    resolution_type: str
    state: str
    decision: str
    confidence: float
    features: dict[str, Any] = Field(default_factory=dict)
    reasons: list[str] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    provenance: dict[str, Any] = Field(default_factory=dict)
    algorithm_version: str
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    review_reason: str | None = None
    merged_target_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResolutionDecision(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)


class CandidateResolutionAuditRead(BaseModel):
    id: UUID
    investigation_id: UUID
    observation_id: UUID | None = None
    resolution_id: UUID | None = None
    actor_id: UUID | None = None
    actor_email: str
    action: str
    object_type: str
    object_id: str
    reason: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}
