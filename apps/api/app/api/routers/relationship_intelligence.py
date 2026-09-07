"""Real relationship intelligence router (Phase 21).

Mounted at ``/api/v2`` (no prefix).

Endpoints:
  GET    /relationships/{relationship_id}/intelligence
  GET    /relationships/{relationship_id}/observations
  GET    /relationships/{relationship_id}/evidence
  POST   /relationships/{relationship_id}/confirm
  POST   /relationships/{relationship_id}/reject
  POST   /investigations/{investigation_id}/relationships/evaluate
  GET    /investigations/{investigation_id}/relationships/intelligence

All endpoints require the existing auth (via CurrentUserDep). Actor identity is
never accepted from the client — the authenticated context is used. Evaluation
and listing are always investigation-scoped.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.relationship_intelligence import (
    RelationshipConfirmRequest,
    RelationshipEvaluationResponse,
    RelationshipEvidenceSupportRead,
    RelationshipIntelligenceListRead,
    RelationshipIntelligenceRead,
    RelationshipObservationsRead,
    RelationshipRejectRequest,
)
from app.services.real.relationship_intelligence import (
    RelationshipIntelligenceService,
)

router = APIRouter()


async def _service(session) -> RelationshipIntelligenceService:
    return RelationshipIntelligenceService(session)


@router.get(
    "/relationships/{relationship_id}/intelligence",
    response_model=RelationshipIntelligenceRead,
)
async def get_relationship_intelligence(
    relationship_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> RelationshipIntelligenceRead:
    service = await _service(session)
    return RelationshipIntelligenceRead.model_validate(
        await service.intelligence_for(relationship_id)
    )


@router.get(
    "/relationships/{relationship_id}/observations",
    response_model=RelationshipObservationsRead,
)
async def get_relationship_observations(
    relationship_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> RelationshipObservationsRead:
    service = await _service(session)
    intelligence = await service.intelligence_for(relationship_id)
    return RelationshipObservationsRead(
        relationship_id=relationship_id,
        investigation_id=intelligence["investigation_id"],
        observations=intelligence["observations"],
        algorithm_version=service._algorithm_version(),
        evaluated_at=service._now(),
    )


@router.get(
    "/relationships/{relationship_id}/evidence",
    response_model=RelationshipEvidenceSupportRead,
)
async def get_relationship_evidence(
    relationship_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> RelationshipEvidenceSupportRead:
    service = await _service(session)
    return RelationshipEvidenceSupportRead.model_validate(
        await service.evidence_for(relationship_id)
    )


@router.get(
    "/investigations/{investigation_id}/relationships/intelligence",
    response_model=RelationshipIntelligenceListRead,
)
async def list_relationship_intelligence(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> RelationshipIntelligenceListRead:
    service = await _service(session)
    items = await service.list_for_investigation(investigation_id)
    return RelationshipIntelligenceListRead(
        investigation_id=investigation_id,
        items=items,
        algorithm_version=service._algorithm_version(),
        evaluated_at=service._now(),
    )


@router.post(
    "/investigations/{investigation_id}/relationships/evaluate",
    response_model=RelationshipEvaluationResponse,
)
async def evaluate_relationship_intelligence(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> RelationshipEvaluationResponse:
    service = await _service(session)
    result = await service.evaluate_investigation(investigation_id)
    return RelationshipEvaluationResponse.model_validate(result)


@router.post(
    "/relationships/{relationship_id}/confirm",
    response_model=RelationshipIntelligenceRead,
)
async def confirm_relationship(
    relationship_id: UUID,
    payload: RelationshipConfirmRequest,
    session: SessionDep,
    user: CurrentUserDep,
) -> RelationshipIntelligenceRead:
    """Confirm a relationship. Actor context is taken from the authenticated
    user, never from the client."""
    service = await _service(session)
    return RelationshipIntelligenceRead.model_validate(
        await service.confirm(
            relationship_id, actor=user, reason=payload.reason
        )
    )


@router.post(
    "/relationships/{relationship_id}/reject",
    response_model=RelationshipIntelligenceRead,
)
async def reject_relationship(
    relationship_id: UUID,
    payload: RelationshipRejectRequest,
    session: SessionDep,
    user: CurrentUserDep,
) -> RelationshipIntelligenceRead:
    """Reject a relationship. Actor context is taken from the authenticated
    user, never from the client."""
    service = await _service(session)
    return RelationshipIntelligenceRead.model_validate(
        await service.reject(relationship_id, actor=user, reason=payload.reason)
    )
