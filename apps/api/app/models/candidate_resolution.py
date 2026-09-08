"""Persisted, investigation-scoped entity resolution records (Phase 20)."""

from __future__ import annotations

import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Float, String, Text, UniqueConstraint

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class CandidateObservationState(enum.StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CONTRADICTED = "contradicted"


class CandidateResolutionState(enum.StrEnum):
    """Investigation-scoped resolution state.

    Neutral vocabulary describing identification confidence.
    Does NOT mean guilt, criminality, or threat.
    """

    NEEDS_REVIEW = "needs_review"
    AUTO_RESOLVED = "auto_resolved"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    CONTRADICTED = "contradicted"


class ResolutionConfidenceLevel(enum.StrEnum):
    """Bounded, explainable confidence classification.

    A linkage score is a *linkage confidence* between two records — the
    likelihood that they refer to the same observed entity. It is NOT a
    probability of criminality.
    """

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ResolutionTier(enum.StrEnum):
    """Tier used to derive the linkage score."""

    TIER_1_STRONG_IDENTIFIER = "tier_1_strong_identifier"
    TIER_2_MULTI_ATTRIBUTE = "tier_2_multi_attribute"
    TIER_3_NAME_SIMILARITY = "tier_3_name_similarity"
    NONE = "none"


class MatchFeatureType(enum.StrEnum):
    """Discrete, explainable match feature codes used by the resolver."""

    PHONE_EXACT = "phone_exact"
    EMAIL_EXACT = "email_exact"
    IDENTIFIER_EXACT = "identifier_exact"
    VEHICLE_EXACT = "vehicle_exact"
    ACCOUNT_EXACT = "account_exact"
    NAME_EXACT = "name_exact"
    NAME_SIMILARITY = "name_similarity"
    ADDRESS_SIMILARITY = "address_similarity"
    DATE_OF_BIRTH_MATCH = "date_of_birth_match"
    SHARED_SOURCE_IDENTIFIER = "shared_source_identifier"
    ALIAS_MATCH = "alias_match"


class CandidateObservation(BaseModel):
    """An immutable raw extraction observation, retaining its source value."""

    __tablename__ = "candidate_observations"
    __table_args__ = (
        UniqueConstraint("investigation_id", "observation_key", name="uq_candidate_observation_key"),
    )

    investigation_id = Column(
        Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dataset_id = Column(Uuid, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True)
    ingestion_job_id = Column(
        Uuid, ForeignKey("ingestion_jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    entity_type = Column(String(64), nullable=False, index=True)
    raw_value = Column(Text, nullable=False)
    display_value = Column(String(500), nullable=False)
    normalized_value = Column(String(500), nullable=False, index=True)
    block_key = Column(String(600), nullable=False, index=True)
    source = Column(String(500), nullable=False)
    source_record = Column(String(500), nullable=False)
    row_identity = Column(String(256), nullable=False, index=True)
    observation_key = Column(String(128), nullable=False)
    attributes = Column(JSONB, default=dict, nullable=False)
    provenance = Column(JSONB, default=dict, nullable=False)
    features = Column(JSONB, default=dict, nullable=False)
    algorithm_version = Column(String(32), nullable=False)
    state = Column(
        Enum(CandidateObservationState, native_enum=False, length=32),
        default=CandidateObservationState.PENDING,
        nullable=False,
        index=True,
    )
    resolved_entity_id = Column(
        Uuid, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reviewed_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_reason = Column(Text, nullable=True)


class CandidateResolution(BaseModel):
    """An explainable comparison between an observation and another target."""

    __tablename__ = "candidate_resolutions"
    __table_args__ = (
        UniqueConstraint(
            "investigation_id",
            "candidate_observation_id",
            "matched_observation_id",
            "matched_entity_id",
            name="uq_candidate_resolution_pair",
        ),
    )

    investigation_id = Column(
        Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_observation_id = Column(
        Uuid, ForeignKey("candidate_observations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    matched_observation_id = Column(
        Uuid, ForeignKey("candidate_observations.id", ondelete="CASCADE"), nullable=True, index=True
    )
    matched_entity_id = Column(
        Uuid, ForeignKey("entities.id", ondelete="CASCADE"), nullable=True, index=True
    )
    entity_type = Column(String(64), nullable=False)
    resolution_type = Column(String(64), nullable=False)
    tier = Column(String(64), nullable=False, default="none")
    state = Column(
        Enum(CandidateResolutionState, native_enum=False, length=32),
        default=CandidateResolutionState.NEEDS_REVIEW,
        nullable=False,
        index=True,
    )
    decision = Column(String(32), nullable=False, default="review")
    confidence = Column(Float, nullable=False, default=0.0)
    confidence_level = Column(String(16), nullable=False, default="low")
    features = Column(JSONB, default=dict, nullable=False)
    reasons = Column(JSONB, default=list, nullable=False)
    contradictions = Column(JSONB, default=list, nullable=False)
    provenance = Column(JSONB, default=dict, nullable=False)
    algorithm_version = Column(String(32), nullable=False)
    reviewed_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_reason = Column(Text, nullable=True)
    merged_target_id = Column(Uuid, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)


class CandidateResolutionAudit(BaseModel):
    """Append-only audit record for candidate and resolution decisions."""

    __tablename__ = "candidate_resolution_audit"

    investigation_id = Column(
        Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    observation_id = Column(
        Uuid, ForeignKey("candidate_observations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    resolution_id = Column(
        Uuid, ForeignKey("candidate_resolutions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    actor_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_email = Column(String(320), nullable=False)
    action = Column(String(64), nullable=False, index=True)
    object_type = Column(String(64), nullable=False)
    object_id = Column(String(128), nullable=False)
    reason = Column(Text, nullable=True)
    details = Column(JSONB, default=dict, nullable=False)
