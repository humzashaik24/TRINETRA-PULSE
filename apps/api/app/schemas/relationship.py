from uuid import UUID

from pydantic import Field

from app.schemas.common import SchemaBase, TimestampMixin, UUIDMixin


class RelationshipCreate(SchemaBase):
    source_entity_id: UUID
    target_entity_id: UUID
    relationship_type: str
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    source: str | None = None
    evidence_refs: list = Field(default_factory=list)
    extraction_method: str = "manual"
    description: str | None = None
    weight: float = 1.0
    metadata_: dict = Field(default_factory=dict, alias="metadata")


class RelationshipUpdate(SchemaBase):
    confidence: float | None = Field(None, ge=0.0, le=1.0)
    verification_status: str | None = None
    description: str | None = None
    weight: float | None = None
    metadata_: dict | None = Field(None, alias="metadata")


class RelationshipResponse(UUIDMixin, TimestampMixin, SchemaBase):
    source_entity_id: UUID
    target_entity_id: UUID
    relationship_type: str
    confidence: float
    source: str | None = None
    evidence_refs: list
    extraction_method: str
    verification_status: str
    description: str | None = None
    weight: float
