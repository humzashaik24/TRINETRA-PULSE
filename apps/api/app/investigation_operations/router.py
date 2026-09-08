"""Phase 11 — Investigation operations router.

Case lifecycle & intelligence operations endpoints scoped per
investigation: pipeline / readiness / health / review queue / activity
log / saved views / graph & timeline bookmarks / cross-references /
provenance / investigation-scoped search.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.schemas.investigation_operations import (
    CrossReference,
    GraphBookmark,
    InvestigationActivityLog,
    InvestigationHealth,
    InvestigationPipeline,
    InvestigationReadiness,
    InvestigationSearchKind,
    ProvenanceChain,
    ReviewItem,
    SavedInvestigationView,
    SaveGraphBookmarkRequest,
    SaveTimelineBookmarkRequest,
    SaveViewRequest,
    SearchAcrossResult,
    TimelineBookmark,
)
from app.services import investigation_operations as service

router = APIRouter()


def _error(e: Exception) -> HTTPException:
    if isinstance(e, KeyError):
        return HTTPException(status_code=404, detail=str(e))
    if isinstance(e, ValueError):
        return HTTPException(status_code=400, detail=str(e))
    return HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# Pipeline / readiness / health
# ---------------------------------------------------------------------------


@router.get("/{investigation_id}/pipeline", response_model=InvestigationPipeline)
async def get_pipeline(investigation_id: str) -> InvestigationPipeline:
    try:
        return service.get_pipeline(investigation_id)
    except Exception as e:  # noqa: BLE001 - normalized below
        raise _error(e) from e


@router.get("/{investigation_id}/readiness", response_model=InvestigationReadiness)
async def get_readiness(investigation_id: str) -> InvestigationReadiness:
    try:
        return service.get_readiness(investigation_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.get("/{investigation_id}/health", response_model=InvestigationHealth)
async def get_health(investigation_id: str) -> InvestigationHealth:
    try:
        return service.get_health(investigation_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


# ---------------------------------------------------------------------------
# Review queue
# ---------------------------------------------------------------------------


@router.get("/{investigation_id}/review-queue", response_model=list[ReviewItem])
async def list_review_queue(
    investigation_id: str,
    resolved: bool | None = Query(default=None),
) -> list[ReviewItem]:
    try:
        return service.get_review_queue(investigation_id, resolved=resolved)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


# ---------------------------------------------------------------------------
# Activity log
# ---------------------------------------------------------------------------


@router.get("/{investigation_id}/activity", response_model=list[InvestigationActivityLog])
async def list_activity(investigation_id: str) -> list[InvestigationActivityLog]:
    try:
        return service.get_activity(investigation_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


# ---------------------------------------------------------------------------
# Saved views
# ---------------------------------------------------------------------------


@router.get("/{investigation_id}/saved-views", response_model=list[SavedInvestigationView])
async def list_saved_views(
    investigation_id: str,
) -> list[SavedInvestigationView]:
    try:
        return service.list_saved_views(investigation_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.post(
    "/{investigation_id}/saved-views", response_model=SavedInvestigationView, status_code=201
)
async def create_saved_view(
    investigation_id: str, payload: SaveViewRequest
) -> SavedInvestigationView:
    try:
        return service.create_saved_view(investigation_id, payload.model_dump())
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.delete("/{investigation_id}/saved-views/{view_id}", status_code=204)
async def delete_saved_view(investigation_id: str, view_id: str) -> None:
    try:
        service.delete_saved_view(investigation_id, view_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


# ---------------------------------------------------------------------------
# Graph bookmarks
# ---------------------------------------------------------------------------


@router.get("/{investigation_id}/graph-bookmarks", response_model=list[GraphBookmark])
async def list_graph_bookmarks(investigation_id: str) -> list[GraphBookmark]:
    try:
        return service.list_graph_bookmarks(investigation_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.post("/{investigation_id}/graph-bookmarks", response_model=GraphBookmark, status_code=201)
async def create_graph_bookmark(
    investigation_id: str, payload: SaveGraphBookmarkRequest
) -> GraphBookmark:
    try:
        return service.create_graph_bookmark(investigation_id, payload.model_dump())
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.delete("/{investigation_id}/graph-bookmarks/{bookmark_id}", status_code=204)
async def delete_graph_bookmark(investigation_id: str, bookmark_id: str) -> None:
    try:
        service.delete_graph_bookmark(investigation_id, bookmark_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


# ---------------------------------------------------------------------------
# Timeline bookmarks
# ---------------------------------------------------------------------------


@router.get("/{investigation_id}/timeline-bookmarks", response_model=list[TimelineBookmark])
async def list_timeline_bookmarks(investigation_id: str) -> list[TimelineBookmark]:
    try:
        return service.list_timeline_bookmarks(investigation_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.post(
    "/{investigation_id}/timeline-bookmarks", response_model=TimelineBookmark, status_code=201
)
async def create_timeline_bookmark(
    investigation_id: str, payload: SaveTimelineBookmarkRequest
) -> TimelineBookmark:
    try:
        return service.create_timeline_bookmark(investigation_id, payload.model_dump())
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.delete("/{investigation_id}/timeline-bookmarks/{bookmark_id}", status_code=204)
async def delete_timeline_bookmark(investigation_id: str, bookmark_id: str) -> None:
    try:
        service.delete_timeline_bookmark(investigation_id, bookmark_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


# ---------------------------------------------------------------------------
# Cross references & provenance
# ---------------------------------------------------------------------------


@router.get("/{investigation_id}/cross-references", response_model=list[CrossReference])
async def list_cross_references(
    investigation_id: str,
    entity_id: str | None = Query(default=None),
) -> list[CrossReference]:
    try:
        return service.list_cross_references(investigation_id, entity_id=entity_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.get("/{investigation_id}/provenance", response_model=list[ProvenanceChain])
async def list_provenance(
    investigation_id: str,
    target_id: str | None = Query(default=None),
) -> list[ProvenanceChain]:
    try:
        return service.list_provenance(investigation_id, target_id=target_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


# ---------------------------------------------------------------------------
# Investigation-scoped search
# ---------------------------------------------------------------------------


@router.get("/{investigation_id}/search", response_model=SearchAcrossResult)
async def search_within(
    investigation_id: str,
    q: str = Query(default=""),
) -> SearchAcrossResult:
    try:
        results = service.search_investigation(investigation_id, q)
        return SearchAcrossResult(results=results)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.get("/search", response_model=SearchAcrossResult)
async def search_all(
    q: str = Query(default=""),
    kind: Annotated[InvestigationSearchKind | None, Query()] = None,
) -> SearchAcrossResult:
    results = service.search_across(q, kind=kind)
    return SearchAcrossResult(results=results)
