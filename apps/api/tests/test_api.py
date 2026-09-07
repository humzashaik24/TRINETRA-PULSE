import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.anyio
async def test_health(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"


@pytest.mark.anyio
async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Trinetra Pulse"
    assert data["version"] == "0.1.0"


@pytest.mark.anyio
async def test_create_entity(client: AsyncClient):
    response = await client.post("/api/v1/entities/", json={
        "entity_type": "person",
        "name": "Test Person",
        "description": "A test entity",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Person"
    assert data["entity_type"] == "person"
    assert "id" in data


@pytest.mark.anyio
async def test_create_case(client: AsyncClient):
    response = await client.post("/api/v1/cases/", json={
        "title": "Test Case",
        "case_number": "TC-2024-001",
        "priority": "high",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Case"
    assert data["case_number"] == "TC-2024-001"
    assert data["status"] == "open"


@pytest.mark.anyio
async def test_list_entities(client: AsyncClient):
    response = await client.get("/api/v1/entities/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.anyio
async def test_networks_stub(client: AsyncClient):
    response = await client.get("/api/v1/networks/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


@pytest.mark.anyio
async def test_analytics_stub(client: AsyncClient):
    response = await client.get("/api/v1/analytics/")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_ai_status(client: AsyncClient):
    response = await client.get("/api/v1/ai/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
