import enum

from sqlalchemy import Boolean, Column, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class EntityType(enum.StrEnum):
    PERSON = "person"
    PHONE = "phone"
    VEHICLE = "vehicle"
    LOCATION = "location"
    ORGANIZATION = "organization"
    ACCOUNT = "account"
    TRANSACTION = "transaction"
    EVENT = "event"
    DOCUMENT = "document"
    CASE = "case"
    EVIDENCE = "evidence"


class Entity(BaseModel):
    __tablename__ = "entities"

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entity_type = Column(Enum(EntityType), nullable=False, index=True)
    canonical_name = Column(String(500), nullable=False, index=True)
    name = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=True)
    attributes = Column(JSONB, default=dict, nullable=False)
    confidence = Column(Float, default=0.0, nullable=False)
    risk_score = Column(Float, default=0.0, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    investigation = relationship("Investigation", back_populates="entities")

    source_relationships = relationship(
        "Relationship",
        foreign_keys="Relationship.source_entity_id",
        back_populates="source_entity",
        lazy="dynamic",
    )
    target_relationships = relationship(
        "Relationship",
        foreign_keys="Relationship.target_entity_id",
        back_populates="target_entity",
        lazy="dynamic",
    )
