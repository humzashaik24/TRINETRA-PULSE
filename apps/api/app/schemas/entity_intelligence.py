from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class EntityIntelligenceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# ENTITY CANDIDATE
# ============================================================


class EntityCandidateResponse(EntityIntelligenceBase):
    id: str
    entity_type: str
    raw_value: str
    display_value: str
    source: str
    source_record: str
    dataset_id: str | None = None
    dataset_name: str | None = None
    confidence: float
    extraction_method: str
    status: str
    resolution_state: str | None = None
    resolved_entity_id: str | None = None
    attributes: dict[str, object] = Field(default_factory=dict)
    created_at: datetime
    reviewed_at: datetime | None = None
    reviewed_by: str | None = None


class CandidateReviewRequest(EntityIntelligenceBase):
    decision: Literal["accept", "reject"]
    reviewer: str


# ============================================================
# ENTITY RESOLUTION
# ============================================================


class EntityResolutionResponse(EntityIntelligenceBase):
    id: str
    entity_a_id: str
    entity_a_display: str
    entity_a_type: str
    entity_b_id: str
    entity_b_display: str
    entity_b_type: str
    type: str
    state: str
    decision: str
    confidence: float
    reasons: list[str] = Field(default_factory=list)
    method: str
    created_at: datetime
    updated_at: datetime
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_reason: str | None = None
    merged_target_id: str | None = None


class ResolutionDecisionRequest(EntityIntelligenceBase):
    reviewer: str
    reason: str | None = None


class ResolutionMergeRequest(EntityIntelligenceBase):
    target_entity_id: str
    archive_source_profiles: bool = True
    reviewer: str
    reason: str | None = None


# ============================================================
# EXTRACTION JOB
# ============================================================


class ExtractionJobResponse(EntityIntelligenceBase):
    id: str
    dataset_id: str
    dataset_name: str
    status: str
    progress: int
    records_processed: int
    entities_extracted: int
    candidates_created: int
    matches_found: int
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    created_by: str
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None


class ExtractionStartRequest(EntityIntelligenceBase):
    dataset_id: str
    dataset_name: str
    created_by: str


# ============================================================
# AUDIT TRAIL
# ============================================================


class AuditEventResponse(EntityIntelligenceBase):
    id: str
    actor: str
    actor_name: str
    action: str
    action_label: str
    object: str
    object_type: str
    object_id: str | None = None
    reason: str | None = None
    timestamp: datetime
