"""Real evidence router.

Evidence detail supports optional investigation scoping: when an
``investigation_id`` is supplied the item must belong to that investigation,
otherwise a 404 is returned (no cross-investigation existence leak).
"""

from __future__ import annotations

import json
import re
import unicodedata
from contextlib import suppress
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, File, Form, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.api.deps import CanMutateDep, CurrentUserDep, SessionDep
from app.api.errors import (
    EvidenceStorageUnavailableError,
    EvidenceUploadError,
    IntegrityError,
)
from app.core.config import get_settings
from app.evidence_intelligence import EvidenceIntelligenceService, understanding_read
from app.models import (
    AnalysisMediaKind,
    AuthAuditAction,
    DataProvenance,
    EvidenceChainAction,
    ProvenanceSourceType,
    ProviderCapability,
    ProviderType,
)
from app.schemas.real.evidence_chain import (
    EvidenceChainEntryRead,
    EvidenceChainVerifyRead,
)
from app.schemas.real.evidence_understanding import (
    EvidenceUnderstandingRead,
    LocalTranscriptionRead,
    LocalTranscriptionSubmit,
)
from app.schemas.real.investigation import EvidenceCreate, EvidenceRead
from app.services import evidence_integrity
from app.services.evidence_chain import EvidenceChainService, EvidenceChainVerifier
from app.services.real.investigation import InvestigationService
from app.services.security import record_audit_event
from app.storage.evidence_storage import (
    MISMATCH,
    MISSING,
    UNAVAILABLE,
    EvidenceBlob,
    EvidenceStorageError,
)
from app.storage.factory import get_evidence_storage

router = APIRouter()

_DANGEROUS_CONTENT_TYPES = {
    "application/x-msdownload",
    "application/x-sh",
    "application/x-shellscript",
    "text/x-python",
}
_SAFE_FILENAME = re.compile(r"^[^\x00-\x1f\x7f]+$")


def _safe_filename(filename: str | None) -> str:
    value = unicodedata.normalize("NFKC", (filename or "").strip())
    if (
        not value
        or len(value) > 255
        or value in {".", ".."}
        or "/" in value
        or "\\" in value
        or ".." in value
        or not _SAFE_FILENAME.fullmatch(value)
    ):
        raise EvidenceUploadError("Invalid evidence filename")
    return value


async def _read_payload(file: UploadFile, maximum: int) -> bytes:
    if (file.content_type or "").lower() in _DANGEROUS_CONTENT_TYPES:
        raise EvidenceUploadError("Unsupported evidence content type")
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(min(1024 * 1024, maximum + 1 - total))
        if not chunk:
            break
        total += len(chunk)
        if total > maximum:
            raise EvidenceUploadError(
                "Evidence payload exceeds the configured maximum upload size",
                {"max_bytes": maximum},
            )
        chunks.append(chunk)
    if total == 0:
        raise EvidenceUploadError("Evidence payload must not be empty")
    return b"".join(chunks)


def _evidence_read(item, service: InvestigationService) -> EvidenceRead:
    read = EvidenceRead.model_validate(item)
    metadata = item.metadata_ or {}
    read.filename = metadata.get("filename")
    read.content_type = metadata.get("content_type")
    read.size = metadata.get("size")
    read.integrity = service.evidence_integrity(item)
    return read


def _user_id(user) -> UUID | None:
    try:
        return UUID(user.id)
    except (ValueError, TypeError):
        return None


