import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class VerificationState(enum.StrEnum):
    CONFIRMED = "confirmed"
    PROBABLE = "probable"
    POSSIBLE = "possible"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"


class EntityResolution(BaseModel):
    __tablename__ = "entity_resolutions"

    entity_id_1 = Column(Uuid, ForeignKey("entities.id"), nullable=False, index=True)
    entity_id_2 = Column(Uuid, ForeignKey("entities.id"), nullable=False, index=True)
    confidence = Column(String(20), nullable=False)
    matching_attributes = Column(JSONB, default=list, nullable=False)
    evidence = Column(JSONB, default=list, nullable=False)
    verification_state = Column(
        Enum(VerificationState),
        default=VerificationState.NEEDS_REVIEW,
        nullable=False,
    )
    verified_by = Column(String(200), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)
