"""Dataset, DataSource and IngestionJob models for data intelligence persistence."""

from __future__ import annotations

import enum

from sqlalchemy import Column, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class DatasetStatus(enum.StrEnum):
    UPLOADING = "uploading"
    VALIDATING = "validating"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
    ARCHIVED = "archived"


class IngestionJobStatus(enum.StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DataSource(BaseModel):
    """A registered data source type (e.g. FIR Records, CDR Extract)."""

    __tablename__ = "data_sources"

    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    format = Column(String(50), nullable=False)
    icon = Column(String(100), nullable=True)
    accepted_extensions = Column(JSONB, default=list, nullable=False)
    max_file_size = Column(Integer, default=10_485_760, nullable=False)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)


class Dataset(BaseModel):
    """An uploaded/ingested dataset within an investigation."""

    __tablename__ = "datasets"

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    data_source_id = Column(
        Uuid,
        ForeignKey("data_sources.id"),
        nullable=True,
        index=True,
    )
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    source_name = Column(String(500), nullable=True)
    format = Column(String(50), nullable=False)
    category = Column(String(100), nullable=False)
    status = Column(
        Enum(DatasetStatus), default=DatasetStatus.UPLOADING, nullable=False
    )
    record_count = Column(Integer, default=0, nullable=False)
    file_size = Column(Integer, default=0, nullable=False)
    file_name = Column(String(1000), nullable=True)
    quality_score = Column(Float, default=0.0, nullable=False)
    warnings = Column(Integer, default=0, nullable=False)
    errors = Column(Integer, default=0, nullable=False)
    duplicates = Column(Integer, default=0, nullable=False)
    last_ingestion_id = Column(Uuid, nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    investigation = relationship("Investigation", back_populates="datasets")
    ingestion_jobs = relationship(
        "IngestionJob", back_populates="dataset", lazy="selectin"
    )


class IngestionJob(BaseModel):
    """A CSV / structured data ingestion job."""

    __tablename__ = "ingestion_jobs"

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dataset_id = Column(
        Uuid,
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        Enum(IngestionJobStatus),
        default=IngestionJobStatus.QUEUED,
        nullable=False,
    )
    progress = Column(Integer, default=0, nullable=False)
    records_processed = Column(Integer, default=0, nullable=False)
    entities_extracted = Column(Integer, default=0, nullable=False)
    candidates_created = Column(Integer, default=0, nullable=False)
    matches_found = Column(Integer, default=0, nullable=False)
    errors_list = Column("errors", JSONB, default=list, nullable=False)
    warnings_list = Column("warnings", JSONB, default=list, nullable=False)
    created_by = Column(String(500), nullable=True)
    started_at = Column(String(100), nullable=True)
    completed_at = Column(String(100), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    investigation = relationship("Investigation", back_populates="ingestion_jobs")
    dataset = relationship("Dataset", back_populates="ingestion_jobs")
