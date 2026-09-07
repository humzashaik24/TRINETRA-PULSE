from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import SchemaBase, TimestampMixin, UUIDMixin


class CaseCreate(SchemaBase):
    title: str
    description: str | None = None
    case_number: str
    priority: str = "medium"
    lead_investigator: str | None = None
    assigned_team: list = Field(default_factory=list)
    tags: list = Field(default_factory=list)
    metadata_: dict = Field(default_factory=dict, alias="metadata")


class CaseUpdate(SchemaBase):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    lead_investigator: str | None = None
    assigned_team: list | None = None
    tags: list | None = None


class CaseResponse(UUIDMixin, TimestampMixin, SchemaBase):
    title: str
    description: str | None = None
    case_number: str
    status: str
    priority: str
    lead_investigator: str | None = None
    assigned_team: list
    tags: list


class IncidentCreate(SchemaBase):
    case_id: UUID
    title: str
    description: str | None = None
    incident_number: str
    occurred_at: datetime | None = None
    reported_at: datetime | None = None
    location_description: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None


class IncidentResponse(UUIDMixin, TimestampMixin, SchemaBase):
    case_id: UUID
    title: str
    description: str | None = None
    incident_number: str
    occurred_at: datetime | None = None
    reported_at: datetime | None = None
    location_description: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    status: str


class EvidenceCreate(SchemaBase):
    case_id: UUID
    title: str
    description: str | None = None
    evidence_type: str
    tags: list = Field(default_factory=list)
    metadata_: dict = Field(default_factory=dict, alias="metadata")


class EvidenceResponse(UUIDMixin, TimestampMixin, SchemaBase):
    case_id: UUID
    title: str
    description: str | None = None
    evidence_type: str
    tags: list
