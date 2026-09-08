"""Investigation-scoped persisted entity resolution API (Phase 20)."""

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CanMutateDep, CurrentUserDep, SessionDep
from app.schemas.candidate_resolution import (
    CandidateObservationCreate,
    CandidateObservationRead,
    CandidateResolutionAuditRead,
    CandidateResolutionRead,
    ResolutionDecision,
)
from app.services.candidate_resolution import CandidateResolutionService
from app.models import CandidateResolutionState

router = APIRouter()


@router.get("/{investigation_id}/candidate-observations", response_model=list[CandidateObservationRead])
async def list_observations(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    state: str | None = Query(default=None),
) -> list[CandidateObservationRead]:
    rows = await CandidateResolutionService(session).list_observations(investigation_id, state=state)
    return [CandidateObservationRead.model_validate(row) for row in rows]


@router.post(
    "/{investigation_id}/candidate-observations",
    response_model=CandidateObservationRead,
    status_code=201,
)
async def create_observation(
    investigation_id: UUID,
    payload: CandidateObservationCreate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> CandidateObservationRead:
    if payload.investigation_id != investigation_id:
        from app.api.errors import ConflictError

        raise ConflictError("Payload investigation_id does not match the route.")
    service = CandidateResolutionService(session)
    row = await service.create_observation(**payload.model_dump())
    await service.generate_resolutions(investigation_id, row)
    return CandidateObservationRead.model_validate(row)


@router.get("/{investigation_id}/resolutions", response_model=list[CandidateResolutionRead])
async def list_resolutions(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    state: str | None = Query(default=None),
) -> list[CandidateResolutionRead]:
    rows = await CandidateResolutionService(session).list_resolutions(investigation_id, state=state)
    return [CandidateResolutionRead.model_validate(row) for row in rows]


@router.get("/{investigation_id}/resolutions/{resolution_id}", response_model=CandidateResolutionRead)
async def get_resolution(
    investigation_id: UUID,
    resolution_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> CandidateResolutionRead:
    rows = await CandidateResolutionService(session).list_resolutions(investigation_id)
    row = next((item for item in rows if item.id == resolution_id), None)
    if row is None:
        from app.api.errors import EntityNotFoundError

        raise EntityNotFoundError(str(resolution_id))
    return CandidateResolutionRead.model_validate(row)


async def _decide(
    investigation_id: UUID,
    resolution_id: UUID,
    state: CandidateResolutionState,
    payload: ResolutionDecision,
    session: SessionDep,
    actor: CanMutateDep,
) -> CandidateResolutionRead:
    row = await CandidateResolutionService(session).decide(
        investigation_id,
        resolution_id,
        actor_id=UUID(actor.id),
        actor_email=actor.email,
        decision=state,
        reason=payload.reason,
    )
    return CandidateResolutionRead.model_validate(row)


@router.post("/{investigation_id}/resolutions/{resolution_id}/confirm", response_model=CandidateResolutionRead)
async def confirm_resolution(
    investigation_id: UUID,
    resolution_id: UUID,
    payload: ResolutionDecision,
    session: SessionDep,
    actor: CanMutateDep,
) -> CandidateResolutionRead:
    return await _decide(
        investigation_id, resolution_id, CandidateResolutionState.CONFIRMED, payload, session, actor
    )


@router.post("/{investigation_id}/resolutions/{resolution_id}/reject", response_model=CandidateResolutionRead)
async def reject_resolution(
    investigation_id: UUID,
    resolution_id: UUID,
    payload: ResolutionDecision,
    session: SessionDep,
    actor: CanMutateDep,
) -> CandidateResolutionRead:
    return await _decide(
        investigation_id, resolution_id, CandidateResolutionState.REJECTED, payload, session, actor
    )


@router.get("/{investigation_id}/resolution-audit", response_model=list[CandidateResolutionAuditRead])
async def list_resolution_audit(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> list[CandidateResolutionAuditRead]:
    rows = await CandidateResolutionService(session).list_audit(investigation_id)
    return [CandidateResolutionAuditRead.model_validate(row) for row in rows]
