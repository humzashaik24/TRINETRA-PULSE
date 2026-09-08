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
    kind: str  # "event" | "note" | "evidence" | "finding"
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


class NetworkGraph(SchemaBase):
    investigation_id: UUID
    nodes: list[NodeSummary] = Field(default_factory=list)
    edges: list[EdgeSummary] = Field(default_factory=list)


class EntityAnalytics(SchemaBase):
    entity_id: UUID
    degree: int = 0
    in_degree: int = 0
    out_degree: int = 0
    normalized_degree: float = 0.0
    betweenness: float = 0.0
    closeness: float = 0.0
    pagerank: float = 0.0
    rank: int = 0


class CommunitySummary(SchemaBase):
    id: str
    node_ids: list[UUID] = Field(default_factory=list)
    size: int = 0
    internal_edge_count: int = 0
    density: float = 0.0
    representative_entity_id: UUID | None = None


class ComponentSummary(SchemaBase):
    id: str
    node_ids: list[UUID] = Field(default_factory=list)
    size: int = 0
    edge_count: int = 0
    density: float = 0.0


class BridgeSummary(SchemaBase):
    entity_id: UUID | None = None
    relationship_id: UUID | None = None
    source_entity_id: UUID | None = None
    target_entity_id: UUID | None = None
    score: float = 0.0
    articulation: bool = False
    degree: int = 0
    betweenness: float = 0.0
    connected_component_ids: list[str] = Field(default_factory=list)
    connected_community_ids: list[str] = Field(default_factory=list)
    explanation: str | None = None


class TemporalSnapshot(SchemaBase):
    period_start: datetime
    period_end: datetime
    node_count: int = 0
    relationship_count: int = 0
    connected_components: int = 0
    community_count: int = 0
    average_degree: float = 0.0
    density: float = 0.0
    new_nodes: int = 0
    new_relationships: int = 0
    metrics: dict[str, dict[str, float]] = Field(default_factory=dict)


class AnalyticsExplanation(SchemaBase):
    code: str
    message: str
    entity_ids: list[UUID] = Field(default_factory=list)
    relationship_ids: list[UUID] = Field(default_factory=list)


class AnalyticsOverview(SchemaBase):
    investigation_id: UUID
    entity_count: int = 0
    relationship_count: int = 0
    connected_components: int = 0
    average_degree: float = 0.0
    flagged_entity_count: int = 0
    verified_entity_count: int = 0
    high_risk_entity_count: int = 0
    density: float = 0.0
    possible_relationship_count: int = 0
    average_path_length: float | None = None
    diameter: int | None = None
    community_count: int = 0
    bridge_entity_count: int = 0
    bridge_relationship_count: int = 0
    largest_component_size: int = 0
    isolated_entity_count: int = 0
    highest_degree_entity_id: UUID | None = None
    network_influence_leader_id: UUID | None = None
    strongest_bridge_entity_id: UUID | None = None
    articulation_entity_ids: list[UUID] = Field(default_factory=list)
    articulation_points: list[UUID] = Field(default_factory=list)
    degree: dict[str, int] = Field(default_factory=dict)
    betweenness: dict[str, float] = Field(default_factory=dict)
    closeness: dict[str, float] = Field(default_factory=dict)
    pagerank: dict[str, float] = Field(default_factory=dict)
    centrality: list[EntityAnalytics] = Field(default_factory=list)
    communities: list[CommunitySummary] = Field(default_factory=list)
    components: list[ComponentSummary] = Field(default_factory=list)
    bridges: list[BridgeSummary] = Field(default_factory=list)
    temporal: list[TemporalSnapshot] = Field(default_factory=list)
    explanations: list[AnalyticsExplanation] = Field(default_factory=list)
    snapshot_id: UUID | None = None
    computed_at: datetime | None = None


class ShortestPathResponse(SchemaBase):
    investigation_id: UUID
    source_entity_id: UUID
    target_entity_id: UUID
    found: bool = False
    length: int | None = None
    path: list[UUID] = Field(default_factory=list)
    relationship_ids: list[UUID] = Field(default_factory=list)
    explanation: str


class InvestigationDetail(SchemaBase):
    investigation: Any
    entities: list[Any] = Field(default_factory=list)
    relationships: list[RelationshipRead] = Field(default_factory=list)
    findings: list[FindingRead] = Field(default_factory=list)
    evidence: list[EvidenceRead] = Field(default_factory=list)
    events: list[EventRead] = Field(default_factory=list)
    notes: list[NoteRead] = Field(default_factory=list)
