"""Real entities router.

Entity detail supports optional investigation scoping: when an
``investigation_id`` is supplied the entity must belong to that investigation,
otherwise a 404 is returned (no cross-investigation existence leak).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CanMutateDep, CurrentUserDep, SessionDep
from app.schemas.real.investigation import EntityCreate, EntityRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{entity_id}", response_model=EntityRead)
async def get_entity(
    entity_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> EntityRead:
    service = InvestigationService(session)
    entity = await service.get_entity_scoped(entity_id, investigation_id)
    return EntityRead.model_validate(entity)


@router.post("", response_model=EntityRead, status_code=201)
async def create_entity(
    payload: EntityCreate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> EntityRead:
    service = InvestigationService(session)
    entity = await service.create_entity(payload)
    return EntityRead.model_validate(entity)
