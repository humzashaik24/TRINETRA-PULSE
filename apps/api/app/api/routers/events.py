"""Real events router.

Event detail supports optional investigation scoping: when an
``investigation_id`` is supplied the item must belong to that investigation,
otherwise a 404 is returned (no cross-investigation existence leak).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.investigation import EventRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{event_id}", response_model=EventRead)
async def get_event(
    event_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> EventRead:
    service = InvestigationService(session)
    item = await service.get_event_scoped(event_id, investigation_id)
    return EventRead.model_validate(item)
