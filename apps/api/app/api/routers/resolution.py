"""Real entity resolution router (Phase 20).

Mounted at ``/api/v2``.

Endpoints:
  GET    /entities/{entity_id}/resolution
  GET    /investigations/{investigation_id}/resolution-candidates
  POST   /investigations/{investigation_id}/resolution/evaluate
  POST   /entities/{entity_id}/resolution/confirm
  POST   /entities/{entity_id}/resolution/reject

All endpoints require existing JWT/dev-identity authentication (via
CurrentUserDep). Resolution is always investigation-scoped; actor_id is never
accepted from the client — the authenticated actor context is used.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.models import VerificationState
from app.schemas.real.resolution import (
    EntityResolutionRead,
    ResolutionCandidatesRead,
    ResolutionConfirmRequest,
    ResolutionEvaluationResponse,
    ResolutionRejectRequest,
)
from app.services.real.resolution import ResolutionService

router = APIRouter()


async def _service(session) -> ResolutionService:
    return ResolutionService(session)


@router.get("/entities/{entity_id}/resolution", response_model=ResolutionCandidatesRead)
async def get_entity_resolution(
    entity_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> ResolutionCandidatesRead:
    service = await _service(session)
    entity = await service._require_entity(entity_id)
    resolutions = await service.list_for_entity(entity_id, entity.investigation_id)

    decorated = [await service.decorate(r) for r in resolutions]

    return ResolutionCandidatesRead(
        investigation_id=entity.investigation_id,
        entity_id=entity_id,
        candidates=[EntityResolutionRead.model_validate(d) for d in decorated],
        algorithm_version=service._algorithm_version(),
        evaluated_at=service._now(),
    )


@router.get(
    "/investigations/{investigation_id}/resolution-candidates",
    response_model=ResolutionCandidatesRead,
)
async def list_resolution_candidates(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> ResolutionCandidatesRead:
    service = await _service(session)
    resolutions = await service.list_for_investigation(investigation_id)
    decorated = [await service.decorate(r) for r in resolutions]

    return ResolutionCandidatesRead(
        investigation_id=investigation_id,
        entity_id=None,
        candidates=[EntityResolutionRead.model_validate(d) for d in decorated],
        algorithm_version=service._algorithm_version(),
        evaluated_at=service._now(),
    )


@router.post(
    "/investigations/{investigation_id}/resolution/evaluate",
    response_model=ResolutionEvaluationResponse,
)
async def evaluate_resolution(
    investigation_id: UUID,
    session: SessionDep,
    user: CurrentUserDep,
) -> ResolutionEvaluationResponse:
    service = await _service(session)
    result = await service.evaluate_investigation(investigation_id)
    return ResolutionEvaluationResponse.model_validate(
        {
            **result,
            "investigation_id": str(investigation_id),
        }
    )


@router.post(
    "/entities/{entity_id}/resolution/confirm",
    response_model=EntityResolutionRead,
)
async def confirm_resolution(
    entity_id: UUID,
    payload: ResolutionConfirmRequest,
    session: SessionDep,
    user: CurrentUserDep,
) -> EntityResolutionRead:
    """Confirm all pending resolutions involving this entity as a canonical
    identity link. Actor context is taken from the authenticated user, never
    from the client."""
    service = await _service(session)
    entity = await service._require_entity(entity_id)
    resolutions = await service.list_for_entity(entity_id, entity.investigation_id)
    confirmed: EntityResolutionRead | None = None
    for res in resolutions:
        if res.verification_state in (
            VerificationState.NEEDS_REVIEW,
            VerificationState.POSSIBLE,
            VerificationState.PROBABLE,
            VerificationState.AUTO_RESOLVED,
        ):
            confirmed_res = await service.confirm(
                res.id, actor=user, reason=payload.reason
            )
            confirmed = EntityResolutionRead.model_validate(await service.decorate(confirmed_res))
    if confirmed is None:
        from app.api.errors import NotFoundError

        resolutions = await service.list_for_entity(entity_id, entity.investigation_id)
        if not resolutions:
            raise NotFoundError("EntityResolution", str(entity_id))
        based = resolutions[0]
        return EntityResolutionRead.model_validate(await service.decorate(based))
    return confirmed


@router.post(
    "/entities/{entity_id}/resolution/reject",
    response_model=EntityResolutionRead,
)
async def reject_resolution(
    entity_id: UUID,
    payload: ResolutionRejectRequest,
    session: SessionDep,
    user: CurrentUserDep,
) -> EntityResolutionRead:
    """Reject all pending resolutions involving this entity. Actor context is
    taken from the authenticated user, never from the client."""
    service = await _service(session)
    entity = await service._require_entity(entity_id)
    resolutions = await service.list_for_entity(entity_id, entity.investigation_id)
    rejected: EntityResolutionRead | None = None
    for res in resolutions:
        if res.verification_state not in (
            VerificationState.REJECTED,
            VerificationState.CONFIRMED,
        ):
            try:
                rejected_res = await service.reject(
                    res.id, actor=user, reason=payload.reason
                )
                rejected = EntityResolutionRead.model_validate(await service.decorate(rejected_res))
            except Exception:
                continue
    if rejected is None:
        from app.api.errors import NotFoundError

        resolutions = await service.list_for_entity(entity_id, entity.investigation_id)
        if not resolutions:
            raise NotFoundError("EntityResolution", str(entity_id))
        based = resolutions[0]
        return EntityResolutionRead.model_validate(await service.decorate(based))
    return rejected
