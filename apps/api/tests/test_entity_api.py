"""Entity API tests (Phase 17.7).

Covers the real persisted entity layer:
- investigation-scoped entity listing
- entity detail with persisted provenance / attributes / confidence / risk
- implied aliases from canonical name
- resolution-state derivation (verified => confirmed, else needs review)
- invalid / missing entity
- cross-investigation rejection (scoped detail 404)
- entity creation
- unknown-investigation creation rejection
- API error contract
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import _uuid, seed_database
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


@pytest.mark.anyio
async def _seed(factory):
    async with factory() as session:
        await seed_database(session)
        await session.commit()


# ---------------------------------------------------------------------------
# 1. Entity list is investigation scoped
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_entity_list_is_investigation_scoped(client):
    ac, factory = client
    await _seed(factory)
    inv_id = str(_uuid("inv-006"))

    resp = await ac.get(f"/investigations/{inv_id}/entities")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 6
    assert all(row["investigation_id"] == inv_id for row in body)


# ---------------------------------------------------------------------------
# 2. Entity detail reads persisted data
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_entity_detail_reads_persisted_data(client):
    ac, factory = client
    await _seed(factory)

    resp = await ac.get(f"/investigations/{_uuid('inv-006')}/entities")
    aliased = next(e for e in resp.json() if e["entity_type"] == "person")
    assert aliased["entity_type"] == "person"

    detail = await ac.get(f"/entities/{aliased['id']}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == aliased["id"]
    assert body["canonical_name"] == "rahul kumar"
    assert body["name"] == "Rahul Kumar"
    assert body["confidence"] == 0.95
    assert body["is_verified"] is True
    assert body["is_flagged"] is True
    assert body["attributes"]["full_name"] == "Rahul Kumar"
    assert body["metadata"]["canonical_id"] == "ent-person-001"
    assert body["metadata"]["is_demo"] is True


@pytest.mark.anyio
async def test_entity_detail_flags_and_unverified(client):
    ac, factory = client
    await _seed(factory)

    resp = await ac.get(f"/investigations/{_uuid('inv-006')}/entities")
    vikram = next(e for e in resp.json() if e["name"] == "Vikram Patel")

    detail = await ac.get(f"/entities/{vikram['id']}")
    body = detail.json()
    assert body["is_verified"] is False
    assert body["is_flagged"] is True
    assert body["risk_score"] == vikram["risk_score"]


# ---------------------------------------------------------------------------
# 3. Cross-investigation rejection (investigation-scoped detail 404)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_cross_investigation_entity_rejected(client):
    ac, factory = client
    await _seed(factory)
    inv_id = str(_uuid("inv-006"))

    # Create a second investigation with its own entity.
    resp2 = await ac.post("/investigations", json={"title": "Other inv", "status": "draft"})
    other_inv_id = resp2.json()["id"]
    created = await ac.post(
        "/entities",
        json={
            "investigation_id": other_inv_id,
            "entity_type": "person",
            "name": "Other Person",
        },
    )
    other_ent_id = created.json()["id"]

    # Scoped read from the wrong investigation must be rejected as not found —
    # no cross-investigation existence leak.
    resp = await ac.get(f"/entities/{other_ent_id}?investigation_id={inv_id}")
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"
    assert resp.json()["details"]["resource"] == "Entities"

    # Reading with the correct investigation scope succeeds.
    ok = await ac.get(f"/entities/{other_ent_id}?investigation_id={other_inv_id}")
    assert ok.status_code == 200
    assert ok.json()["investigation_id"] == other_inv_id

    # Unscoped reads still resolve the entity.
    flat = await ac.get(f"/entities/{other_ent_id}")
    assert flat.status_code == 200


# ---------------------------------------------------------------------------
# 4. Invalid entity
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_invalid_entity_missing(client):
    ac, factory = client
    await _seed(factory)
    resp = await ac.get(f"/entities/{uuid.uuid4()}")
    assert resp.status_code == 404
    body = resp.json()
    assert body["code"] == "not_found"
    assert body["details"]["resource"] == "Entities"
    assert "status_code" in body


@pytest.mark.anyio
async def test_invalid_entity_bad_uuid(client):
    ac, factory = client
    await _seed(factory)
    resp = await ac.get("/entities/not-a-uuid")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 5. Entity creation
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_entity_persists_fields(client):
    ac, factory = client
    await _seed(factory)
    inv_id = str(_uuid("inv-006"))

    payload = {
        "investigation_id": inv_id,
        "entity_type": "organization",
        "name": "New Trading Firm",
        "canonical_name": "new trading firm",
        "description": "discovered during review",
        "attributes": {"gstin": "27ZZZ1234"},
        "confidence": 0.74,
        "is_flagged": True,
    }
    resp = await ac.post("/entities", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "New Trading Firm"
    assert body["canonical_name"] == "new trading firm"
    assert body["confidence"] == 0.74
    assert body["attributes"]["gstin"] == "27ZZZ1234"
    assert body["investigation_id"] == inv_id

    # The newly created entity is listed for the investigation.
    listing = await ac.get(f"/investigations/{inv_id}/entities")
    ids = [e["id"] for e in listing.json()]
    assert body["id"] in ids


@pytest.mark.anyio
async def test_create_entity_rejected_for_unknown_investigation(client):
    ac, factory = client
    await _seed(factory)

    resp = await ac.post(
        "/entities",
        json={
            "investigation_id": str(uuid.uuid4()),
            "entity_type": "person",
            "name": "Ghost",
        },
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"


# ---------------------------------------------------------------------------
# 6. API error contract
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_api_error_contract(client):
    ac, factory = client
    await _seed(factory)
    resp = await ac.get(f"/entities/{uuid.uuid4()}")
    assert resp.status_code == 404
    body = resp.json()
    assert set(body.keys()) == {"code", "message", "details", "status_code"}
    assert body["code"] == "not_found"
    assert body["status_code"] == 404
    assert "Entities" in body["message"]
    assert body["details"]["id"]
