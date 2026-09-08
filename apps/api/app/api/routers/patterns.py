"""Investigation-scoped suspicious pattern detection routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.patterns import PatternDetectionResponse
from app.services.real.patterns import PatternDetectionService

router = APIRouter()


@router.get("/{investigation_id}/patterns", response_model=PatternDetectionResponse)
async def get_patterns(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> PatternDetectionResponse:
    return await PatternDetectionService(session).detect(investigation_id)
