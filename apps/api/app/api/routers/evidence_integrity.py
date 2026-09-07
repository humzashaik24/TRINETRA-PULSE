"""Evidence integrity + blockchain anchor router (Phase 21).

Mounted at ``/evidence`` alongside the evidence router.

Endpoints:
  GET   /evidence/{evidence_id}/integrity                 derived custody chain + checksum
  GET   /evidence/{evidence_id}/blockchain                anchor + provider + verification state
  POST  /evidence/{evidence_id}/blockchain/anchor         create (idempotent) blockchain anchor
  POST  /evidence/{evidence_id}/blockchain/verify         re-verify integrity on-chain

Actor identity is never accepted from the client; the authenticated context
(CurrentUserDep) supplies it. Auditors are read-only: they may view/verify but
not anchor.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.evidence_integrity import (
    AnchorRequest,
    AnchorResponse,
    EvidenceBlockchainRead,
    EvidenceIntegrityRead,
    VerifyResponse,
)
from app.services.real.evidence_integrity import EvidenceIntegrityService

router = APIRouter()


@router.get("/{evidence_id}/integrity", response_model=EvidenceIntegrityRead)
async def get_evidence_integrity(
    evidence_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> EvidenceIntegrityRead:
    service = EvidenceIntegrityService(session)
    return EvidenceIntegrityRead.model_validate(
        await service.integrity_for(evidence_id)
    )


@router.get("/{evidence_id}/blockchain", response_model=EvidenceBlockchainRead)
async def get_evidence_blockchain(
    evidence_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> EvidenceBlockchainRead:
    service = EvidenceIntegrityService(session)
    return EvidenceBlockchainRead.model_validate(
        await service.blockchain_for(evidence_id)
    )


@router.post("/{evidence_id}/blockchain/anchor", response_model=AnchorResponse)
async def anchor_evidence(
    evidence_id: UUID,
    payload: AnchorRequest | None = None,
    session: SessionDep = None,  # filled by FastAPI dependency
    user: CurrentUserDep = None,  # filled by FastAPI dependency
) -> AnchorResponse:
    """Create a blockchain anchor for the evidence custody state (idempotent)."""
    service = EvidenceIntegrityService(session)
    result = await service.anchor(
        evidence_id,
        actor=user,
        message=(payload.message if payload is not None else None),
    )
    return AnchorResponse.model_validate(result)


@router.post("/{evidence_id}/blockchain/verify", response_model=VerifyResponse)
async def verify_evidence(
    evidence_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> VerifyResponse:
    """Re-verify a previously anchored evidence digest on-chain."""
    service = EvidenceIntegrityService(session)
    return VerifyResponse.model_validate(await service.verify(evidence_id))
