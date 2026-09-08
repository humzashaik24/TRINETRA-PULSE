from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter

from app.schemas.case import (
    CaseCreate,
    CaseResponse,
    EvidenceCreate,
    EvidenceResponse,
    IncidentCreate,
    IncidentResponse,
)

router = APIRouter()

_cases_store: dict[str, dict] = {}
_incidents_store: dict[str, dict] = {}
_evidence_store: dict[str, dict] = {}


@router.post("/", response_model=CaseResponse, status_code=201)
async def create_case(payload: CaseCreate):
    case_id = uuid4()
    now = datetime.now(UTC)
    case = {
        "id": case_id,
        "title": payload.title,
        "description": payload.description,
        "case_number": payload.case_number,
        "status": "open",
        "priority": payload.priority,
        "lead_investigator": payload.lead_investigator,
        "assigned_team": payload.assigned_team,
        "tags": payload.tags,
        "created_at": now,
        "updated_at": now,
    }
    _cases_store[str(case_id)] = case
    return CaseResponse(**case)


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: UUID):
    case = _cases_store.get(str(case_id))
    if not case:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse(**case)


@router.get("/", response_model=list[CaseResponse])
async def list_cases(status: str | None = None, limit: int = 20):
    items = list(_cases_store.values())
    if status:
        items = [c for c in items if c["status"] == status]
    return [CaseResponse(**c) for c in items[:limit]]


@router.post("/{case_id}/incidents", response_model=IncidentResponse, status_code=201)
async def create_incident(case_id: UUID, payload: IncidentCreate):
    inc_id = uuid4()
    now = datetime.now(UTC)
    incident = {
        "id": inc_id,
        "case_id": case_id,
        "title": payload.title,
        "description": payload.description,
        "incident_number": payload.incident_number,
        "occurred_at": payload.occurred_at,
        "reported_at": payload.reported_at,
        "location_description": payload.location_description,
        "location_lat": payload.location_lat,
        "location_lng": payload.location_lng,
        "status": "reported",
        "created_at": now,
        "updated_at": now,
    }
    _incidents_store[str(inc_id)] = incident
    return IncidentResponse(**incident)


@router.post("/{case_id}/evidence", response_model=EvidenceResponse, status_code=201)
async def create_evidence(case_id: UUID, payload: EvidenceCreate):
    ev_id = uuid4()
    now = datetime.now(UTC)
    evidence = {
        "id": ev_id,
        "case_id": case_id,
        "title": payload.title,
        "description": payload.description,
        "evidence_type": payload.evidence_type,
        "tags": payload.tags,
        "created_at": now,
        "updated_at": now,
    }
    _evidence_store[str(ev_id)] = evidence
    return EvidenceResponse(**evidence)
