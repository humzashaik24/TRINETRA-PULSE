"""Real entities router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.investigation import EntityCreate, EntityRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{entity_id}", response_model=EntityRead)
async def get_entity(
    entity_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> EntityRead:
    service = InvestigationService(session)
    entity = await service.get_entity(entity_id)
    return EntityRead.model_validate(entity)


@router.post("", response_model=EntityRead, status_code=201)
async def create_entity(
    payload: EntityCreate,
    session: SessionDep,
    _user: CurrentUserDep,
) -> EntityRead:
    service = InvestigationService(session)
    entity = await service.create_entity(payload)
    return EntityRead.model_validate(entity)
