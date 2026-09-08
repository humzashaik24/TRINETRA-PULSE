"""Typed contracts for investigation-scoped suspicious pattern detection."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import SchemaBase


class PatternType(StrEnum):
    CIRCULAR_FUND_FLOW = "CIRCULAR_FUND_FLOW"
    BURNER_SIM = "BURNER_SIM"
    NETWORK_HUB = "NETWORK_HUB"
    BRIDGE_ENTITY = "BRIDGE_ENTITY"
    RAPID_RELATIONSHIP_EXPANSION = "RAPID_RELATIONSHIP_EXPANSION"


class PatternSeverity(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PatternDetectionResult(SchemaBase):
    id: str
    investigation_id: UUID
    pattern_type: PatternType
    severity: PatternSeverity
    confidence: float = Field(ge=0.0, le=1.0)
    title: str
    description: str
    entity_ids: list[UUID] = Field(default_factory=list)
    relationship_ids: list[UUID] = Field(default_factory=list)
    evidence_ids: list[UUID] = Field(default_factory=list)
    event_ids: list[UUID] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    detected_at: datetime


class PatternDetectionResponse(SchemaBase):
    investigation_id: UUID
    patterns: list[PatternDetectionResult] = Field(default_factory=list)