@router.get("/{evidence_id}", response_model=EvidenceRead)
async def get_evidence(
    evidence_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> EvidenceRead:
    service = InvestigationService(session)
    item = await service.get_evidence_scoped(evidence_id, investigation_id)
    return _evidence_read(item, service)


@router.get("/{evidence_id}/integrity", response_model=EvidenceRead)
async def get_evidence_integrity(
    evidence_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> EvidenceRead:
    """Investigation-scoped evidence detail focused on integrity metadata."""
    service = InvestigationService(session)
    item = await service.get_evidence_scoped(evidence_id, investigation_id)
    return _evidence_read(item, service)


@router.post("", response_model=EvidenceRead, status_code=201)
async def create_evidence(
    payload: EvidenceCreate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> EvidenceRead:
    service = InvestigationService(session)
    item = await service.create_evidence(
        payload,
        actor_id=_actor.id,
        actor_email=_actor.email,
    )
    read = _evidence_read(item, service)
    # Phase 18.2 — the genesis custody chain entry is always appended when an
    # evidence item is created through the interactive API; record that fact in
    # the auth audit trail (folded into the request transaction).
    await record_audit_event(
        session,
        action=AuthAuditAction.EVIDENCE_CHAIN_CREATED,
        email=_actor.email,
        user_id=_user_id(_actor),
        details={
            "evidence_id": str(item.id),
            "evidence_type": item.evidence_type,
            "entries": 1,
        },
        commit=False,
    )
    return read


@router.post("/upload", response_model=EvidenceRead, status_code=201)
async def upload_evidence(
    investigation_id: UUID = Form(...),
    file: UploadFile = File(...),
    evidence_type: str = Form("DOCUMENT"),
    title: str | None = Form(None),
    description: str | None = Form(None),
    source: str | None = Form(None),
    metadata: str | None = Form(None),
    session: SessionDep = None,
    actor: CanMutateDep = None,
) -> EvidenceRead:
    """Store an authenticated raw evidence payload and its metadata atomically."""
    filename = _safe_filename(file.filename)
    settings = get_settings()
    payload = await _read_payload(file, settings.evidence_max_upload_bytes)
    try:
        safe_metadata = json.loads(metadata) if metadata else {}
    except json.JSONDecodeError as exc:
        raise EvidenceUploadError("Metadata must be valid JSON") from exc
    if not isinstance(safe_metadata, dict):
        raise EvidenceUploadError("Metadata must be a JSON object")

    service = InvestigationService(session)
    await service.get_required_investigation(investigation_id)
    from app.models import InvestigationEvidence

    item = InvestigationEvidence(
        investigation_id=investigation_id,
        evidence_type=evidence_type.strip().upper()[:100] or "DOCUMENT",
        title=(title or filename).strip()[:500],
        description=description,
        source=source or filename,
        provenance={
            "source": source or filename,
            "filename": filename,
            "actor_id": actor.id,
            "actor_email": actor.email,
        },
        metadata_={
            **safe_metadata,
            "filename": filename,
            "content_type": file.content_type or "application/octet-stream",
            "size": len(payload),
            "uploaded_by": actor.email,
        },
    )
    session.add(item)
    await session.flush()

    checksum = evidence_integrity.compute_payload_checksum(payload)
    blob = EvidenceBlob(
        evidence_id=item.id,
        investigation_id=investigation_id,
        filename=filename,
        content_type=file.content_type or "application/octet-stream",
        data=payload,
        metadata={"checksum": checksum, "uploaded_by": actor.email},
    )
    storage_ref: str | None = None
    try:
        storage = get_evidence_storage()
        storage_ref = storage.save(blob)
        item.storage_ref = storage_ref
        evidence_integrity.attach_payload_checksum(item, checksum)
        item.provenance = {
            **dict(item.provenance or {}),
            "checksum": checksum,
            "storage_ref": storage_ref,
            "investigation_id": str(investigation_id),
        }
        session.add(
            DataProvenance(
                investigation_id=investigation_id,
                source_type=ProvenanceSourceType.DOCUMENT,
                source_name=filename,
                timestamp=datetime.now(UTC),
                extraction_method="authenticated_upload",
                confidence=1.0,
                evidence_refs=[str(item.id)],
                checksum=checksum,
                notes="Raw evidence payload uploaded through the authenticated evidence API.",
                metadata_={
                    "storage_ref": storage_ref,
                    "content_type": file.content_type or "application/octet-stream",
                    "size": len(payload),
                    "actor_id": actor.id,
                },
            )
        )
        await EvidenceChainService(session).append(
            evidence=item,
            action=EvidenceChainAction.EVIDENCE_UPLOADED,
            actor_id=actor.id,
            actor_email=actor.email,
            details={"phase": "18.7", "filename": filename, "storage_ref": storage_ref},
        )
        await record_audit_event(
            session,
            action=AuthAuditAction.EVIDENCE_UPLOADED,
            email=actor.email,
            user_id=_user_id(actor),
            details={"evidence_id": str(item.id), "investigation_id": str(investigation_id)},
            commit=False,
        )
        await session.commit()
    except EvidenceStorageError as exc:
        await session.rollback()
        if storage_ref:
            with suppress(EvidenceStorageError):
                storage.delete(item.id, investigation_id, storage_ref)
        raise EvidenceStorageUnavailableError("Evidence payload storage failed") from exc
    except Exception as exc:
        await session.rollback()
        if storage_ref:
            with suppress(EvidenceStorageError):
                storage.delete(item.id, investigation_id, storage_ref)
        raise EvidenceUploadError(
            "Evidence upload could not be completed",
            {"compensation": "storage cleanup attempted"},
        ) from exc

    await session.refresh(item)
    return _evidence_read(item, service)


@router.get("/{evidence_id}/download")
async def download_evidence(
    evidence_id: UUID,
    session: SessionDep,
    actor: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
):
    service = InvestigationService(session)
    item = await service.get_evidence_scoped(evidence_id, investigation_id)
    checksum = evidence_integrity.stored_checksum(item)
    status = evidence_integrity.storage_status(item)
    if status == MISMATCH:
        raise IntegrityError("Evidence payload integrity mismatch")
    if status == MISSING:
        raise EvidenceUploadError("Evidence payload is missing")
    if status == UNAVAILABLE:
        raise EvidenceStorageUnavailableError("Evidence storage is unavailable")
    if not checksum or status != "VALID":
        raise IntegrityError("Evidence payload could not be verified")
    try:
        blob = get_evidence_storage().load(
            item.id,
            item.investigation_id,
            item.storage_ref,
        )
    except EvidenceStorageError as exc:
        raise EvidenceStorageUnavailableError("Evidence payload is unavailable") from exc
    await EvidenceChainService(session).append(
        evidence=item,
        action=EvidenceChainAction.EVIDENCE_ACCESSED,
        actor_id=actor.id,
        actor_email=actor.email,
        details={"phase": "18.7", "storage_status": status},
    )
    await record_audit_event(
        session,
        action=AuthAuditAction.EVIDENCE_ACCESSED,
        email=actor.email,
        user_id=_user_id(actor),
        details={"evidence_id": str(item.id), "investigation_id": str(item.investigation_id)},
        commit=False,
    )
    await session.commit()
    filename = (item.metadata_ or {}).get("filename") or blob.filename
    safe_name = _safe_filename(str(filename))
    return StreamingResponse(
        iter([blob.data]),
        media_type=(item.metadata_ or {}).get("content_type") or blob.content_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


# ---------------------------------------------------------------------------
# Phase 18.2 — evidence chain-of-custody
# ---------------------------------------------------------------------------


@router.get("/{evidence_id}/chain", response_model=list[EvidenceChainEntryRead])
async def get_evidence_chain(
    evidence_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> list[EvidenceChainEntryRead]:
    """Read the full custody chain for an evidence item (read-only)."""
    service = InvestigationService(session)
    item = await service.get_evidence_scoped(evidence_id, investigation_id)
    entries = await EvidenceChainService(session).list_chain(item.id)
    return [EvidenceChainEntryRead.model_validate(e) for e in entries]


@router.get("/{evidence_id}/chain/verify", response_model=EvidenceChainVerifyRead)
async def verify_evidence_chain_read(
    evidence_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> EvidenceChainVerifyRead:
    """Verify the custody chain without recording an audit event.

    A pure read: any authenticated user (including the auditor) may verify the
    integrity of an evidence chain without touching the audit trail.
    """
    service = InvestigationService(session)
    item = await service.get_evidence_scoped(evidence_id, investigation_id)
    result = await EvidenceChainVerifier(session).verify(item)
    return EvidenceChainVerifyRead(
        status=result["status"],
        valid=result["valid"],
        entries=result["entries"],
        verified_events=result.get("verified_events", 0),
        first_event_at=result.get("first_event_at"),
        last_event_at=result.get("last_event_at"),
        chain_head_hash=result.get("chain_head_hash"),
        failures=result.get("failures", []),
        reason=result.get("reason"),
        verified_at=datetime.now(UTC),
    )


@router.post("/{evidence_id}/chain/verify", response_model=EvidenceChainVerifyRead)
async def verify_evidence_chain(
    evidence_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> EvidenceChainVerifyRead:
    """Verify the custody chain and record the outcome in the audit trail.

    The audit action is ``evidence_chain_verified`` on success and
    ``evidence_chain_verify_failed`` when the chain is tampered/broken/missing.
    """
    service = InvestigationService(session)
    item = await service.get_evidence_scoped(evidence_id, investigation_id)
    result = await EvidenceChainVerifier(session).verify(item)
    verified_at = datetime.now(UTC)
    ok = bool(result["valid"])
    await record_audit_event(
        session,
        action=(
            AuthAuditAction.EVIDENCE_CHAIN_VERIFIED
            if ok
            else AuthAuditAction.EVIDENCE_CHAIN_VERIFY_FAILED
        ),
        email=_user.email,
        user_id=_user_id(_user),
        details={
            "evidence_id": str(item.id),
            "status": result["status"],
            "entries": result["entries"],
            "reason": result.get("reason"),
        },
        commit=False,
    )
    return EvidenceChainVerifyRead(
        status=result["status"],
        valid=ok,
        entries=result["entries"],
        verified_events=result.get("verified_events", 0),
        first_event_at=result.get("first_event_at"),
        last_event_at=result.get("last_event_at"),
        chain_head_hash=result.get("chain_head_hash"),
        failures=result.get("failures", []),
        reason=result.get("reason"),
        verified_at=verified_at,
    )


# ---------------------------------------------------------------------------
# Phase 24 — multimedia evidence intelligence
# ---------------------------------------------------------------------------


@router.get("/{evidence_id}/analyses", response_model=list[EvidenceUnderstandingRead])
async def list_evidence_analyses(
    evidence_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> list[EvidenceUnderstandingRead]:
    """List the persisted AI analyses for an evidence item (newest first).

    A pure read: any authenticated user may list analyses without touching the
    audit trail. Missing or cross-investigation evidence returns 404.
    """
    service = InvestigationService(session)
    item = await service.get_evidence_scoped(evidence_id, investigation_id)
    rows = await EvidenceIntelligenceService(session).list_for_evidence(item.id)
    return [understanding_read(row) for row in rows]


@router.post("/{evidence_id}/analyze", response_model=EvidenceUnderstandingRead, status_code=201)
async def analyze_evidence(
    evidence_id: UUID,
    session: SessionDep,
    actor: CanMutateDep,
    investigation_id: UUID | None = Query(default=None),
) -> EvidenceUnderstandingRead:
    """Run a server-side AI analysis over a multimedia evidence payload.

    The payload is loaded and SHA-256 verified server-side; a fresh submission
    is never trusted. Provider credentials never reach the browser and media /
    transcripts never enter audit details or logs.
    """
    service = InvestigationService(session)
    item = await service.get_evidence_scoped(evidence_id, investigation_id)
    analysis = await EvidenceIntelligenceService(session).analyze(evidence=item, actor=actor)
    return understanding_read(analysis)


# ---------------------------------------------------------------------------
# Phase 25 — local (in-browser) transcription
# ---------------------------------------------------------------------------


@router.post(
    "/{evidence_id}/analyses/local-transcription",
    response_model=LocalTranscriptionRead,
    status_code=201,
)
async def submit_local_transcription(
    evidence_id: UUID,
    payload: LocalTranscriptionSubmit,
    session: SessionDep,
    actor: CanMutateDep,
    investigation_id: UUID | None = Query(default=None),
) -> LocalTranscriptionRead:
    """Persist a locally (on-device) transcribed evidence result.

    The evidence is scoped to the investigation (404 if absent or isolated).
    The server re-verifies the payload checksum against its stored authority
    (never trusting the browser-supplied checksum), restricts to AUDIO, applies
    strict transcript / segment limits, appends custody + audit records, and
    persists an immutable ``EvidenceUnderstanding`` row with
    ``provider_type=LOCAL``. Returns 201 on success.
    """
    service = InvestigationService(session)
    item = await service.get_evidence_scoped(evidence_id, investigation_id)
    analysis = await EvidenceIntelligenceService(session).persist_local_transcription(
        evidence=item,
        actor=actor,
        payload=payload,
    )
    return LocalTranscriptionRead(
        id=analysis.id,
        evidence_id=analysis.evidence_id,
        investigation_id=analysis.investigation_id,
        media_type=AnalysisMediaKind.AUDIO,
        capability=ProviderCapability.TRANSCRIPTION,
        provider_type=ProviderType.LOCAL,
        provider_name="Whisper",
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
        mode="LOCAL",
    )
