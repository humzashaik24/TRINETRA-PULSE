"""Pydantic schemas for the Phase 24 multimedia evidence intelligence surface.

Mirrors the persisted ``evidence_understandings`` row as an API read shape and
defines the canonical structured result blocks. Provider output is NEVER passed
to the client raw: it is normalized server-side and re-validated through the
result schemas below (``extra="ignore"`` so unexpected vendor fields are
dropped rather than echoed). Defaults keep a partial payload safe: a missing
optional block becomes an empty list, never ``null``.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.evidence_understanding import AnalysisMediaKind, AnalysisStatus
from app.models.provider import ProviderCapability, ProviderType
from app.schemas.common import SchemaBase, UUIDMixin

_TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}")


def _validate_timestamp(value: str | None) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or not _TIMESTAMP.match(value):
        raise ValueError("timestamp must be a full ISO-8601 timestamp (YYYY-MM-DD...)")
    return value


class AnalysisObservation(BaseModel):
    """A neutral, single-sentence observation from the payload.

    ``text`` is written in the product's neutral vocabulary (observed / appears
    / possible) and is an AI-generated candidate, never a verified fact.
    """

    text: str = Field(..., max_length=2000)

    model_config = ConfigDict(extra="ignore")


class AnalysisEntityObservation(BaseModel):
    """Candidate entity mention surfaced by a model (requires verification)."""

    name: str = Field(..., min_length=1, max_length=500)
    type: str = Field("", max_length=200)
    context: str = Field("", max_length=2000)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)

    model_config = ConfigDict(extra="ignore")


class AnalysisTimestampedObservation(BaseModel):
    """A time-bounded observation in a video/media timeline."""

    start_seconds: float = Field(..., ge=0)
    end_seconds: float = Field(0, ge=0)
    timestamp: str | None = Field(default=None, max_length=64)
    description: str = Field(..., max_length=2000)

    model_config = ConfigDict(extra="ignore")

    @field_validator("end_seconds")
    @classmethod
    def _end_not_less_than_start(
        cls, value: float, info: Any
    ) -> float:
        if info.data.get("start_seconds") is not None and value < info.data["start_seconds"]:
            raise ValueError("end_seconds must be >= start_seconds")
        return value


class AnalysisSegment(BaseModel):
    """One audio transcript segment."""

    start_seconds: float = Field(..., ge=0)
    end_seconds: float = Field(0, ge=0)
    timestamp: str | None = Field(default=None, max_length=64)
    text: str = Field(..., max_length=5000)

    model_config = ConfigDict(extra="ignore")

    @field_validator("end_seconds")
    @classmethod
    def _end_not_less_than_start(
        cls, value: float, info: Any
    ) -> float:
        if info.data.get("start_seconds") is not None and value < info.data["start_seconds"]:
            raise ValueError("end_seconds must be >= start_seconds")
        return value


class ResultBase(BaseModel):
    """Shared canonical result fields for every media kind."""

    summary: str = Field("", max_length=4000)
    observations: list[AnalysisObservation] = Field(default_factory=list)
    entities: list[AnalysisEntityObservation] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class ImageAnalysisResult(ResultBase):
    pass


class VideoAnalysisResult(ResultBase):
    timestamps: list[AnalysisTimestampedObservation] = Field(default_factory=list)


class AudioTranscriptResult(ResultBase):
    transcript: str = Field("", max_length=40000)
    segments: list[AnalysisSegment] = Field(default_factory=list)
    language: str = Field("", max_length=50)
    duration_seconds: float = Field(0, ge=0)


RESULT_MODELS: dict[AnalysisMediaKind, type[ResultBase]] = {
    AnalysisMediaKind.IMAGE: ImageAnalysisResult,
    AnalysisMediaKind.VIDEO: VideoAnalysisResult,
    AnalysisMediaKind.AUDIO: AudioTranscriptResult,
}


class EvidenceUnderstandingRead(SchemaBase, UUIDMixin):
    """Safe read shape for one persisted analysis run."""

    evidence_id: UUID
    investigation_id: UUID
    media_type: AnalysisMediaKind
    capability: ProviderCapability
    provider_type: ProviderType
    provider_name: str
    model: str
    status: AnalysisStatus
    result: dict[str, Any] = Field(default_factory=dict)
    checksum_at_analysis: str
    started_at: datetime
    completed_at: datetime | None = None
    error_code: str | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UUID | None = None
    mode: Literal["MOCK", "EXTERNAL", "LOCAL"]

    model_config = {"from_attributes": True}


# --- Phase 25: local (on-device) transcription submission -----------------
#
# The browser transcribes AUDIO with on-device Whisper and posts the structured
# result back here for server-side validation + persistence. The server NEVER
# trusts the client: it re-derives the media kind, re-verifies the SHA-256
# checksum against ``evidence_integrity.stored_checksum`` (the browser-supplied
# value is treated as advisory metadata only, never as the authority), and
# enforces strict limits on the transcript / segments / metadata so a hostile
# or corrupt client cannot bloat the table or forge timestamps.

_LOCAL_TRANSCRIPT_MAX = 40_000
_LOCAL_SEGMENTS_MAX = 2000
_SECONDS_MAX = 24 * 60 * 60  # 24h upper bound for any single segment bound.
_HEX_64 = re.compile(r"^[0-9a-fA-F]{64}$")


class LocalTranscriptSubmitSegment(BaseModel):
    """One client-submitted transcript segment (canonicalized on submit)."""

    start_seconds: float = Field(..., ge=0, le=_SECONDS_MAX)
    end_seconds: float = Field(..., ge=0, le=_SECONDS_MAX)
    text: str = Field(..., max_length=5000)

    model_config = ConfigDict(extra="ignore")

    @field_validator("end_seconds")
    @classmethod
    def _end_not_less_than_start(
        cls, value: float, info: Any
    ) -> float:
        if info.data.get("start_seconds") is not None and value < info.data["start_seconds"]:
            raise ValueError("end_seconds must be >= start_seconds")
        return value


class LocalTranscriptionSubmit(BaseModel):
    """Strict Pydantic body for ``POST /evidence/{id}/analyses/local-transcription``."""

    mode: Literal["LOCAL"] = "LOCAL"
    checksum: str = Field(..., min_length=64, max_length=64)
    model_id: str = Field(..., min_length=1, max_length=200)
    transcript: str = Field(..., min_length=1, max_length=_LOCAL_TRANSCRIPT_MAX)
    language: str = Field("", max_length=50)
    duration_seconds: float = Field(0, ge=0, le=_SECONDS_MAX)
    segments: list[LocalTranscriptSubmitSegment] = Field(
        default_factory=list, max_length=_LOCAL_SEGMENTS_MAX
    )
    warnings: list[str] = Field(default_factory=list, max_length=20)

    model_config = ConfigDict(extra="ignore")

    @field_validator("checksum")
    @classmethod
    def _checksum_is_hex_64(cls, value: str) -> str:
        if not _HEX_64.match(value):
            raise ValueError("checksum must be a 64-character hexadecimal SHA-256 digest")
        return value.lower()

    @field_validator("warnings")
    @classmethod
    def _warnings_len(cls, value: list[str]) -> list[str]:
        for item in value:
            if len(item) > 2000:
                raise ValueError("each warning must be at most 2000 characters")
        return value


class LocalTranscriptionRead(SchemaBase, UUIDMixin):
    """Read shape for a persisted local (on-device) transcription run."""

    evidence_id: UUID
    investigation_id: UUID
    media_type: AnalysisMediaKind = AnalysisMediaKind.AUDIO
    capability: ProviderCapability = ProviderCapability.TRANSCRIPTION
    provider_type: ProviderType = ProviderType.LOCAL
    provider_name: str = "Whisper"
    model: str
    status: AnalysisStatus
    result: dict[str, Any] = Field(default_factory=dict)
    checksum_at_analysis: str
    started_at: datetime
    completed_at: datetime | None = None
    error_code: str | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UUID | None = None
    mode: Literal["MOCK", "EXTERNAL", "LOCAL"] = "LOCAL"

    model_config = {"from_attributes": True}
