import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class InvestigationStatus(enum.StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    UNDER_REVIEW = "under_review"
    SUSPENDED = "suspended"
    CLOSED = "closed"
    ARCHIVED = "archived"


class InvestigationPriority(enum.StrEnum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class FindingSeverity(enum.StrEnum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FindingConfidence(enum.StrEnum):
    OBSERVED = "observed"
    INFERRED = "inferred"
    ANALYTICAL = "analytical"
    UNKNOWN = "unknown"


class FindingStatus(enum.StrEnum):
    DRAFT = "draft"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class EvidenceIntelligenceType(enum.StrEnum):
    DOCUMENT = "DOCUMENT"
    FIR = "FIR"
    REPORT = "REPORT"
    COMMUNICATION = "COMMUNICATION"
    TRANSACTION = "TRANSACTION"
    VEHICLE = "VEHICLE"
    LOCATION = "LOCATION"
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    RECORD = "RECORD"
    OTHER = "OTHER"


class Investigation(BaseModel):
    """Top-level investigation container (`investigations`)."""

    __tablename__ = "investigations"

    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        Enum(InvestigationStatus), default=InvestigationStatus.DRAFT, nullable=False
    )
    priority = Column(
        Enum(InvestigationPriority), default=InvestigationPriority.NORMAL, nullable=False
    )
    lead_investigator = Column(String(500), nullable=True)
    assigned_team = Column(JSONB, default=list, nullable=False)
    tags = Column(JSONB, default=list, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    entities = relationship("Entity", back_populates="investigation", lazy="selectin")
    relationships = relationship(
        "Relationship", back_populates="investigation", lazy="selectin"
    )
    findings = relationship(
        "InvestigationFinding", back_populates="investigation", lazy="selectin"
    )
    evidence = relationship(
        "InvestigationEvidence", back_populates="investigation", lazy="selectin"
    )
    events = relationship(
        "InvestigationEvent", back_populates="investigation", lazy="selectin"
    )
    notes = relationship(
        "InvestigationNote", back_populates="investigation", lazy="selectin"
    )
    datasets = relationship(
        "Dataset", back_populates="investigation", lazy="selectin"
    )
    ingestion_jobs = relationship(
        "IngestionJob", back_populates="investigation", lazy="selectin"
    )


class InvestigationFinding(BaseModel):
    """A finding inside an investigation (`findings`)."""

    __tablename__ = "findings"

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(Enum(FindingSeverity), default=FindingSeverity.INFO, nullable=False)
    confidence = Column(
        Enum(FindingConfidence), default=FindingConfidence.OBSERVED, nullable=False
    )
    status = Column(Enum(FindingStatus), default=FindingStatus.OPEN, nullable=False)
    entity_refs = Column(JSONB, default=list, nullable=False)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    investigation = relationship("Investigation", back_populates="findings")


class InvestigationEvidence(BaseModel):
    """Evidence referenced by an investigation (`evidence`)."""

    __tablename__ = "evidence"

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_type = Column(String(100), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String(500), nullable=True)
    provenance = Column(JSONB, default=dict, nullable=False)
    # SHA-256 hex digest over the evidence content (or upstream provenance hash),
    # used by the blockchain evidence-integrity anchor chain.
    checksum = Column(String(64), nullable=True)
    collected_at = Column(DateTime(timezone=True), nullable=True)
    storage_ref = Column(String(1000), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    investigation = relationship("Investigation", back_populates="evidence")


class InvestigationEvent(BaseModel):
    """An event in an investigation timeline (`events`)."""

    __tablename__ = "events"

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type = Column(String(200), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=True)
    location = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    investigation = relationship("Investigation", back_populates="events")


class InvestigationNote(BaseModel):
    """A note attached to an investigation (`investigation_notes`)."""

    __tablename__ = "investigation_notes"

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=False)
    author = Column(String(500), nullable=False, default="analyst")
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    investigation = relationship("Investigation", back_populates="notes")
