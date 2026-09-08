"""Real investigation CRUD + summary + detail router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CanMutateDep, CurrentUserDep, SessionDep, SupervisorDep
from app.schemas.common import PaginatedResponse
from app.schemas.real.investigation import (
    InvestigationCreate,
    InvestigationRead,
    InvestigationUpdate,
)
from app.schemas.real.summary import InvestigationSummary
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.post("", response_model=InvestigationRead, status_code=201)
async def create_investigation(
    payload: InvestigationCreate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> InvestigationRead:
    service = InvestigationService(session)
    investigation = await service.create(payload)
    return InvestigationRead.model_validate(investigation)


@router.get("", response_model=PaginatedResponse[InvestigationRead])
async def list_investigations(
    session: SessionDep,
    _user: CurrentUserDep,
    page: int = 1,
    page_size: int = 20,
):
    service = InvestigationService(session)
    items, total = await service.list(page=page, page_size=page_size)
    return PaginatedResponse[InvestigationRead](
        items=[InvestigationRead.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{investigation_id}", response_model=InvestigationRead)
async def get_investigation(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> InvestigationRead:
    service = InvestigationService(session)
    investigation = await service.get_required_investigation(investigation_id)
    return InvestigationRead.model_validate(investigation)


@router.patch("/{investigation_id}", response_model=InvestigationRead)
async def update_investigation(
    investigation_id: UUID,
    payload: InvestigationUpdate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> InvestigationRead:
    service = InvestigationService(session)
    investigation = await service.update(investigation_id, payload)
    return InvestigationRead.model_validate(investigation)


@router.delete("/{investigation_id}", status_code=204)
async def delete_investigation(
    investigation_id: UUID,
    session: SessionDep,
    _actor: SupervisorDep,
) -> None:
    service = InvestigationService(session)
    await service.delete(investigation_id)


@router.get("/{investigation_id}/summary", response_model=InvestigationSummary)
async def investigation_summary(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> InvestigationSummary:
    service = InvestigationService(session)
    return await service.summary(investigation_id)
