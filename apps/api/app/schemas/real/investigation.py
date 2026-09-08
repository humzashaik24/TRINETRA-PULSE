"""Pydantic schemas for the real (database-backed) application layer.

These mirror the shape the frontend ``@trinetra/types`` already consumes
where reasonable, but use UUID identities and ``{code, message, details}``
error semantics for the relational API surface.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import SchemaBase, UUIDMixin


class InvestigationRead(SchemaBase, UUIDMixin):
    title: str
    description: str | None = None
    status: str
    priority: str
    lead_investigator: str | None = None
    assigned_team: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    started_at: datetime | None = None
    closed_at: datetime | None = None
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class InvestigationCreate(SchemaBase):
    title: str
    description: str | None = None
    status: str = "draft"
    priority: str = "normal"
    lead_investigator: str | None = None
    assigned_team: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    started_at: datetime | None = None
    metadata_: dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}


class InvestigationUpdate(SchemaBase):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    lead_investigator: str | None = None
    assigned_team: list[str] | None = None
    tags: list[str] | None = None
    closed_at: datetime | None = None
    metadata_: dict[str, Any] | None = Field(default=None, alias="metadata")

    model_config = {"populate_by_name": True}


class EntityRead(SchemaBase, UUIDMixin):
    investigation_id: UUID
    entity_type: str
    canonical_name: str
    name: str
    description: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.0
    risk_score: float = 0.0
    is_verified: bool = False
    is_flagged: bool = False
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class EntityCreate(SchemaBase):
    investigation_id: UUID
    entity_type: str
    canonical_name: str | None = None
    name: str
    description: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.0
    is_verified: bool = False
    is_flagged: bool = False
    metadata_: dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}


class RelationshipRead(SchemaBase, UUIDMixin):
    investigation_id: UUID
    source_entity_id: UUID
    target_entity_id: UUID
    relationship_type: str
    confidence: float = 0.0
    source: str | None = None
    evidence_refs: list[str] = Field(default_factory=list)
    extraction_method: str | None = None
    verification_status: str | None = None
    description: str | None = None
    weight: float = 1.0
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class RelationshipCreate(SchemaBase):
    investigation_id: UUID
    source_entity_id: UUID
    target_entity_id: UUID
    relationship_type: str
    confidence: float = 0.0
    source: str | None = None
    evidence_refs: list[str] = Field(default_factory=list)
    verification_status: str | None = None
    description: str | None = None
    weight: float = 1.0
    metadata_: dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}


class FindingRead(SchemaBase, UUIDMixin):
    investigation_id: UUID
    title: str
    description: str | None = None
    severity: str
    confidence: str
    status: str
    entity_refs: list[str] = Field(default_factory=list)
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class FindingCreate(SchemaBase):
    investigation_id: UUID
    title: str
    description: str | None = None
    severity: str = "info"
    confidence: str = "observed"
    status: str = "open"
    entity_refs: list[str] = Field(default_factory=list)
    metadata_: dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}


class EvidenceRead(SchemaBase, UUIDMixin):
    investigation_id: UUID
    evidence_type: str
    title: str
    description: str | None = None
    source: str | None = None
    provenance: dict[str, Any] = Field(default_factory=dict)
    collected_at: datetime | None = None
    storage_ref: str | None = None
    filename: str | None = None
    content_type: str | None = None
    size: int | None = None
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    # Phase 17.6 — SHA-256 integrity block {checksum, status} when available.
    integrity: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class EvidenceCreate(SchemaBase):
    investigation_id: UUID
    evidence_type: str
    title: str
    description: str | None = None
    source: str | None = None
    provenance: dict[str, Any] = Field(default_factory=dict)
    collected_at: datetime | None = None
    metadata_: dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}


class EventRead(SchemaBase, UUIDMixin):
    investigation_id: UUID
    event_type: str
    timestamp: datetime | None = None
    location: str | None = None
    description: str | None = None
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class EventCreate(SchemaBase):
    investigation_id: UUID
    event_type: str
    timestamp: datetime | None = None
    location: str | None = None
    description: str | None = None
    metadata_: dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}


class NoteRead(SchemaBase, UUIDMixin):
    investigation_id: UUID
    content: str
    author: str = "analyst"
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class NoteCreate(SchemaBase):
    investigation_id: UUID
    content: str
    author: str = "analyst"
    metadata_: dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}
