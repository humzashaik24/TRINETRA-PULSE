from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel as PydanticBaseModel
from pydantic import ConfigDict, Field

T = TypeVar("T")


class SchemaBase(PydanticBaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampMixin(PydanticBaseModel):
    created_at: datetime
    updated_at: datetime


class UUIDMixin(PydanticBaseModel):
    id: UUID


class PaginationParams(PydanticBaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class PaginatedResponse(PydanticBaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorResponse(PydanticBaseModel):
    detail: str
    status_code: int
    path: str | None = None


class HealthResponse(PydanticBaseModel):
    status: str
    version: str
    environment: str
    database: str = "ok"
