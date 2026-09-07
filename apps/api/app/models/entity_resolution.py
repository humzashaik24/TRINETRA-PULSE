import enum

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, String, Text

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class VerificationState(enum.StrEnum):
    CONFIRMED = "confirmed"
    PROBABLE = "probable"
    POSSIBLE = "possible"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"

    # Phase 20 review states. AUTO_RESOLVED is set when the system resolves a
    # pair with high confidence but it remains reversible/auditable; states
    # are investigator-actionable.
    AUTO_RESOLVED = "auto_resolved"


class ResolutionMethod(enum.StrEnum):
    AUTO = "auto"
    MANUAL = "manual"
    IMPORTED = "imported"


class EntityResolution(BaseModel):
    """A resolved (or candidate) pair of entities that may be the same
    observed entity. Resolution identifies potential identity equivalence; it
    does not establish criminality or guilt."""

    __tablename__ = "entity_resolutions"

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entity_id_1 = Column(
        Uuid, ForeignKey("entities.id"), nullable=False, index=True
    )
    entity_id_2 = Column(
        Uuid, ForeignKey("entities.id"), nullable=False, index=True
    )
    confidence = Column(String(20), nullable=False)
    linkage_score = Column(Float, nullable=False, default=0.0)
    resolution_version = Column(String(100), nullable=False, default="entity-resolution-v1")
    resolution_method = Column(
        Enum(ResolutionMethod), default=ResolutionMethod.AUTO, nullable=False
    )
    matched_features = Column(JSONB, default=list, nullable=False)
    contradictions = Column(JSONB, default=list, nullable=False)
    source_refs = Column(JSONB, default=list, nullable=False)
    matching_attributes = Column(JSONB, default=list, nullable=False)
    evidence = Column(JSONB, default=list, nullable=False)
    verification_state = Column(
        Enum(VerificationState),
        default=VerificationState.NEEDS_REVIEW,
        nullable=False,
    )
    last_evaluated_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(String(200), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)
