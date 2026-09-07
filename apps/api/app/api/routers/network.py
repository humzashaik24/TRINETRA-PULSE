"""Real network graph and analytics router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.real.summary import AnalyticsOverview, NetworkGraph
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
