"""Typed contracts for Investigation Direction Intelligence (Phase 26).

Directions are analytical leads computed on request from *persisted*
investigation data. They are grounded, deterministic and read-only: they
never establish guilt or criminal intent, never invent evidence or
relationships, and never modify investigation data. ``confidence`` is the
confidence that the recorded data supports the suggested next step, clamped
to ``[0.0, 1.0]``.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import SchemaBase


class DirectionType(StrEnum):
    """Kinds of grounded next-step leads the engine can produce."""

    UNRESOLVED_CONNECTION = "unresolved_connection"
    HIGH_CONNECTIVITY_ENTITY = "high_connectivity_entity"
    BRIDGE_ENTITY = "bridge_entity"
    SUSPICIOUS_PATTERN = "suspicious_pattern"
    EVIDENCE_GAP = "evidence_gap"
    TIMELINE_GAP = "timeline_gap"
    RELATIONSHIP_VERIFICATION = "relationship_verification"
    ENTITY_RESOLUTION = "entity_resolution"
    FOLLOW_UP_EVIDENCE = "follow_up_evidence"


class DirectionPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DirectionStatus(StrEnum):
    """Lifecycle of a direction on the analyst's side.

    Directions are generated fresh on every request with ``status == "new"``
    (the platform is read-only; nothing is persisted). Persisting analyst
    decisions (reviewing / dismissed / acted_on) is a deliberate, separate
    migration step — this contract is deliberately future-proof.
    """

    NEW = "new"
    REVIEWING = "reviewing"
    DISMISSED = "dismissed"
    ACTED_ON = "acted_on"


class SupportingFactType(StrEnum):
    """Stable machine-readable codes for each supporting fact."""

    DEGREE_OBSERVED = "degree_observed"
    ARTICULATION_POINT = "articulation_point"
    UNRESOLVED_PAIR = "unresolved_pair"
    SHARED_EVIDENCE = "shared_evidence"
    PATTERN_DETECTED = "pattern_detected"
    RELATIONSHIP_WITHOUT_EVIDENCE = "relationship_without_evidence"
    VERIFICATION_PENDING = "verification_pending"
    RESOLUTION_PENDING = "resolution_pending"
    TIMESTAMP_MISSING = "timestamp_missing"
    TIMELINE_GAP = "timeline_gap"
    DANGLING_EVIDENCE_REFERENCE = "dangling_evidence_reference"


class SupportingFact(SchemaBase):
    """One observable, already-persisted fact backing a direction.

    At least one link (``entity_id`` / ``relationship_id`` / ``evidence_id``)
    is populated whenever there is a real object to reference; ``value`` holds
    the measured magnitude (a count, a number of days, a pattern code).
    """

    fact_type: SupportingFactType
    description: str
    entity_id: UUID | None = None
    relationship_id: UUID | None = None
    evidence_id: UUID | None = None
    value: Any = None


class InvestigationDirectionRead(SchemaBase):
    id: str
    investigation_id: UUID
    direction_type: DirectionType
    title: str
    summary: str
    priority: DirectionPriority
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str
    supporting_facts: list[SupportingFact] = Field(default_factory=list)
    related_entity_ids: list[UUID] = Field(default_factory=list)
    related_relationship_ids: list[UUID] = Field(default_factory=list)
    related_evidence_ids: list[UUID] = Field(default_factory=list)
    status: DirectionStatus
    created_at: datetime


class DirectionsResponse(SchemaBase):
    investigation_id: UUID
    computed_at: datetime
    directions: list[InvestigationDirectionRead] = Field(default_factory=list)
