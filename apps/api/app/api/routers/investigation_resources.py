"""Nested investigation resource listings (real application layer).

Returns the full child collections for a single investigation so a client can
render an investigation workspace (entities + relationships + findings +
evidence + events + notes) in one or few requests.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.repositories.dataset import DatasetRepository, IngestionJobRepository
from app.repositories.investigation import (
    EntityRepository,
    EventRepository,
    EvidenceRepository,
    FindingRepository,
    NoteRepository,
    RelationshipRepository,
)
from app.schemas.real.dataset import DatasetRead, IngestionJobRead
from app.schemas.real.investigation import (
    EntityRead,
    EventRead,
    EvidenceRead,
    FindingRead,
    NoteRead,
    RelationshipRead,
)
from app.services.real.investigation import InvestigationService

router = APIRouter()


async def _require_investigation(session, investigation_id: UUID) -> None:
    await InvestigationService(session).get_required_investigation(investigation_id)


@router.get("/{investigation_id}/entities", response_model=list[EntityRead])
async def list_entities(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> list[EntityRead]:
    await _require_investigation(session, investigation_id)
    items = await EntityRepository(session).list_for_investigation(investigation_id, limit=500)
    return [EntityRead.model_validate(i) for i in items]


@router.get("/{investigation_id}/relationships", response_model=list[RelationshipRead])
async def list_relationships(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> list[RelationshipRead]:
    await _require_investigation(session, investigation_id)
    items = await RelationshipRepository(session).list_for_investigation(
        investigation_id, limit=2000
    )
    return [RelationshipRead.model_validate(i) for i in items]


@router.get("/{investigation_id}/findings", response_model=list[FindingRead])
async def list_findings(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> list[FindingRead]:
    await _require_investigation(session, investigation_id)
    items = await FindingRepository(session).list_for_investigation(investigation_id)
    return [FindingRead.model_validate(i) for i in items]


@router.get("/{investigation_id}/evidence", response_model=list[EvidenceRead])
async def list_evidence(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> list[EvidenceRead]:
    await _require_investigation(session, investigation_id)
    items = await EvidenceRepository(session).list_for_investigation(investigation_id)
    service = InvestigationService(session)
    reads = []
    for item in items:
        read = EvidenceRead.model_validate(item)
        metadata = item.metadata_ or {}
        read.filename = metadata.get("filename")
        read.content_type = metadata.get("content_type")
        read.size = metadata.get("size")
        read.integrity = service.evidence_integrity(item)
        reads.append(read)
    return reads


@router.get("/{investigation_id}/events", response_model=list[EventRead])
async def list_events(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> list[EventRead]:
    await _require_investigation(session, investigation_id)
    items = await EventRepository(session).list_for_investigation(investigation_id)
    return [EventRead.model_validate(i) for i in items]


@router.get("/{investigation_id}/notes", response_model=list[NoteRead])
async def list_notes(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> list[NoteRead]:
    await _require_investigation(session, investigation_id)
    items = await NoteRepository(session).list_for_investigation(investigation_id)
    return [NoteRead.model_validate(i) for i in items]


@router.get("/{investigation_id}/datasets", response_model=list[DatasetRead])
async def list_datasets(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> list[DatasetRead]:
    await _require_investigation(session, investigation_id)
    items = await DatasetRepository(session).list_for_investigation(investigation_id)
    return [DatasetRead.model_validate(i) for i in items]


@router.get("/{investigation_id}/ingestion-jobs", response_model=list[IngestionJobRead])
async def list_ingestion_jobs(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> list[IngestionJobRead]:
    await _require_investigation(session, investigation_id)
    items = await IngestionJobRepository(session).list_for_investigation(investigation_id)
    return [IngestionJobRead.model_validate(i) for i in items]
