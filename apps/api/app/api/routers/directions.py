"""Investigation-scoped Investigation Direction Intelligence routes (Phase 26).

Read-only: directions are computed on request from persisted investigation
data and are grounded, deterministic and non-mutating.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, SessionDep
from app.api.errors import DirectionNotFoundError
from app.schemas.real.directions import (
    DirectionPriority,
    DirectionsResponse,
    DirectionStatus,
    DirectionType,
    InvestigationDirectionRead,
)
from app.services.real.directions import DirectionIntelligenceService

router = APIRouter()


@router.get("/{investigation_id}/directions", response_model=DirectionsResponse)
async def list_directions(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    direction_type: DirectionType | None = Query(default=None),
    priority: DirectionPriority | None = Query(default=None),
    status: DirectionStatus | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> DirectionsResponse:
    response = await DirectionIntelligenceService(session).list_directions(investigation_id)

    directions = response.directions
    if direction_type is not None:
        directions = [item for item in directions if item.direction_type == direction_type]
    if priority is not None:
        directions = [item for item in directions if item.priority == priority]
    if status is not None:
        directions = [item for item in directions if item.status == status]

    return DirectionsResponse(
        investigation_id=response.investigation_id,
        computed_at=response.computed_at,
        directions=directions[:limit],
    )


@router.get(
    "/{investigation_id}/directions/{direction_id}",
    response_model=InvestigationDirectionRead,
)
async def get_direction(
    investigation_id: UUID,
    direction_id: str,
    session: SessionDep,
    _user: CurrentUserDep,
) -> InvestigationDirectionRead:
    response = await DirectionIntelligenceService(session).list_directions(investigation_id)
    for direction in response.directions:
        if direction.id == direction_id:
            return direction
    raise DirectionNotFoundError(direction_id)
