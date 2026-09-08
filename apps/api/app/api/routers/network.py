"""Real network graph and analytics router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.summary import AnalyticsOverview, NetworkGraph, ShortestPathResponse
from app.services.real.network import NetworkService

router = APIRouter()


@router.get("/{investigation_id}/graph", response_model=NetworkGraph)
async def get_graph(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> NetworkGraph:
    service = NetworkService(session)
    return await service.graph(investigation_id)


@router.get("/{investigation_id}/analytics", response_model=AnalyticsOverview)
async def get_analytics(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> AnalyticsOverview:
    service = NetworkService(session)
    return await service.analytics(investigation_id)


@router.get("/{investigation_id}/path", response_model=ShortestPathResponse)
async def get_shortest_path(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    source_entity_id: UUID | None = Query(
        None, description="Persisted source entity in this investigation"
    ),
    target_entity_id: UUID | None = Query(
        None, description="Persisted target entity in this investigation"
    ),
    start_entity_id: UUID | None = Query(None),
    end_entity_id: UUID | None = Query(None),
) -> ShortestPathResponse:
    """Return a deterministic shortest path within one investigation graph."""
    source = source_entity_id or start_entity_id
    target = target_entity_id or end_entity_id
    if source is None or target is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail=(
                "source_entity_id/target_entity_id or "
                "start_entity_id/end_entity_id are required"
            ),
        )
    return await NetworkService(session).shortest_path(
        investigation_id, source, target
    )


@router.get("/{investigation_id}/shortest-path", response_model=ShortestPathResponse)
async def get_shortest_path_alias(
    investigation_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
    source_entity_id: UUID | None = Query(None),
    target_entity_id: UUID | None = Query(None),
    start_entity_id: UUID | None = Query(None),
    end_entity_id: UUID | None = Query(None),
) -> ShortestPathResponse:
    """Compatibility alias for callers using the descriptive route name."""
    source = source_entity_id or start_entity_id
    target = target_entity_id or end_entity_id
    if source is None or target is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail=(
                "source_entity_id/target_entity_id or "
                "start_entity_id/end_entity_id are required"
            ),
        )
    return await NetworkService(session).shortest_path(
        investigation_id, source, target
    )
