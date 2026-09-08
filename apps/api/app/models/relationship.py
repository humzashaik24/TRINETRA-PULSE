import enum

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class RelationshipType(enum.StrEnum):
    KNOWN_ASSOCIATE = "known_associiate"
    FAMILY = "family"
    COMMUNICATES = "communicates"
    TRANSACTION = "transaction"
    LOCATED_AT = "located_at"
    OWNS = "owns"
    MEMBER_OF = "member_of"
    CONTACTS = "contacts"
    TRAVELS_WITH = "travels_with"
    ASSOCIATED_WITH = "associated_with"
    OTHER = "other"


class VerificationStatus(enum.StrEnum):
    CONFIRMED = "confirmed"
    PROBABLE = "probable"
    POSSIBLE = "possible"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"


class ExtractionMethod(enum.StrEnum):
    MANUAL = "manual"
    AI_NLP = "ai_nlp"
    AI_CV = "ai_cv"
    AI_AUDIO = "ai_audio"
    DOCUMENT_PARSE = "document_parse"
    DATABASE_IMPORT = "database_import"
    NETWORK_ANALYSIS = "network_analysis"
    OTHER = "other"


class Relationship(BaseModel):
    __tablename__ = "relationships"

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_entity_id = Column(
        Uuid,
        ForeignKey("entities.id"),
        nullable=False,
        index=True,
    )
    target_entity_id = Column(
        Uuid,
        ForeignKey("entities.id"),
        nullable=False,
        index=True,
    )
    relationship_type = Column(Enum(RelationshipType), nullable=False, index=True)
    confidence = Column(Float, nullable=False, default=0.0)
    source = Column(String(500), nullable=True)
    evidence_refs = Column(JSONB, default=list, nullable=False)
    extraction_method = Column(Enum(ExtractionMethod), default=ExtractionMethod.MANUAL)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.NEEDS_REVIEW)
    description = Column(Text, nullable=True)
    weight = Column(Float, default=1.0, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    source_entity = relationship(
        "Entity",
        foreign_keys=[source_entity_id],
        back_populates="source_relationships",
    )
    target_entity = relationship(
        "Entity",
        foreign_keys=[target_entity_id],
        back_populates="target_relationships",
    )

    investigation = relationship("Investigation", back_populates="relationships")
