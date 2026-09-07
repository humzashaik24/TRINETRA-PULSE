"""Real findings router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.investigation import FindingCreate, FindingRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{finding_id}", response_model=FindingRead)
async def get_finding(
    finding_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> FindingRead:
    service = InvestigationService(session)
    finding = await service.get_finding(finding_id)
    return FindingRead.model_validate(finding)


@router.post("", response_model=FindingRead, status_code=201)
async def create_finding(
    payload: FindingCreate,
    session: SessionDep,
    _user: CurrentUserDep,
) -> FindingRead:
    service = InvestigationService(session)
    finding = await service.create_finding(payload)
    return FindingRead.model_validate(finding)
