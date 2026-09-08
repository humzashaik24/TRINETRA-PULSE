"""Real findings router.

Finding detail supports optional investigation scoping: when an
``investigation_id`` is supplied the item must belong to that investigation,
otherwise a 404 is returned (no cross-investigation existence leak).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CanMutateDep, CurrentUserDep, SessionDep
from app.schemas.real.investigation import FindingCreate, FindingRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{finding_id}", response_model=FindingRead)
async def get_finding(
    finding_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> FindingRead:
    service = InvestigationService(session)
    finding = await service.get_finding_scoped(finding_id, investigation_id)
    return FindingRead.model_validate(finding)


@router.post("", response_model=FindingRead, status_code=201)
async def create_finding(
    payload: FindingCreate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> FindingRead:
    service = InvestigationService(session)
    finding = await service.create_finding(payload)
    return FindingRead.model_validate(finding)
