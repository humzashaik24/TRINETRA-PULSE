"""Real evidence router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.investigation import EvidenceCreate, EvidenceRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{evidence_id}", response_model=EvidenceRead)
async def get_evidence(
    evidence_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> EvidenceRead:
    service = InvestigationService(session)
    item = await service.get_evidence(evidence_id)
    return EvidenceRead.model_validate(item)


@router.post("", response_model=EvidenceRead, status_code=201)
async def create_evidence(
    payload: EvidenceCreate,
    session: SessionDep,
    _user: CurrentUserDep,
) -> EvidenceRead:
    service = InvestigationService(session)
    item = await service.create_evidence(payload)
    return EvidenceRead.model_validate(item)
