"""Real notes router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.investigation import NoteCreate, NoteRead
from app.services.real.investigation import InvestigationService

router = APIRouter()


@router.get("/{note_id}", response_model=NoteRead)
async def get_note(
    note_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> NoteRead:
    service = InvestigationService(session)
    note = await service.get_note(note_id)
    return NoteRead.model_validate(note)


@router.post("", response_model=NoteRead, status_code=201)
async def create_note(
    payload: NoteCreate,
    session: SessionDep,
    _user: CurrentUserDep,
) -> NoteRead:
    service = InvestigationService(session)
    note = await service.create_note(payload)
    return NoteRead.model_validate(note)
