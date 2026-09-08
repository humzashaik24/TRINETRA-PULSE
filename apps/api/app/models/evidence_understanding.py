"""Persisted AI analysis of multimedia evidence (Phase 24).

Every completed or failed analysis of an IMAGE / VIDEO / AUDIO evidence item is
stored here as an immutable snapshots: the media kind + provider binding used,
the outcome ``status``, the structured ``result_json`` (validated canonical
result, never raw vendor output), and the evidence SHA-256 at analysis time so
any later verification can prove the analyzed bytes were the stored bytes.

Design guarantees:

- one row per analysis run — rerunning an analysis appends a new row (arriving
  history), it never overwrites a previous result;
- ``result_json`` holds only Pydantic-validated, neutral-language content; the
  raw provider payload is never persisted and never logged;
- ``checksum_at_analysis`` pins the analysis to a specific payload so a
  ``MISMATCH`` later cannot claim the current bytes were the analyzed ones;
- audio/video transcripts and full media contents are never stored here (the
  canonical payload stays in object storage behind the custody chain).
"""

from __future__ import annotations

import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import relationship

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel
from app.models.provider import ProviderCapability, ProviderType


class AnalysisMediaKind(enum.StrEnum):
    """The multimedia channel being analyzed."""

    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"


class AnalysisStatus(enum.StrEnum):
    """Outcome of one analysis run."""

    SUCCEEDED = "succeeded"
    FAILED = "failed"


class EvidenceUnderstanding(BaseModel):
    """One server-side AI analysis run over a multimedia evidence payload."""

    __tablename__ = "evidence_understandings"

    evidence_id = Column(
        Uuid,
        ForeignKey("evidence.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Denormalized investigation scope so analyses follow their investigation
    # (consistent with the custody-chain model) and never leak across cases.
    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    media_type = Column(
        Enum(AnalysisMediaKind, name="analysis_media_kind", native_enum=False, length=32),
        nullable=False,
    )
    capability = Column(
        Enum(
            ProviderCapability,
            name="provider_capability",
            native_enum=False,
            length=32,
        ),
        nullable=False,
    )
    provider_type = Column(
        Enum(ProviderType, name="provider_type", native_enum=False, length=32),
        nullable=False,
    )
    provider_name = Column(String(120), nullable=False)
    model = Column(String(200), nullable=False)
    status = Column(
        Enum(AnalysisStatus, name="analysis_status", native_enum=False, length=32),
        nullable=False,
    )
    result_json = Column(JSONB, default=dict, nullable=False)
    # SHA-256 of the analyzed payload at analysis time (reproducibility).
    checksum_at_analysis = Column(String(64), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    # Safe machine-readable failure code when status == FAILED.
    error_code = Column(String(100), nullable=True)
    created_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    evidence = relationship("InvestigationEvidence", back_populates="understandings")
