import enum

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class CaseStatus(enum.StrEnum):
    OPEN = "open"
    ACTIVE = "active"
    PENDING = "pending"
    CLOSED = "closed"
    ARCHIVED = "archived"


class CasePriority(enum.StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Case(BaseModel):
    __tablename__ = "cases"

    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    case_number = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN, nullable=False)
    priority = Column(Enum(CasePriority), default=CasePriority.MEDIUM, nullable=False)
    lead_investigator = Column(String(500), nullable=True)
    assigned_team = Column(JSONB, default=list, nullable=False)
    tags = Column(JSONB, default=list, nullable=False)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    incidents = relationship("Incident", back_populates="case", lazy="selectin")
    evidence = relationship("Evidence", back_populates="case", lazy="selectin")


class Incident(BaseModel):
    __tablename__ = "incidents"

    case_id = Column(Uuid, ForeignKey("cases.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    incident_number = Column(String(100), nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=True)
    reported_at = Column(DateTime(timezone=True), nullable=True)
    location_description = Column(String(1000), nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    status = Column(String(50), default="reported")
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    case = relationship("Case", back_populates="incidents")


class Evidence(BaseModel):
    __tablename__ = "case_evidence"

    case_id = Column(Uuid, ForeignKey("cases.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    evidence_type = Column(String(100), nullable=False)
    storage_path = Column(String(1000), nullable=True)
    hash = Column(String(64), nullable=True)
    chain_of_custody = Column(JSONB, default=list, nullable=False)
    tags = Column(JSONB, default=list, nullable=False)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    case = relationship("Case", back_populates="evidence")
    entity_links = relationship(
        "EvidenceEntityLink",
        back_populates="evidence",
        lazy="selectin",
    )


class EvidenceEntityLink(BaseModel):
    __tablename__ = "evidence_entity_links"

    evidence_id = Column(Uuid, ForeignKey("case_evidence.id"), nullable=False, index=True)
    entity_id = Column(Uuid, ForeignKey("entities.id"), nullable=False, index=True)
    link_type = Column("relationship", String(200), nullable=True)
    description = Column(Text, nullable=True)

    evidence = relationship("Evidence", back_populates="entity_links")
