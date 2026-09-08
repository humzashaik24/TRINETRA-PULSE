"""Integration tests for the real (/api/v2) application layer.

Uses an in-memory SQLite database injected via ``app.dependency_overrides`` so
the full FastAPI + SQLAlchemy async stack is exercised without Postgres.
"""

from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import seed_database
from app.models import Base
from tests.auth_stubs import install_auth_stub


@pytest.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    app = create_real_app()

    async def override_get_session():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    from app.api.deps import get_session

    app.dependency_overrides[get_session] = override_get_session
    install_auth_stub(app)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, factory
    await engine.dispose()


async def _seed(factory):
    async with factory() as session:
        await seed_database(session)
        await session.commit()


@pytest.mark.anyio
async def test_empty_list(client):
    ac, _ = client
    response = await ac.get("/investigations")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.anyio
async def test_empty_investigation_network_analytics(client):
    ac, _ = client
    created = await ac.post("/investigations", json={"title": "Empty Network"})
    assert created.status_code == 201
    investigation_id = created.json()["id"]

    response = await ac.get(f"/networks/{investigation_id}/analytics")
    assert response.status_code == 200
    body = response.json()
    assert body["entity_count"] == 0
    assert body["relationship_count"] == 0
    assert body["connected_components"] == 0
    assert body["centrality"] == []
    assert body["temporal"] == []
    assert body["snapshot_id"]


@pytest.mark.anyio
async def test_create_and_get_investigation(client):
    ac, factory = client
    payload = {
        "title": "New Probe",
        "description": "A fresh investigation",
        "status": "draft",
        "priority": "high",
        "lead_investigator": "Inspector Mehta",
        "assigned_team": ["Inspector Mehta"],
        "tags": ["import"],
    }
    created = await ac.post("/investigations", json=payload)
    assert created.status_code == 201
    body = created.json()
    assert body["title"] == "New Probe"
    assert body["priority"] == "high"

    detail = await ac.get(f"/investigations/{body['id']}")
    assert detail.status_code == 200
    assert detail.json()["title"] == "New Probe"


@pytest.mark.anyio
async def test_update_investigation_round_trip(client):
    """PATCH persists changes and re-serializes without async lazy-load errors.

    Regresses the Phase 17.10 fix: after an UPDATE flush the DB-side
    ``onupdate=func.now()`` timestamp is expired, and validating the object
    immediately must not crash with MissingGreenlet.
    """
    ac, _ = client
    created = await ac.post(
        "/investigations",
        json={"title": "Patch Probe", "priority": "low"},
    )
    assert created.status_code == 201
    inv_id = created.json()["id"]

    patched = await ac.patch(
        f"/investigations/{inv_id}",
        json={"title": "Patch Probe Updated", "priority": "normal"},
    )
    assert patched.status_code == 200, patched.json()
    body = patched.json()
    assert body["title"] == "Patch Probe Updated"
    assert body["priority"] == "normal"
    assert body["updated_at"]

    detail = await ac.get(f"/investigations/{inv_id}")
    assert detail.status_code == 200
    assert detail.json()["title"] == "Patch Probe Updated"


