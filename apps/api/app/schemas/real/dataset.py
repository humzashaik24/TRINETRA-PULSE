"""Pydantic schemas for the real (database-backed) dataset / ingestion layer."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import SchemaBase, UUIDMixin


class DataSourceRead(SchemaBase, UUIDMixin):
    name: str
    description: str | None = None
    category: str
    format: str
    icon: str | None = None
    accepted_extensions: list[str] = Field(default_factory=list)
    max_file_size: int = 10_485_760
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class DataSourceCreate(SchemaBase):
    name: str
    description: str | None = None
    category: str
    format: str
    icon: str | None = None
    accepted_extensions: list[str] = Field(default_factory=list)
    max_file_size: int = 10_485_760
    metadata_: dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}


class DatasetRead(SchemaBase, UUIDMixin):
    investigation_id: UUID
    data_source_id: UUID | None = None
    name: str
    description: str | None = None
    source_name: str | None = None
    format: str
    category: str
    status: str
    record_count: int = 0
    file_size: int = 0
    file_name: str | None = None
    quality_score: float = 0.0
    warnings: int = 0
    errors: int = 0
    duplicates: int = 0
    last_ingestion_id: UUID | None = None
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class DatasetCreate(SchemaBase):
    investigation_id: UUID
    data_source_id: UUID | None = None
    name: str
    description: str | None = None
    source_name: str | None = None
    format: str
    category: str
    file_name: str | None = None
    file_size: int = 0
    metadata_: dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}


class DatasetUpdate(SchemaBase):
    """Update subset of dataset fields; used by PATCH /datasets/{id}."""

    status: str | None = None
    record_count: int | None = None
    file_size: int | None = None
    quality_score: float | None = None
    warnings: int | None = None
    errors: int | None = None
    duplicates: int | None = None

    model_config = {"populate_by_name": True}


class IngestionJobRead(SchemaBase, UUIDMixin):
    investigation_id: UUID
    dataset_id: UUID
    status: str
    progress: int = 0
    records_processed: int = 0
    entities_extracted: int = 0
    candidates_created: int = 0
    matches_found: int = 0
    errors_list: list[str] = Field(default_factory=list, serialization_alias="errors")
    warnings_list: list[str] = Field(default_factory=list, serialization_alias="warnings")
    created_by: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    metadata_: dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class IngestionJobCreate(SchemaBase):
    investigation_id: UUID
    dataset_id: UUID | None = None
    created_by: str | None = None
    metadata_: dict[str, Any] = Field(default_factory=dict, alias="metadata")

    model_config = {"populate_by_name": True}
