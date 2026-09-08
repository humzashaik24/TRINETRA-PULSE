"""Real notes router.

Note detail supports optional investigation scoping: when an
``investigation_id`` is supplied the item must belong to that investigation,
otherwise a 404 is returned (no cross-investigation existence leak).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CanMutateDep, CurrentUserDep, SessionDep
from app.schemas.real.investigation import NoteCreate, NoteRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{note_id}", response_model=NoteRead)
async def get_note(
    note_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    investigation_id: UUID | None = Query(default=None),
) -> NoteRead:
    service = InvestigationService(session)
    note = await service.get_note_scoped(note_id, investigation_id)
    return NoteRead.model_validate(note)


@router.post("", response_model=NoteRead, status_code=201)
async def create_note(
    payload: NoteCreate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> NoteRead:
    service = InvestigationService(session)
    note = await service.create_note(payload)
    return NoteRead.model_validate(note)
