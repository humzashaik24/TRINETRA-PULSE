"""Phase 24 — multimedia evidence intelligence orchestration.

Implements the mandated 10-step flow for ``POST /evidence/{id}/analyze``:

1. authenticate            — router dependency
2. authorize               — router dependency (``CanMutateDep``)
3. retrieve metadata       — evidence row loaded via the scoped service
4. retrieve payload        — server-side object-storage load (never the browser)
5. verify SHA-256          — recomputed against the stored checksum
6. audit                   — requested/started/completed/failed events
7. select provider         — deterministic ``ProviderRegistry.resolve(capability)``
8. analyze                 — capability call (mock / openai / gemini / openrouter)
9. persist                 — immutable ``EvidenceUnderstanding`` row
10. return                 — safe Pydantic read shape

Guarantees:

- media kind + MIME-mismatch rejection happens BEFORE any provider call;
- an integrity failure NEVER reaches a provider (safe 409, audited);
- provider credentials, raw vendor bodies, full transcripts and media contents
  are never written to audit events or error details;
- mock fallback is NOT silent: with no explicitly enabled mock provider the
  analysis reports ``PROVIDER_NOT_CONFIGURED`` instead of pretending success.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import (
    AnalysisFailedError,
    EvidenceIntegrityError,
    ProviderAuthenticationFailedError,
    ProviderNotConfiguredError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    UnsupportedAudioFormatError,
    UnsupportedMediaError,
)
from app.core.config import get_settings
from app.evidence_intelligence.clients import execute_capability_call
from app.models import (
    AnalysisMediaKind,
    AnalysisStatus,
    AuthAuditAction,
    EvidenceChainAction,
    EvidenceUnderstanding,
    InvestigationEvidence,
    ProviderCapability,
    ProviderType,
)
from app.provider_management.registry import ProviderRegistry
from app.schemas.real.evidence_understanding import (
    RESULT_MODELS,
    AudioTranscriptResult,
    EvidenceUnderstandingRead,
    LocalTranscriptionSubmit,
)
from app.services import evidence_integrity
from app.services.evidence_chain import EvidenceChainService
from app.services.security import record_audit_event
from app.storage.evidence_storage import MISMATCH, MISSING, UNAVAILABLE, EvidenceStorageError
from app.storage.factory import get_evidence_storage

# Media kind -> capability mapping (mandated Phase 24 routing).
KIND_CAPABILITY: dict[AnalysisMediaKind, ProviderCapability] = {
    AnalysisMediaKind.IMAGE: ProviderCapability.VISION,
    AnalysisMediaKind.VIDEO: ProviderCapability.VIDEO,
    AnalysisMediaKind.AUDIO: ProviderCapability.TRANSCRIPTION,
}

# Explicit MIME allowlists per media kind (declared evidence type vs payload).
IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
AUDIO_CONTENT_TYPES = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm"}
VIDEO_CONTENT_TYPES = {"video/mp4", "video/webm", "video/quicktime"}

MEDIA_CONTENT_TYPES: dict[AnalysisMediaKind, set[str]] = {
    AnalysisMediaKind.IMAGE: IMAGE_CONTENT_TYPES,
    AnalysisMediaKind.AUDIO: AUDIO_CONTENT_TYPES,
    AnalysisMediaKind.VIDEO: VIDEO_CONTENT_TYPES,
}

_DECLARED_TO_KIND = {
    "IMAGE": AnalysisMediaKind.IMAGE,
    "VIDEO": AnalysisMediaKind.VIDEO,
    "AUDIO": AnalysisMediaKind.AUDIO,
}

_PROVIDER_ERRORS = (
    ProviderAuthenticationFailedError,
    ProviderUnavailableError,
    ProviderTimeoutError,
    AnalysisFailedError,
)


def derive_media_kind(evidence: InvestigationEvidence) -> AnalysisMediaKind:
    """Resolve the media channel from declared type + payload MIME (or 415).

    The declared ``evidence_type`` wins when it names a media kind, but a
    payload MIME outside that kind's allowlist is rejected (MIME-spoofing
    guard). Metadata-only media (declared kind, no content type yet) passes
    through here and is caught by the payload-integrity step.
    """
    declared = (evidence.evidence_type or "").strip().upper()
    content_type = str((evidence.metadata_ or {}).get("content_type") or "").lower()

    if declared in _DECLARED_TO_KIND:
        kind = _DECLARED_TO_KIND[declared]
        if content_type and content_type not in MEDIA_CONTENT_TYPES[kind]:
            raise UnsupportedMediaError(
                "The declared evidence type does not match the payload media type",
                {"media_type": kind.value, "content_type": content_type},
            )
        return kind

    if content_type in IMAGE_CONTENT_TYPES:
        return AnalysisMediaKind.IMAGE
    if content_type in AUDIO_CONTENT_TYPES:
        return AnalysisMediaKind.AUDIO
    if content_type in VIDEO_CONTENT_TYPES:
        return AnalysisMediaKind.VIDEO

    raise UnsupportedMediaError(
        "The evidence payload is not analyzable multimedia media",
        {"evidence_type": declared, "content_type": content_type},
    )


def _actor_id(actor: object) -> UUID | None:
    value = getattr(actor, "id", None)
    if not value:
        return None
    try:
        return UUID(str(value))
    except ValueError:
        return None


def understanding_read(analysis: EvidenceUnderstanding) -> EvidenceUnderstandingRead:
    return EvidenceUnderstandingRead(
        id=analysis.id,
        evidence_id=analysis.evidence_id,
        investigation_id=analysis.investigation_id,
        media_type=analysis.media_type,
        capability=analysis.capability,
        provider_type=analysis.provider_type,
        provider_name=analysis.provider_name,
        model=analysis.model,
        status=analysis.status,
        result=dict(analysis.result_json or {}),
        checksum_at_analysis=analysis.checksum_at_analysis,
        started_at=analysis.started_at,
        completed_at=analysis.completed_at,
        error_code=analysis.error_code,
        created_at=analysis.created_at,
        updated_at=analysis.updated_at,
        created_by=analysis.created_by,
        mode=(
            "MOCK"
            if analysis.provider_type == ProviderType.MOCK
            else "LOCAL"
            if analysis.provider_type == ProviderType.LOCAL
            else "EXTERNAL"
        ),
    )


async def _audit(
    session: AsyncSession,
    *,
    action: AuthAuditAction,
    actor: object,
    details: dict[str, Any],
) -> None:
    # Mirrors ``record_audit_event`` conventions. Never carries media contents,
    # transcripts or provider credentials.
    await record_audit_event(
        session,
        action=action,
        email=getattr(actor, "email", "") or "",
        user_id=_actor_id(actor),
        details=details,
        commit=False,
    )


class EvidenceIntelligenceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self._registry = ProviderRegistry(session)

    async def list_for_evidence(self, evidence_id: UUID) -> list[EvidenceUnderstanding]:
        stmt = (
            select(EvidenceUnderstanding)
            .where(EvidenceUnderstanding.evidence_id == evidence_id)
            .order_by(
                EvidenceUnderstanding.started_at.desc(),
                EvidenceUnderstanding.id.desc(),
            )
        )
        return list((await self.session.execute(stmt)).scalars())

    async def analyze(
        self,
        *,
        evidence: InvestigationEvidence,
        actor: object,
    ) -> EvidenceUnderstanding:
        """Run one analysis over ``evidence`` and persist an immutable row."""
        common = {
            "evidence_id": str(evidence.id),
            "investigation_id": str(evidence.investigation_id),
        }

        # 3-4. Media kind + capability derivation.
        kind = derive_media_kind(evidence)
        capability = KIND_CAPABILITY[kind]

        await _audit(
            self.session,
            action=AuthAuditAction.EVIDENCE_ANALYSIS_REQUESTED,
            actor=actor,
            details={**common, "media_type": kind.value, "capability": capability.value},
        )

        # 5-6. Payload retrieval + SHA-256 verification (never trust the client).
        checksum = evidence_integrity.stored_checksum(evidence)
        storage_status = evidence_integrity.storage_status(evidence)
        payload: bytes | None = None
        if storage_status == MISMATCH or (storage_status == "VALID" and not checksum):
            await self._fail_integrity(evidence, actor, "mismatch", common)
            raise EvidenceIntegrityError(details={"reason": "mismatch"})
        if storage_status in (MISSING, UNAVAILABLE) or checksum is None or not evidence.storage_ref:
            await self._fail_integrity(evidence, actor, "payload_unavailable", common)
            raise EvidenceIntegrityError(details={"reason": "payload_unavailable"})
        try:
            blob = get_evidence_storage().load(
                evidence.id, evidence.investigation_id, evidence.storage_ref
            )
        except EvidenceStorageError as exc:
            await self._fail_integrity(evidence, actor, "payload_unavailable", common)
            raise EvidenceIntegrityError(details={"reason": "payload_unavailable"}) from exc
        payload = blob.data
        if blob.checksum != checksum:
            await self._fail_integrity(evidence, actor, "mismatch", common)
            raise EvidenceIntegrityError(details={"reason": "mismatch"})

        maximum = get_settings().evidence_max_upload_bytes
        if len(payload) > maximum:
            await self._fail_integrity(evidence, actor, "payload_oversized", common)
            raise EvidenceIntegrityError(
                details={"reason": "payload exceeds the configured analysis limit"}
            )

        # Custody: record that this evidence payload was read for analysis.
        await EvidenceChainService(self.session).append(
            evidence=evidence,
            action=EvidenceChainAction.EVIDENCE_ACCESSED,
            actor_id=_actor_id(actor),
            actor_email=getattr(actor, "email", "") or None,
            details={"phase": "24", "operation": "ai_analysis", "capability": capability.value},
        )

        # 7. Deterministic provider selection per capability.
        binding = await self._registry.resolve(capability)
        if binding.is_mock:
            rows = await self._registry.list_for_capability(capability)
            explicit_mock = any(
                p.enabled and p.provider_type == ProviderType.MOCK for p in rows
            )
            if not explicit_mock:
                # Registry fell back to the built-in mock because nothing was
                # configured or enabled — never silently "succeed".
                raise ProviderNotConfiguredError(
                    details={"capability": capability.value, "resolved_provider": "mock"},
                )

        await _audit(
            self.session,
            action=AuthAuditAction.EVIDENCE_ANALYSIS_STARTED,
            actor=actor,
            details={
                **common,
                "capability": capability.value,
                "provider_name": binding.provider_name,
                "model": binding.model,
                "mode": "MOCK" if binding.is_mock else "EXTERNAL",
            },
        )

        # 8. Analyze.
        content_type = str(
            (evidence.metadata_ or {}).get("content_type") or "application/octet-stream"
        )
        started_at = datetime.now(UTC)
        error: Exception | None = None
        result: dict[str, Any] = {}
        try:
            canonical = await execute_capability_call(binding, kind, payload, content_type)
            validated = RESULT_MODELS[kind].model_validate(canonical)
            result = validated.model_dump()
        except ValidationError:
            error = AnalysisFailedError(details={"reason": "result_validation_failed"})
        except _PROVIDER_ERRORS as exc:
            error = exc

        # 9. Persist the immutable outcome (success or failure).
        if error is None:
            analysis = EvidenceUnderstanding(
                evidence_id=evidence.id,
                investigation_id=evidence.investigation_id,
                media_type=kind,
                capability=capability,
                provider_type=binding.provider_type,
                provider_name=binding.provider_name,
                model=binding.model,
                status=AnalysisStatus.SUCCEEDED,
                result_json=result,
                checksum_at_analysis=checksum,
                started_at=started_at,
                completed_at=datetime.now(UTC),
                error_code=None,
                created_by=_actor_id(actor),
            )
            self.session.add(analysis)
            await _audit(
                self.session,
                action=AuthAuditAction.EVIDENCE_ANALYSIS_COMPLETED,
                actor=actor,
                details={
                    **common,
                    "capability": capability.value,
                    "provider_name": binding.provider_name,
                },
            )
            await self.session.flush()
            return analysis

        analysis = EvidenceUnderstanding(
            evidence_id=evidence.id,
            investigation_id=evidence.investigation_id,
            media_type=kind,
            capability=capability,
            provider_type=binding.provider_type,
            provider_name=binding.provider_name,
            model=binding.model,
            status=AnalysisStatus.FAILED,
            result_json={},
            checksum_at_analysis=checksum,
            started_at=started_at,
            completed_at=datetime.now(UTC),
            error_code=getattr(error, "code", "ANALYSIS_FAILED"),
            created_by=_actor_id(actor),
        )
        self.session.add(analysis)
        await _audit(
            self.session,
            action=AuthAuditAction.EVIDENCE_ANALYSIS_FAILED,
            actor=actor,
            details={**common, "error_code": getattr(error, "code", "ANALYSIS_FAILED")},
        )
        # Commit the immutable FAILED row before re-raising so the analysis
        # history stays complete even though the request itself fails (the
        # session dependency rolls back on unhandled exceptions otherwise).
        await self.session.commit()
        raise error

    async def _fail_integrity(
        self,
        evidence: InvestigationEvidence,
        actor: object,
        reason: str,
        common: dict[str, str],
    ) -> None:
        await _audit(
            self.session,
            action=AuthAuditAction.EVIDENCE_ANALYSIS_INTEGRITY_FAIL,
            actor=actor,
            details={**common, "reason": reason},
        )
        await self.session.flush()

    async def persist_local_transcription(
        self,
        *,
        evidence: InvestigationEvidence,
        actor: object,
        payload: LocalTranscriptionSubmit,
    ) -> EvidenceUnderstanding:
        """Validate + persist a local (in-browser) Whisper transcription (Phase 25).

        The browser transcribes the audio on-device and posts the structured
        result back here. The server remains authoritative:

        - media is restricted to AUDIO (via ``derive_media_kind``); anything
          else raises ``UnsupportedAudioFormatError`` (415);
        - the SHA-256 checksum is re-verified against the server's stored
          checksum; the client-supplied value is treated as advisory metadata
          only and any mismatch is a 409 integrity failure (never trusted);
        - the transcript / segments pass strict schema limits already, plus a
          canonicalization pass (timestamps normalised, bounds clamped);
        - the outcome is persisted as an immutable ``EvidenceUnderstanding``
          row with ``provider_type=LOCAL`` and audited; failures are committed
          before re-raising so history stays complete.

        ``result_json`` carries PROVENANCE (`provider_name="Whisper"`,
        `mode="LOCAL"`, `model_id`) alongside the canonical transcript so
        consumers can tell local from server-transcribed output. Audit events
        never carry the full transcript or segments.
        """
        common = {
            "evidence_id": str(evidence.id),
            "investigation_id": str(evidence.investigation_id),
        }

        # 1. AUDIO-only restriction.
        kind = derive_media_kind(evidence)
        if kind != AnalysisMediaKind.AUDIO:
            await _audit(
                self.session,
                action=AuthAuditAction.LOCAL_TRANSCRIPTION_FAILED,
                actor=actor,
                details={
                    **common,
                    "reason": "unsupported_media_kind",
                    "media_type": kind.value,
                },
            )
            await self.session.commit()
            raise UnsupportedAudioFormatError(
                details={
                    "reason": "local transcription requires AUDIO evidence",
                    "media_type": kind.value,
                }
            )

        await _audit(
            self.session,
            action=AuthAuditAction.LOCAL_TRANSCRIPTION_REQUESTED,
            actor=actor,
            details={**common, "media_type": kind.value},
        )

        # 2. Server-authority checksum re-verification.
        checksum = evidence_integrity.stored_checksum(evidence)
        storage_status = evidence_integrity.storage_status(evidence)
        if (
            storage_status != "VALID"
            or not checksum
            or not evidence.storage_ref
            or payload.checksum != checksum
        ):
            await _audit(
                self.session,
                action=AuthAuditAction.LOCAL_TRANSCRIPTION_FAILED,
                actor=actor,
                details={**common, "reason": "checksum_mismatch"},
            )
            await self.session.commit()
            raise EvidenceIntegrityError(details={"reason": "checksum_mismatch"})

        await _audit(
            self.session,
            action=AuthAuditAction.LOCAL_TRANSCRIPTION_STARTED,
            actor=actor,
            details={
                **common,
                "provider_type": ProviderType.LOCAL.value,
                "model_id": payload.model_id,
            },
        )

        # 3. Custody record that the audio payload was accessed for local
        #    transcription (reused Phase 18.2 chain-of-custody action).
        await EvidenceChainService(self.session).append(
            evidence=evidence,
            action=EvidenceChainAction.EVIDENCE_ACCESSED,
            actor_id=_actor_id(actor),
            actor_email=getattr(actor, "email", "") or None,
            details={
                "phase": "25",
                "operation": "local_transcription",
                "mode": "LOCAL",
            },
        )

        # 4. Canonicalize into the shared AudioTranscriptResult shape.
        result = AudioTranscriptResult(
            transcript=payload.transcript,
            language=payload.language,
            duration_seconds=payload.duration_seconds,
            warnings=list(payload.warnings),
            segments=[
                {
                    "start_seconds": s.start_seconds,
                    "end_seconds": s.end_seconds,
                    "text": s.text,
                }
                for s in payload.segments
            ],
            # provenance surfaced to consumers without leaking anything secret.
        )
        canonical = result.model_dump()
        canonical["provider_name"] = "Whisper"
        canonical["mode"] = "LOCAL"
        canonical["model_id"] = payload.model_id

        started_at = datetime.now(UTC)
        analysis = EvidenceUnderstanding(
            evidence_id=evidence.id,
            investigation_id=evidence.investigation_id,
            media_type=AnalysisMediaKind.AUDIO,
            capability=ProviderCapability.TRANSCRIPTION,
            provider_type=ProviderType.LOCAL,
            provider_name="Whisper",
            model=payload.model_id,
            status=AnalysisStatus.SUCCEEDED,
            result_json=canonical,
            checksum_at_analysis=checksum,
            started_at=started_at,
            completed_at=datetime.now(UTC),
            error_code=None,
            created_by=_actor_id(actor),
        )
        self.session.add(analysis)
        await _audit(
            self.session,
            action=AuthAuditAction.LOCAL_TRANSCRIPTION_COMPLETED,
            actor=actor,
            details={**common, "provider_name": "Whisper"},
        )
        await self.session.flush()
        return analysis
