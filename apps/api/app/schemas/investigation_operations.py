"""Pydantic schemas for Phase 11 — Investigation Operations.

Case lifecycle & intelligence operations: pipeline, readiness, health,
review queue, activity log, saved views, bookmarks, cross references,
provenance chains, and investigation-scoped search. These mirror the
frontend types in packages/types/src/investigation-operations.ts and use
neutral operational wording (lifecycle, not criminality).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

InvestigationStage = Literal[
    "data",
    "extraction",
    "resolution",
    "relationships",
    "network",
    "analytics",
    "evidence",
    "findings",
    "timeline",
]

PipelineStageStatus = Literal[
    "NOT_STARTED",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    "NEEDS_REVIEW",
]


class InvestigationPipelineStage(BaseModel):
    stage: InvestigationStage
    label: str
    description: str
    status: PipelineStageStatus
    started_at: str | None = None
    completed_at: str | None = None
    count: int | None = None
    warning_count: int = 0
    error_count: int = 0
    target_workspace: str


class InvestigationPipeline(BaseModel):
    investigation_id: str
    current_stage: InvestigationStage
    progress: int = Field(ge=0, le=100)
    completed_stages: list[InvestigationStage] = []
    stages: list[InvestigationPipelineStage]
    need_review: list[InvestigationStage] = []
    next_recommended_action: str | None = None


# ---------------------------------------------------------------------------
# Readiness
# ---------------------------------------------------------------------------

ReadinessLevel = Literal["ready", "in_progress", "not_started", "needs_attention"]

ReadinessKey = Literal[
    "data",
    "datasets",
    "entities",
    "relationships",
    "evidence",
    "findings",
    "network",
    "analytics",
    "timeline",
    "ai",
]


class ReadinessItem(BaseModel):
    key: ReadinessKey
    label: str
    level: ReadinessLevel
    detail: str | None = None
    warning_count: int = 0


class InvestigationReadiness(BaseModel):
    investigation_id: str
    items: list[ReadinessItem]
    overall: ReadinessLevel
    next_recommended_action: str | None = None


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

HealthMetricKey = Literal[
    "data_completeness",
    "entity_resolution_coverage",
    "relationship_coverage",
    "evidence_coverage",
    "network_readiness",
    "analytics_readiness",
    "open_review_items",
]


class HealthMetric(BaseModel):
    key: HealthMetricKey
    label: str
    value: int = Field(ge=0, le=100)
    total: int | None = None
    detail: str
    has_issues: bool = False


class InvestigationHealth(BaseModel):
    investigation_id: str
    metrics: list[HealthMetric]
    open_review_count: int = 0
    computed_at: str


# ---------------------------------------------------------------------------
# Review queue
# ---------------------------------------------------------------------------

ReviewPriority = Literal["LOW", "MEDIUM", "HIGH"]

ReviewItemKind = Literal[
    "data_validation",
    "unresolved_entity",
    "low_confidence_extraction",
    "relationship_review",
    "evidence_missing_metadata",
    "finding_missing_support",
    "normalization_issue",
    "duplicate_record",
]


class ReviewItem(BaseModel):
    id: str
    investigation_id: str
    kind: ReviewItemKind
    priority: ReviewPriority
    title: str
    description: str
    ref_type: str | None = None
    ref_id: str | None = None
    created_at: str
    resolved: bool = False


# ---------------------------------------------------------------------------
# Activity log
# ---------------------------------------------------------------------------

InvestigationActivityAction = Literal[
    "opened_investigation",
    "opened_entity",
    "viewed_evidence",
    "opened_network",
    "changed_filters",
    "ran_analytics",
    "asked_ai",
    "created_note",
    "created_finding",
    "changed_status",
    "added_dataset",
    "created_investigation",
]


class InvestigationActivityLog(BaseModel):
    id: str
    investigation_id: str
    action: InvestigationActivityAction
    label: str
    detail: str | None = None
    at: str
    actor: str


# ---------------------------------------------------------------------------
# Saved views & bookmarks
# ---------------------------------------------------------------------------


class SaveViewRequest(BaseModel):
    name: str
    description: str | None = None
    network_filters: dict = Field(default_factory=dict)
    timeline_range: dict | None = None
    selected_entities: list[str] = Field(default_factory=list)
    analytics_scope: dict = Field(default_factory=dict)


class SavedInvestigationView(BaseModel):
    id: str
    investigation_id: str
    name: str
    description: str | None = None
    network_filters: dict = Field(default_factory=dict)
    timeline_range: dict | None = None
    selected_entities: list[str] = Field(default_factory=list)
    analytics_scope: dict = Field(default_factory=dict)
    created_at: str


class SaveGraphBookmarkRequest(BaseModel):
    network_id: str
    label: str
    entity_ids: list[str] = Field(default_factory=list)
    relationship_ids: list[str] = Field(default_factory=list)


class GraphBookmark(BaseModel):
    id: str
    investigation_id: str
    network_id: str
    label: str
    entity_ids: list[str] = Field(default_factory=list)
    relationship_ids: list[str] = Field(default_factory=list)
    created_at: str


class SaveTimelineBookmarkRequest(BaseModel):
    label: str
    start: str | None = None
    end: str | None = None
    filters: dict = Field(default_factory=dict)


class TimelineBookmark(BaseModel):
    id: str
    investigation_id: str
    label: str
    start: str | None = None
    end: str | None = None
    filters: dict = Field(default_factory=dict)
    created_at: str


# ---------------------------------------------------------------------------
# Cross references & provenance
# ---------------------------------------------------------------------------

CrossNodeType = Literal["entity", "relationship", "evidence", "finding", "event"]


class CrossReferenceNode(BaseModel):
    type: CrossNodeType
    id: str
    label: str


class CrossReferenceLink(BaseModel):
    from_type: CrossNodeType
    to_type: CrossNodeType


class CrossReference(BaseModel):
    id: str
    investigation_id: str
    entity: CrossReferenceNode
    relationships: list[CrossReferenceNode] = Field(default_factory=list)
    evidence: list[CrossReferenceNode] = Field(default_factory=list)
    findings: list[CrossReferenceNode] = Field(default_factory=list)
    links: list[CrossReferenceLink] = Field(default_factory=list)


ProvenanceNodeType = Literal["source", "dataset", "record", "entity", "relationship", "finding"]


class ProvenanceChainNode(BaseModel):
    type: ProvenanceNodeType
    id: str
    label: str
    detail: str | None = None
    timestamp: str | None = None


class ProvenanceChain(BaseModel):
    id: str
    investigation_id: str
    target_type: ProvenanceNodeType
    target_id: str
    nodes: list[ProvenanceChainNode]
    timestamp: str | None = None


# ---------------------------------------------------------------------------
# Investigation-scoped search
# ---------------------------------------------------------------------------

InvestigationSearchKind = Literal[
    "entity", "relationship", "evidence", "finding", "dataset", "note"
]


class InvestigationSearchResult(BaseModel):
    id: str
    investigation_id: str
    kind: InvestigationSearchKind
    label: str
    description: str | None = None
    ref_id: str | None = None
    score: float


class SearchAcrossResult(BaseModel):
    results: list[InvestigationSearchResult]
