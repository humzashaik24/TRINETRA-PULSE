"""Entity intelligence pipeline (in-memory).

Mirrors the frontend mock service for Phase 6: candidate review, resolution
management, extraction jobs, and the audit trail. State lives in module-level
stores, matching the existing stub-style API routers.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.schemas.entity_intelligence import (
    AuditEventResponse,
    EntityCandidateResponse,
    EntityResolutionResponse,
    ExtractionJobResponse,
)

# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------

_candidates: dict[str, dict[str, Any]] = {}
_resolutions: dict[str, dict[str, Any]] = {}
_jobs: dict[str, dict[str, Any]] = {}
_audit: list[dict[str, Any]] = []


def _now() -> datetime:
    return datetime.now(UTC)


def _next_id(prefix: str, store: dict[str, dict[str, Any]]) -> str:
    idx = len(store) + 1
    while f"{prefix}-{idx:03d}" in store:
        idx += 1
    return f"{prefix}-{idx:03d}"


def _push_audit(
    *,
    actor: str,
    actor_name: str,
    action: str,
    action_label: str,
    object: str,
    object_type: str,
    object_id: str | None = None,
    reason: str | None = None,
) -> AuditEventResponse:
    event = AuditEventResponse(
        id=f"aud-{len(_audit) + 1:03d}",
        actor=actor,
        actor_name=actor_name,
        action=action,
        action_label=action_label,
        object=object,
        object_type=object_type,
        object_id=object_id,
        reason=reason,
        timestamp=_now(),
    )
    _audit.append(event.model_dump())
    return event


def reset_intelligence() -> None:
    """Clear pipeline stores (used by tests for isolation)."""
    _candidates.clear()
    _resolutions.clear()
    _jobs.clear()
    _audit.clear()


def seed_intelligence() -> None:
    """Seed the in-memory pipeline with a small, consistent dataset."""
    if _candidates:
        return

    base = datetime(2026, 8, 24, 10, 15, tzinfo=UTC)
    reviews = datetime(2026, 8, 25, 9, 30, tzinfo=UTC)

    candidate_rows: list[dict[str, Any]] = [
        {
            "id": "cand-001",
            "entity_type": "person",
            "raw_value": "Rahul Kumar",
            "display_value": "Rahul Kumar",
            "source": "cdr_extract",
            "source_record": "CDR-0042",
            "dataset_id": "ds-002",
            "dataset_name": "CDR Extract - Pune",
            "confidence": 0.97,
            "extraction_method": "database_import",
            "status": "PENDING",
            "resolution_state": None,
            "resolved_entity_id": None,
            "attributes": {"phone": "+91-98765-43210", "city": "Pune"},
            "created_at": base,
            "reviewed_at": None,
            "reviewed_by": None,
        },
        {
            "id": "cand-002",
            "entity_type": "person",
            "raw_value": "R. Kumar",
            "display_value": "R. Kumar",
            "source": "bank_transactions",
            "source_record": "TX-1187",
            "dataset_id": "ds-003",
            "dataset_name": "Bank Transaction Log",
            "confidence": 0.88,
            "extraction_method": "document_parse",
            "status": "PENDING",
            "resolution_state": None,
            "resolved_entity_id": None,
            "attributes": {"account": "ACC-7784", "city": "Pune"},
            "created_at": base,
            "reviewed_at": None,
            "reviewed_by": None,
        },
        {
            "id": "cand-003",
            "entity_type": "phone",
            "raw_value": "+91 98765 43210",
            "display_value": "+91-98765-43210",
            "source": "fir_records",
            "source_record": "FIR-2026-001",
            "dataset_id": "ds-001",
            "dataset_name": "FIR Records",
            "confidence": 0.99,
            "extraction_method": "document_parse",
            "status": "ACCEPTED",
            "resolution_state": "CONFIRMED",
            "resolved_entity_id": "ent-phone-001",
            "attributes": {"msisdn": "+919876543210"},
            "created_at": base,
            "reviewed_at": reviews,
            "reviewed_by": "analyst-kd",
        },
        {
            "id": "cand-004",
            "entity_type": "person",
            "raw_value": "Priya Sharma",
            "display_value": "Priya Sharma",
            "source": "witness_statements",
            "source_record": "WS-007",
            "dataset_id": "ds-005",
            "dataset_name": "Witness Statements",
            "confidence": 0.72,
            "extraction_method": "ai_nlp",
            "status": "PENDING",
            "resolution_state": None,
            "resolved_entity_id": None,
            "attributes": {"city": "Mumbai"},
            "created_at": base,
            "reviewed_at": None,
            "reviewed_by": None,
        },
    ]
    for row in candidate_rows:
        _candidates[row["id"]] = row

    resolution_rows: list[dict[str, Any]] = [
        {
            "id": "res-001",
            "entity_a_id": "cand-001",
            "entity_a_display": "Rahul Kumar",
            "entity_a_type": "person",
            "entity_b_id": "cand-002",
            "entity_b_display": "R. Kumar",
            "entity_b_type": "person",
            "type": "person_match",
            "state": "NEEDS_REVIEW",
            "decision": "REVIEW",
            "confidence": 0.85,
            "reasons": [
                "Same phone attribute +91-98765-43210",
                "Both located in Pune",
                "Initials pattern matches full name",
            ],
            "method": "probabilistic",
            "created_at": base,
            "updated_at": base,
            "reviewed_by": None,
            "reviewed_at": None,
            "review_reason": None,
            "merged_target_id": None,
        },
        {
            "id": "res-002",
            "entity_a_id": "cand-003",
            "entity_a_display": "+91-98765-43210",
            "entity_a_type": "phone",
            "entity_b_id": "ent-phone-001",
            "entity_b_display": "+91-98765-43210",
            "entity_b_type": "phone",
            "type": "phone_exact",
            "state": "CONFIRMED",
            "decision": "MERGE",
            "confidence": 0.99,
            "reasons": ["Exact MSISDN match"],
            "method": "rule_based",
            "created_at": base,
            "updated_at": reviews,
            "reviewed_by": "analyst-kd",
            "reviewed_at": reviews,
            "review_reason": "Exact match on primary number.",
            "merged_target_id": "ent-phone-001",
        },
    ]
    for row in resolution_rows:
        _resolutions[row["id"]] = row

    job_rows: list[dict[str, Any]] = [
        {
            "id": "job-001",
            "dataset_id": "ds-002",
            "dataset_name": "CDR Extract - Pune",
            "status": "COMPLETED",
            "progress": 100,
            "records_processed": 1240,
            "entities_extracted": 86,
            "candidates_created": 23,
            "matches_found": 12,
            "errors": [],
            "warnings": ["3 records skipped - malformed MSISDN"],
            "created_by": "analyst-kd",
            "created_at": datetime(2026, 8, 24, 8, 0, tzinfo=UTC),
            "started_at": datetime(2026, 8, 24, 8, 2, tzinfo=UTC),
            "completed_at": datetime(2026, 8, 24, 8, 14, tzinfo=UTC),
        },
        {
            "id": "job-002",
            "dataset_id": "ds-003",
            "dataset_name": "Bank Transaction Log",
            "status": "RUNNING",
            "progress": 46,
            "records_processed": 482,
            "entities_extracted": 31,
            "candidates_created": 9,
            "matches_found": 4,
            "errors": [],
            "warnings": [],
            "created_by": "analyst-kd",
            "created_at": datetime(2026, 8, 25, 7, 30, tzinfo=UTC),
            "started_at": datetime(2026, 8, 25, 7, 31, tzinfo=UTC),
            "completed_at": None,
        },
    ]
    for row in job_rows:
        _jobs[row["id"]] = row

    _push_audit(
        actor="scheduler",
        actor_name="Scheduler",
        action="EXTRACTION_STARTED",
        action_label="Extraction started",
        object="Bank Transaction Log",
        object_type="extraction_job",
        object_id="job-002",
    )
    _push_audit(
        actor="analyst-kd",
        actor_name="K. Deshmukh",
        action="CANDIDATE_REVIEWED",
        action_label="Candidate reviewed",
        object="+91-98765-43210",
        object_type="candidate",
        object_id="cand-003",
        reason="Decision: accept",
    )


# ---------------------------------------------------------------------------
# Candidates
# ---------------------------------------------------------------------------


def list_candidates(
    *,
    status: str | None = None,
    entity_type: str | None = None,
    resolution_state: str | None = None,
    search: str | None = None,
) -> list[EntityCandidateResponse]:
    seed_intelligence()
    items = list(_candidates.values())
    if status and status != "all":
        items = [c for c in items if c["status"] == status]
    if entity_type and entity_type != "all":
        items = [c for c in items if c["entity_type"] == entity_type]
    if resolution_state and resolution_state != "all":
        items = [c for c in items if c["resolution_state"] == resolution_state]
    if search and search.strip():
        q = search.strip().lower()
        items = [
            c
            for c in items
            if q in c["raw_value"].lower()
            or q in c["display_value"].lower()
            or q in c["source"].lower()
        ]
    return [EntityCandidateResponse(**c) for c in items]


def get_candidate(candidate_id: str) -> EntityCandidateResponse:
    seed_intelligence()
    row = _candidates.get(candidate_id)
    if not row:
        raise KeyError(f"Candidate not found: {candidate_id}")
    return EntityCandidateResponse(**row)


def review_candidate(*, candidate_id: str, decision: str, reviewer: str) -> EntityCandidateResponse:
    seed_intelligence()
    row = _candidates.get(candidate_id)
    if not row:
        raise KeyError(f"Candidate not found: {candidate_id}")
    accepted = decision == "accept"
    row["status"] = "ACCEPTED" if accepted else "REJECTED"
    row["resolution_state"] = "CONFIRMED" if accepted else "REJECTED"
    row["reviewed_at"] = _now()
    row["reviewed_by"] = reviewer
    _push_audit(
        actor=reviewer,
        actor_name=reviewer,
        action="CANDIDATE_REVIEWED",
        action_label="Candidate reviewed",
        object=row["display_value"],
        object_type="candidate",
        object_id=candidate_id,
        reason=f"Decision: {decision}",
    )
    return EntityCandidateResponse(**row)


# ---------------------------------------------------------------------------
# Resolutions
# ---------------------------------------------------------------------------


def list_resolutions() -> list[EntityResolutionResponse]:
    seed_intelligence()
    items = sorted(_resolutions.values(), key=lambda r: r["updated_at"], reverse=True)
    return [EntityResolutionResponse(**r) for r in items]


def get_resolution(resolution_id: str) -> EntityResolutionResponse:
    seed_intelligence()
    row = _resolutions.get(resolution_id)
    if not row:
        raise KeyError(f"Resolution not found: {resolution_id}")
    return EntityResolutionResponse(**row)


def _apply_resolution_decision(
    *,
    resolution_id: str,
    state: str,
    reviewer: str,
    reason: str | None,
) -> EntityResolutionResponse:
    seed_intelligence()
    row = _resolutions.get(resolution_id)
    if not row:
        raise KeyError(f"Resolution not found: {resolution_id}")
    row["state"] = state
    row["reviewed_by"] = reviewer
    row["reviewed_at"] = _now()
    row["review_reason"] = reason
    row["updated_at"] = _now()
    _push_audit(
        actor=reviewer,
        actor_name=reviewer,
        action="ENTITY_RESOLVED" if state == "CONFIRMED" else "ENTITY_REJECTED",
        action_label=("Resolution confirmed" if state == "CONFIRMED" else "Resolution rejected"),
        object=f"{row['entity_a_display']} ↔ {row['entity_b_display']}",
        object_type="resolution",
        object_id=resolution_id,
        reason=reason,
    )
    return EntityResolutionResponse(**row)


def confirm_resolution(
    *, resolution_id: str, reviewer: str, reason: str | None
) -> EntityResolutionResponse:
    return _apply_resolution_decision(
        resolution_id=resolution_id, state="CONFIRMED", reviewer=reviewer, reason=reason
    )


def reject_resolution(
    *, resolution_id: str, reviewer: str, reason: str | None
) -> EntityResolutionResponse:
    return _apply_resolution_decision(
        resolution_id=resolution_id, state="REJECTED", reviewer=reviewer, reason=reason
    )


def merge_resolution(
    *,
    resolution_id: str,
    target_entity_id: str,
    archive_source_profiles: bool,
    reviewer: str,
    reason: str | None,
) -> EntityResolutionResponse:
    """Mark a resolution as merged and record the winning profile target."""
    seed_intelligence()
    row = _resolutions.get(resolution_id)
    if not row:
        raise KeyError(f"Resolution not found: {resolution_id}")
    if row["state"] == "REJECTED":
        raise ValueError("Cannot merge a rejected resolution")
    row["state"] = "CONFIRMED"
    row["decision"] = "MERGE"
    row["merged_target_id"] = target_entity_id
    row["reviewed_by"] = reviewer
    row["reviewed_at"] = _now()
    row["review_reason"] = reason
    row["updated_at"] = _now()
    _push_audit(
        actor=reviewer,
        actor_name=reviewer,
        action="ENTITY_MERGED",
        action_label="Profiles merged",
        object=f"{row['entity_a_display']} → {target_entity_id}",
        object_type="resolution",
        object_id=resolution_id,
        reason=f"archive_source_profiles={archive_source_profiles}" if reason is None else reason,
    )
    return EntityResolutionResponse(**row)


# ---------------------------------------------------------------------------
# Extraction jobs
# ---------------------------------------------------------------------------


def list_extraction_jobs() -> list[ExtractionJobResponse]:
    seed_intelligence()
    items = sorted(_jobs.values(), key=lambda j: j["created_at"], reverse=True)
    return [ExtractionJobResponse(**j) for j in items]


def start_extraction_job(
    *, dataset_id: str, dataset_name: str, created_by: str
) -> ExtractionJobResponse:
    seed_intelligence()
    job = ExtractionJobResponse(
        id=_next_id("job", _jobs),
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        status="QUEUED",
        progress=0,
        records_processed=0,
        entities_extracted=0,
        candidates_created=0,
        matches_found=0,
        errors=[],
        warnings=[],
        created_by=created_by,
        created_at=_now(),
        started_at=None,
        completed_at=None,
    )
    _jobs[job.id] = job.model_dump()
    _push_audit(
        actor=created_by,
        actor_name=created_by,
        action="EXTRACTION_STARTED",
        action_label="Extraction started",
        object=dataset_name,
        object_type="extraction_job",
        object_id=job.id,
    )
    return job


def cancel_extraction_job(*, job_id: str, actor: str) -> ExtractionJobResponse:
    seed_intelligence()
    row = _jobs.get(job_id)
    if not row:
        raise KeyError(f"Job not found: {job_id}")
    row["status"] = "CANCELLED"
    row["updated_at"] = _now()
    _push_audit(
        actor=actor,
        actor_name=actor,
        action="ENTITY_UPDATED",
        action_label="Extraction cancelled",
        object=row["dataset_name"],
        object_type="extraction_job",
        object_id=job_id,
    )
    return ExtractionJobResponse(**row)


# ---------------------------------------------------------------------------
# Audit trail
# ---------------------------------------------------------------------------


def list_audit_events() -> list[AuditEventResponse]:
    seed_intelligence()
    items = sorted(_audit, key=lambda e: e["timestamp"], reverse=True)
    return [AuditEventResponse(**e) for e in items]
