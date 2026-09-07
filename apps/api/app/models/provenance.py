import enum

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, String, Text

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class ProvenanceSourceType(enum.StrEnum):
    DOCUMENT = "document"
    DATABASE = "database"
    API = "api"
    MANUAL_ENTRY = "manual_entry"
    AI_EXTRACTION = "ai_extraction"
    WITNESS = "witness"
    SURVEILLANCE = "surveillance"
    OTHER = "other"


class DataProvenance(BaseModel):
    __tablename__ = "data_provenance"

    # --- Investigation scoping (Phase 17.1) ---
    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    # --- Dataset / ingestion tracking (Phase 17.1) ---
    dataset_id = Column(
        Uuid,
        ForeignKey("datasets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ingestion_job_id = Column(
        Uuid,
        ForeignKey("ingestion_jobs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # --- Entity / relationship provenance links (existing schema) ---
    entity_id = Column(
        Uuid, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    relationship_id = Column(
        Uuid,
        ForeignKey("relationships.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # --- Source metadata (existing schema) ---
    source_type = Column(Enum(ProvenanceSourceType), nullable=False)
    source_name = Column(String(500), nullable=True)
    source_document_id = Column(
        Uuid, ForeignKey("case_evidence.id", ondelete="SET NULL"), nullable=True
    )
    timestamp = Column(DateTime(timezone=True), nullable=True)
    extraction_method = Column(String(200), nullable=True)
    confidence = Column(Float, default=1.0)
    evidence_refs = Column(JSONB, default=list, nullable=False)
    analyst_verification = Column(String(200), nullable=True)
    verification_timestamp = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    checksum = Column(String(128), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)
