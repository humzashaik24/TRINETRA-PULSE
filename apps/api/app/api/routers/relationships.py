"""Real relationships router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.investigation import RelationshipRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{relationship_id}", response_model=RelationshipRead)
async def get_relationship(
    relationship_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> RelationshipRead:
    service = InvestigationService(session)
    relationship = await service.get_relationship(relationship_id)
    return RelationshipRead.model_validate(relationship)
