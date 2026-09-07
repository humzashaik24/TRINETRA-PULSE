import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import entity_intelligence as service


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def _reset_intelligence():
    service.reset_intelligence()
    yield


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.anyio
async def test_list_candidates(client: AsyncClient):
    response = await client.get("/api/v1/entity-intelligence/candidates")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(c["id"] == "cand-001" for c in data)


@pytest.mark.anyio
async def test_list_candidates_filtered(client: AsyncClient):
    response = await client.get(
        "/api/v1/entity-intelligence/candidates",
        params={"status": "ACCEPTED"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(c["status"] == "ACCEPTED" for c in data)


@pytest.mark.anyio
async def test_review_candidate(client: AsyncClient):
    response = await client.post(
        "/api/v1/entity-intelligence/candidates/cand-001/review",
        json={"decision": "accept", "reviewer": "analyst-test"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ACCEPTED"
    assert data["resolution_state"] == "CONFIRMED"
    assert data["reviewed_by"] == "analyst-test"
    assert data["reviewed_at"] is not None


@pytest.mark.anyio
async def test_review_missing_candidate(client: AsyncClient):
    response = await client.post(
        "/api/v1/entity-intelligence/candidates/cand-999/review",
        json={"decision": "reject", "reviewer": "analyst-test"},
    )
    assert response.status_code == 404


@pytest.mark.anyio
async def test_list_resolutions(client: AsyncClient):
    response = await client.get("/api/v1/entity-intelligence/resolutions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert all("state" in r for r in data)


@pytest.mark.anyio
async def test_confirm_resolution(client: AsyncClient):
    response = await client.post(
        "/api/v1/entity-intelligence/resolutions/res-001/confirm",
        json={"reviewer": "analyst-test", "reason": "Matches on phone and city."},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "CONFIRMED"
    assert data["reviewed_by"] == "analyst-test"


@pytest.mark.anyio
async def test_reject_resolution(client: AsyncClient):
    response = await client.post(
        "/api/v1/entity-intelligence/resolutions/res-001/reject",
        json={"reviewer": "analyst-test", "reason": "Names do not match."},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "REJECTED"


@pytest.mark.anyio
async def test_merge_resolution(client: AsyncClient):
    response = await client.post(
        "/api/v1/entity-intelligence/resolutions/res-001/merge",
        json={
            "target_entity_id": "ent-person-001",
            "archive_source_profiles": True,
            "reviewer": "analyst-test",
            "reason": "Same person across datasets.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "CONFIRMED"
    assert data["decision"] == "MERGE"
    assert data["merged_target_id"] == "ent-person-001"


@pytest.mark.anyio
async def test_start_extraction_job(client: AsyncClient):
    response = await client.post(
        "/api/v1/entity-intelligence/extraction-jobs",
        json={
            "dataset_id": "ds-006",
            "dataset_name": "Cell Tower Dumps",
            "created_by": "analyst-test",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "QUEUED"
    assert data["progress"] == 0
    assert data["dataset_name"] == "Cell Tower Dumps"


@pytest.mark.anyio
async def test_list_extraction_jobs(client: AsyncClient):
    created = await client.post(
        "/api/v1/entity-intelligence/extraction-jobs",
        json={
            "dataset_id": "ds-006",
            "dataset_name": "Cell Tower Dumps",
            "created_by": "analyst-test",
        },
    )
    assert created.status_code == 201
    response = await client.get("/api/v1/entity-intelligence/extraction-jobs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(j["dataset_name"] == "Cell Tower Dumps" for j in data)


@pytest.mark.anyio
async def test_cancel_extraction_job(client: AsyncClient):
    response = await client.post("/api/v1/entity-intelligence/extraction-jobs/job-002/cancel")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "CANCELLED"


@pytest.mark.anyio
async def test_audit_events(client: AsyncClient):
    response = await client.get("/api/v1/entity-intelligence/audit")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any("action" in e for e in data)


@pytest.mark.anyio
async def test_force_reseed_preserves_defaults():
    service.seed_intelligence()
    assert "cand-001" in service._candidates  # noqa: SLF001
    assert "job-001" in service._jobs  # noqa: SLF001
