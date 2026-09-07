"""Summary, timeline, network and analytics schemas (real application layer)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import SchemaBase
from app.schemas.real.investigation import (
    EventRead,
    EvidenceRead,
    FindingRead,
    NoteRead,
    RelationshipRead,
)


class InvestigationSummary(SchemaBase):
    id: UUID
    title: str
    status: str
    priority: str
    entity_count: int = 0
    relationship_count: int = 0
    evidence_count: int = 0
    finding_count: int = 0
    event_count: int = 0
    note_count: int = 0
    updated_at: datetime


class TimelineEntry(SchemaBase):
    kind: str  # "event" | "note" | "evidence" | "finding" | "relationship"
    at: datetime | None = None
    title: str | None = None
    ref_id: UUID | None = None
    actor: str | None = None
    description: str | None = None


class TimelineResponse(SchemaBase):
    investigation_id: UUID
    entries: list[TimelineEntry] = Field(default_factory=list)


class NodeSummary(SchemaBase):
    id: UUID
    name: str
    entity_type: str
    risk_score: float = 0.0
    is_verified: bool = False
    is_flagged: bool = False


class EdgeSummary(SchemaBase):
    id: UUID
    source: UUID
    target: UUID
    relationship_type: str
    weight: float = 1.0

    # --- Phase 21 relationship intelligence (additive) ----------------------
    direction: str | None = None
    verification_status: str | None = None
    intelligence_status: str | None = None
    linkage_score: float = 0.0
    observation_count: int = 0
    source_count: int = 0
    first_observed_at: datetime | None = None
    last_observed_at: datetime | None = None


class NetworkGraph(SchemaBase):
    investigation_id: UUID
    nodes: list[NodeSummary] = Field(default_factory=list)
    edges: list[EdgeSummary] = Field(default_factory=list)


class AnalyticsOverview(SchemaBase):
    investigation_id: UUID
    entity_count: int = 0
    relationship_count: int = 0
    connected_components: int = 0
    average_degree: float = 0.0
    flagged_entity_count: int = 0
    verified_entity_count: int = 0
    high_risk_entity_count: int = 0


class InvestigationDetail(SchemaBase):
    investigation: Any
    entities: list[Any] = Field(default_factory=list)
    relationships: list[RelationshipRead] = Field(default_factory=list)
    findings: list[FindingRead] = Field(default_factory=list)
    evidence: list[EvidenceRead] = Field(default_factory=list)
    events: list[EventRead] = Field(default_factory=list)
    notes: list[NoteRead] = Field(default_factory=list)
