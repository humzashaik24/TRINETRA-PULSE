"""Real relationships router.

Relationship detail supports optional investigation scoping: when an
``investigation_id`` is supplied the item must belong to that investigation,
otherwise a 404 is returned (no cross-investigation existence leak).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.investigation import RelationshipRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{relationship_id}", response_model=RelationshipRead)
async def get_relationship(
    relationship_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> RelationshipRead:
    service = InvestigationService(session)
    relationship = await service.get_relationship_scoped(relationship_id, investigation_id)
    return RelationshipRead.model_validate(relationship)
