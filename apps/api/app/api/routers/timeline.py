"""Real timeline router (merged chronological feed for an investigation)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.summary import TimelineResponse
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{investigation_id}", response_model=TimelineResponse)
async def get_timeline(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> TimelineResponse:
    service = InvestigationService(session)
    entries = await service.timeline(investigation_id)
    return TimelineResponse(
        investigation_id=investigation_id, entries=entries
    )
