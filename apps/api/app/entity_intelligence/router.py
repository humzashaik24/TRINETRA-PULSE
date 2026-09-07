from fastapi import APIRouter, HTTPException, Query

from app.schemas.entity_intelligence import (
    AuditEventResponse,
    CandidateReviewRequest,
    EntityCandidateResponse,
    EntityResolutionResponse,
    ExtractionJobResponse,
    ExtractionStartRequest,
    ResolutionDecisionRequest,
    ResolutionMergeRequest,
)
from app.services import entity_intelligence as service

router = APIRouter()


def _error(e: Exception) -> HTTPException:
    if isinstance(e, KeyError):
        return HTTPException(status_code=404, detail=str(e))
    if isinstance(e, ValueError):
        return HTTPException(status_code=400, detail=str(e))
    return HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# Candidates
# ---------------------------------------------------------------------------


@router.get("/candidates", response_model=list[EntityCandidateResponse])
async def list_candidates(
    status: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    resolution_state: str | None = Query(default=None),
    search: str | None = Query(default=None),
) -> list[EntityCandidateResponse]:
    return service.list_candidates(
        status=status,
        entity_type=entity_type,
        resolution_state=resolution_state,
        search=search,
    )


@router.get("/candidates/{candidate_id}", response_model=EntityCandidateResponse)
async def get_candidate(candidate_id: str) -> EntityCandidateResponse:
    try:
        return service.get_candidate(candidate_id)
    except Exception as e:  # noqa: BLE001 - normalized below
        raise _error(e) from e


@router.post("/candidates/{candidate_id}/review", response_model=EntityCandidateResponse)
async def review_candidate(
    candidate_id: str, payload: CandidateReviewRequest
) -> EntityCandidateResponse:
    try:
        return service.review_candidate(
            candidate_id=candidate_id, decision=payload.decision, reviewer=payload.reviewer
        )
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


# ---------------------------------------------------------------------------
# Resolutions
# ---------------------------------------------------------------------------


@router.get("/resolutions", response_model=list[EntityResolutionResponse])
async def list_resolutions() -> list[EntityResolutionResponse]:
    return service.list_resolutions()


@router.get("/resolutions/{resolution_id}", response_model=EntityResolutionResponse)
async def get_resolution(resolution_id: str) -> EntityResolutionResponse:
    try:
        return service.get_resolution(resolution_id)
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.post("/resolutions/{resolution_id}/confirm", response_model=EntityResolutionResponse)
async def confirm_resolution(
    resolution_id: str, payload: ResolutionDecisionRequest
) -> EntityResolutionResponse:
    try:
        return service.confirm_resolution(
            resolution_id=resolution_id, reviewer=payload.reviewer, reason=payload.reason
        )
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.post("/resolutions/{resolution_id}/reject", response_model=EntityResolutionResponse)
async def reject_resolution(
    resolution_id: str, payload: ResolutionDecisionRequest
) -> EntityResolutionResponse:
    try:
        return service.reject_resolution(
            resolution_id=resolution_id, reviewer=payload.reviewer, reason=payload.reason
        )
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


@router.post("/resolutions/{resolution_id}/merge", response_model=EntityResolutionResponse)
async def merge_resolution(
    resolution_id: str, payload: ResolutionMergeRequest
) -> EntityResolutionResponse:
    try:
        return service.merge_resolution(
            resolution_id=resolution_id,
            target_entity_id=payload.target_entity_id,
            archive_source_profiles=payload.archive_source_profiles,
            reviewer=payload.reviewer,
            reason=payload.reason,
        )
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


# ---------------------------------------------------------------------------
# Extraction jobs
# ---------------------------------------------------------------------------


@router.get("/extraction-jobs", response_model=list[ExtractionJobResponse])
async def list_extraction_jobs() -> list[ExtractionJobResponse]:
    return service.list_extraction_jobs()


@router.post("/extraction-jobs", response_model=ExtractionJobResponse, status_code=201)
async def start_extraction_job(payload: ExtractionStartRequest) -> ExtractionJobResponse:
    return service.start_extraction_job(
        dataset_id=payload.dataset_id,
        dataset_name=payload.dataset_name,
        created_by=payload.created_by,
    )


@router.post("/extraction-jobs/{job_id}/cancel", response_model=ExtractionJobResponse)
async def cancel_extraction_job(job_id: str) -> ExtractionJobResponse:
    try:
        return service.cancel_extraction_job(job_id=job_id, actor="analyst-ops")
    except Exception as e:  # noqa: BLE001
        raise _error(e) from e


# ---------------------------------------------------------------------------
# Audit trail
# ---------------------------------------------------------------------------


@router.get("/audit", response_model=list[AuditEventResponse])
async def list_audit_events() -> list[AuditEventResponse]:
    return service.list_audit_events()
