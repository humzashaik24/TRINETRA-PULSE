
from pydantic import Field

from app.schemas.common import SchemaBase, TimestampMixin, UUIDMixin


class EntityCreate(SchemaBase):
    entity_type: str
    name: str
    description: str | None = None
    attributes: dict = Field(default_factory=dict)
    metadata_: dict = Field(default_factory=dict, alias="metadata")


class EntityUpdate(SchemaBase):
    name: str | None = None
    canonical_name: str | None = None
    description: str | None = None
    attributes: dict | None = None
    is_verified: bool | None = None
    is_flagged: bool | None = None
    metadata_: dict | None = Field(None, alias="metadata")


class EntityResponse(UUIDMixin, TimestampMixin, SchemaBase):
    entity_type: str
    name: str
    canonical_name: str | None = None
    description: str | None = None
    attributes: dict
    risk_score: float
    is_verified: bool
    is_flagged: bool


class EntitySearchRequest(SchemaBase):
    query: str
    entity_type: str | None = None
    limit: int = Field(20, ge=1, le=100)