@pytest.mark.anyio
async def test_error_contract_missing_investigation(client):
    ac, _ = client
    response = await ac.get("/investigations/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    body = response.json()
    assert body["code"] == "not_found"
    assert body["details"]["resource"] == "Investigations"


@pytest.mark.anyio
async def test_seeded_summary_and_timeline(client):
    ac, factory = client
    await _seed(factory)

    listing = await ac.get("/investigations")
    items = listing.json()["items"]
    assert len(items) == 1
    inv_id = items[0]["id"]

    summary = await ac.get(f"/investigations/{inv_id}/summary")
    assert summary.status_code == 200
    s = summary.json()
    assert s["entity_count"] == 6
    assert s["relationship_count"] == 4
    assert s["evidence_count"] == 4
    assert s["finding_count"] == 2
    assert s["event_count"] == 3
    assert s["note_count"] == 1

    timeline = await ac.get(f"/timeline/{inv_id}")
    assert timeline.status_code == 200
    kinds = {e["kind"] for e in timeline.json()["entries"]}
    assert {"event", "note", "finding", "evidence"} <= kinds


@pytest.mark.anyio
async def test_seeded_network_graph_and_analytics(client):
    ac, factory = client
    await _seed(factory)
    inv_id = (await ac.get("/investigations")).json()["items"][0]["id"]

    graph = await ac.get(f"/networks/{inv_id}/graph")
    assert graph.status_code == 200
    g = graph.json()
    assert len(g["nodes"]) == 6
    assert len(g["edges"]) == 4

    analytics = await ac.get(f"/networks/{inv_id}/analytics")
    assert analytics.status_code == 200
    a = analytics.json()
    assert a["entity_count"] == 6
    # 5 entities are connected in one cluster (Rahul -- phone/Vikram/org/txn);
    # the seeded account entity (no edges) forms a second isolated component.
    assert a["connected_components"] == 2
    assert a["flagged_entity_count"] == 3
    assert a["verified_entity_count"] == 5
    assert a["density"] >= 0
    assert a["centrality"]
    assert a["community_count"] == a["connected_components"]
    assert a["snapshot_id"]


@pytest.mark.anyio
async def test_network_shortest_path_is_investigation_scoped_and_persisted(client):
    ac, factory = client
    await _seed(factory)
    inv_id = (await ac.get("/investigations")).json()["items"][0]["id"]
    analytics = await ac.get(f"/networks/{inv_id}/analytics")
    assert analytics.status_code == 200
    graph = (await ac.get(f"/networks/{inv_id}/graph")).json()
    source = graph["nodes"][0]["id"]
    target = graph["nodes"][1]["id"]

    path = await ac.get(
        f"/networks/{inv_id}/path",
        params={"source_entity_id": source, "target_entity_id": target},
    )
    assert path.status_code == 200
    body = path.json()
    assert body["investigation_id"] == inv_id
    assert body["path"][0] == source
    assert body["path"][-1] == target

    async with factory() as session:
        from sqlalchemy import select

        from app.models import NetworkAnalyticsSnapshot

        persisted = (
            await session.execute(
                select(NetworkAnalyticsSnapshot).where(
                    NetworkAnalyticsSnapshot.investigation_id == UUID(inv_id)
                )
            )
        ).scalar_one()
        assert persisted.entity_count == 6
        assert persisted.payload["investigation_id"] == inv_id


@pytest.mark.anyio
async def test_network_analytics_centrality_is_deterministic_and_handles_isolates(client):
    ac, factory = client
    await _seed(factory)
    inv_id = (await ac.get("/investigations")).json()["items"][0]["id"]

    graph = (await ac.get(f"/networks/{inv_id}/graph")).json()
    by_name = {node["name"]: node["id"] for node in graph["nodes"]}
    first = (await ac.get(f"/networks/{inv_id}/analytics")).json()
    second = (await ac.get(f"/networks/{inv_id}/analytics")).json()

    assert first["degree"] == second["degree"]
    assert first["betweenness"] == second["betweenness"]
    assert first["pagerank"] == second["pagerank"]
    assert first["degree"][by_name["Rahul Kumar"]] == 4
    assert first["degree"][by_name["7731 0029 4567"]] == 0
    assert first["isolated_entity_count"] == 1
    assert first["largest_component_size"] == 5
    assert first["highest_degree_entity_id"] == by_name["Rahul Kumar"]
    assert first["network_influence_leader_id"] in by_name.values()
    assert first["strongest_bridge_entity_id"] == by_name["Rahul Kumar"]
    assert first["bridges"][0]["entity_id"] == by_name["Rahul Kumar"]
    assert first["bridges"][0]["articulation"] is True

    async with factory() as session:
        from sqlalchemy import select

        from app.models import NetworkAnalyticsSnapshot

        snapshot = (
            await session.execute(select(NetworkAnalyticsSnapshot))
        ).scalar_one()
        assert snapshot.algorithm_version == "19.0.0"
        assert snapshot.payload["isolated_entity_count"] == 1


@pytest.mark.anyio
async def test_network_path_rejects_malformed_query(client):
    ac, _ = client
    created = await ac.post("/investigations", json={"title": "Malformed Path"})
    assert created.status_code == 201
    response = await ac.get(f"/networks/{created.json()['id']}/path")
    assert response.status_code == 422


@pytest.mark.anyio
async def test_create_entity_for_investigation(client):
    ac, factory = client
    await _seed(factory)
    inv_id = (await ac.get("/investigations")).json()["items"][0]["id"]

    payload = {
        "investigation_id": inv_id,
        "entity_type": "person",
        "name": "Test Person",
        "description": "created via API",
        "attributes": {"full_name": "Test Person"},
    }
    response = await ac.post("/entities", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Test Person"
    assert body["canonical_name"] == "Test Person"
