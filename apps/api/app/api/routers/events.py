"""Real events router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.investigation import EventRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{event_id}", response_model=EventRead)
async def get_event(
    event_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> EventRead:
    service = InvestigationService(session)
    item = await service.get_event(event_id)
    return EventRead.model_validate(item)
