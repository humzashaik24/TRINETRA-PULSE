import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import investigation_operations as service


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def _reset_operations():
    service.reset_operations()
    yield


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.anyio
async def test_get_pipeline(client: AsyncClient):
    response = await client.get("/api/v1/investigation-operations/inv-006/pipeline")
    assert response.status_code == 200
    data = response.json()
    assert data["investigation_id"] == "inv-006"
    assert data["progress"] >= 0
    assert len(data["stages"]) > 0


@pytest.mark.anyio
async def test_get_readiness(client: AsyncClient):
    response = await client.get("/api/v1/investigation-operations/inv-006/readiness")
    assert response.status_code == 200
    data = response.json()
    assert data["investigation_id"] == "inv-006"
    assert data["overall"] in {"ready", "in_progress", "not_started", "needs_attention"}
    assert len(data["items"]) > 0


@pytest.mark.anyio
async def test_get_health(client: AsyncClient):
    response = await client.get("/api/v1/investigation-operations/inv-006/health")
    assert response.status_code == 200
    data = response.json()
    assert data["investigation_id"] == "inv-006"
    assert data["open_review_count"] == 2
    assert all(0 <= m["value"] <= 100 for m in data["metrics"])


@pytest.mark.anyio
async def test_review_queue(client: AsyncClient):
    response = await client.get("/api/v1/investigation-operations/inv-006/review-queue")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(i["investigation_id"] == "inv-006" for i in data)


@pytest.mark.anyio
async def test_activity(client: AsyncClient):
    response = await client.get("/api/v1/investigation-operations/inv-006/activity")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    # newest-first ordering
    for prev, cur in zip(data, data[1:], strict=False):
        assert prev["at"] >= cur["at"]


@pytest.mark.anyio
async def test_saved_views_crud(client: AsyncClient):
    created = await client.post(
        "/api/v1/investigation-operations/inv-006/saved-views",
        json={"name": "Cluster view", "description": "Core selection"},
    )
    assert created.status_code == 201
    view = created.json()
    assert view["investigation_id"] == "inv-006"

    listed = await client.get("/api/v1/investigation-operations/inv-006/saved-views")
    assert listed.status_code == 200
    assert len(listed.json()) >= 2

    deleted = await client.delete(
        f"/api/v1/investigation-operations/inv-006/saved-views/{view['id']}"
    )
    assert deleted.status_code == 204


@pytest.mark.anyio
async def test_graph_bookmark_crud(client: AsyncClient):
    created = await client.post(
        "/api/v1/investigation-operations/inv-006/graph-bookmarks",
        json={"network_id": "NET-001", "label": "Focused view", "entity_ids": ["ent-person-001"]},
    )
    assert created.status_code == 201
    bm = created.json()
    assert bm["network_id"] == "NET-001"

    listed = await client.get("/api/v1/investigation-operations/inv-006/graph-bookmarks")
    assert listed.status_code == 200
    assert any(b["id"] == bm["id"] for b in listed.json())


@pytest.mark.anyio
async def test_timeline_bookmark_create(client: AsyncClient):
    created = await client.post(
        "/api/v1/investigation-operations/inv-006/timeline-bookmarks",
        json={"label": "Incident window", "start": "2026-02-14T00:00:00Z"},
    )
    assert created.status_code == 201
    data = created.json()
    assert data["label"] == "Incident window"


@pytest.mark.anyio
async def test_cross_references(client: AsyncClient):
    response = await client.get("/api/v1/investigation-operations/inv-006/cross-references")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["entity"]["id"] == "ent-person-001"

    filtered = await client.get(
        "/api/v1/investigation-operations/inv-006/cross-references",
        params={"entity_id": "ent-person-001"},
    )
    assert filtered.status_code == 200
    assert len(filtered.json()) == 1


@pytest.mark.anyio
async def test_provenance(client: AsyncClient):
    response = await client.get("/api/v1/investigation-operations/inv-006/provenance")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["target_id"] == "rel-001"
    assert len(data[0]["nodes"]) >= 3


@pytest.mark.anyio
async def test_search_within(client: AsyncClient):
    response = await client.get(
        "/api/v1/investigation-operations/inv-006/search", params={"q": "Rahul"}
    )
    assert response.status_code == 200
    data = response.json()["results"]
    assert all(r["investigation_id"] == "inv-006" for r in data)
    assert all("rahul" in r["label"].lower() for r in data)


@pytest.mark.anyio
async def test_search_across(client: AsyncClient):
    response = await client.get(
        "/api/v1/investigation-operations/search", params={"q": "device", "kind": "entity"}
    )
    assert response.status_code == 200
    data = response.json()["results"]
    assert all(r["kind"] == "entity" for r in data)


@pytest.mark.anyio
async def test_unknown_investigation_404(client: AsyncClient):
    response = await client.get("/api/v1/investigation-operations/nope/pipeline")
    assert response.status_code == 404
