"""Investigation isolation tests (Phase 14.3).

Guarantees that an investigation (e.g. the canonical inv-006) cannot observe
data belonging to a different investigation through the real /api/v2 layer.
"""

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


async def _create_investigation(ac, title):
    resp = await ac.post(
        "/investigations",
        json={"title": title, "status": "active", "priority": "high"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_entity(ac, inv_id, name, entity_type="person"):
    resp = await ac.post(
        "/entities",
        json={
            "investigation_id": inv_id,
            "entity_type": entity_type,
            "name": name,
        },
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.anyio
async def test_investigation_lists_are_scoped(client):
    """Entities listed under one investigation never include another's."""
    ac, _ = client
    inv_a = await _create_investigation(ac, "Inv A")
    inv_b = await _create_investigation(ac, "Inv B")

    await _create_entity(ac, inv_a, "Person A1")
    await _create_entity(ac, inv_a, "Person A2")
    await _create_entity(ac, inv_b, "Person B1")

    list_a = await ac.get(f"/investigations/{inv_a}/entities")
    list_b = await ac.get(f"/investigations/{inv_b}/entities")

    assert list_a.status_code == 200
    assert list_b.status_code == 200

    ids_a = [e["id"] for e in list_a.json()]
    ids_b = [e["id"] for e in list_b.json()]
    names_a = [e["name"] for e in list_a.json()]
    names_b = [e["name"] for e in list_b.json()]

    assert len(ids_a) == 2
    assert len(ids_b) == 1
    assert set(ids_a).isdisjoint(set(ids_b))
    assert names_b == ["Person B1"]
    assert "Person B1" not in names_a


@pytest.mark.anyio
async def test_summary_counts_are_scoped(client):
    ac, _ = client
    inv_a = await _create_investigation(ac, "Inv A")
    inv_b = await _create_investigation(ac, "Inv B")

    await _create_entity(ac, inv_a, "A-only")
    await _create_entity(ac, inv_a, "A-2")
    await _create_entity(ac, inv_b, "B-only")

    summary_a = (await ac.get(f"/investigations/{inv_a}/summary")).json()
    summary_b = (await ac.get(f"/investigations/{inv_b}/summary")).json()

    assert summary_a["entity_count"] == 2
    assert summary_b["entity_count"] == 1


@pytest.mark.anyio
async def test_entity_rejected_for_unknown_investigation(client):
    """Creating an entity under a non-existent investigation is rejected."""
    ac, _ = client
    resp = await ac.post(
        "/entities",
        json={
            "investigation_id": "11111111-1111-1111-1111-111111111111",
            "entity_type": "person",
            "name": "Orphan",
        },
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"


@pytest.mark.anyio
async def test_seeded_operation_meridian_is_scoped_and_isolated(client):
    """The canonical inv-006 universe is visible under /investigations/{id}."""
    ac, factory = client
    await _seed(factory)

    inv_id = "6c887c98-939a-50ce-ac27-f58376941de2"

    listing = await ac.get("/investigations")
    invs = listing.json()["items"]
    assert len(invs) == 1
    assert invs[0]["id"] == inv_id

    entities = (await ac.get(f"/investigations/{inv_id}/entities")).json()
    # Only inv-006's entities are returned; none from any other investigation
    # could be present because only inv-006 exists after seeding.
    for e in entities:
        assert e["investigation_id"] == inv_id
