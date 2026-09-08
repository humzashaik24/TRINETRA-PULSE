"""Relationship API tests (Phase 17.8).

Covers the real persisted relationship layer:
- investigation-scoped relationship listing
- relationship detail with persisted type/confidence/source/evidence/
  verification status/extraction method/description/weight/metadata
- scoped detail resolution and cross-investigation rejection (404)
- missing / malformed relationship ids
- integrity: relationship source/target entities share the investigation
- persisted extraction method (including a non-default manual row)
- ingestion-created relationships are readable through the relationship API
- API error contract
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import _uuid, seed_database
from app.models import Base, Dataset, DatasetStatus, ExtractionMethod, Relationship
from app.services.real.ingestion import IngestionPipeline
from tests.auth_stubs import install_auth_stub

CDR_CSV = """caller,callee,call_date,duration,location
+919876543210,+919021011345,2026-02-10,120,Chennai
+919876543210,+919811122334,2026-02-11,45,Pune
+919021011345,+919811122334,2026-02-12,300,Mumbai
+919811122334,+919876543210,2026-02-13,60,Chennai
"""


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


INV_ID = str(_uuid("inv-006"))


def rel_ids(rows):
    return [r["id"] for r in rows]


# ---------------------------------------------------------------------------
# 1. Relationship list is investigation scoped
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_relationship_list_is_investigation_scoped(client):
    ac, factory = client
    await _seed(factory)

    resp = await ac.get(f"/investigations/{INV_ID}/relationships")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 4
    assert all(row["investigation_id"] == INV_ID for row in body)


# ---------------------------------------------------------------------------
# 2. Relationship detail reads persisted data
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_relationship_detail_reads_persisted_data(client):
    ac, factory = client
    await _seed(factory)

    listing = await ac.get(f"/investigations/{INV_ID}/relationships")
    rel = next(
        r
        for r in listing.json()
        if r["source"] == "CDR Extract - Operation clean"
        and r["relationship_type"] == "associated_with"
    )

    detail = await ac.get(f"/relationships/{rel['id']}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == rel["id"]
    assert body["relationship_type"] == "associated_with"
    assert body["confidence"] == 0.98
    assert body["source"] == "CDR Extract - Operation clean"
    assert body["evidence_refs"] == ["cdr_extract.csv #2241", "Bank Transaction Log"]
    assert body["verification_status"] == "confirmed"
    assert body["extraction_method"] == "manual"
    assert body["description"] == ("Subscriber link between person of interest and primary device.")
    assert body["weight"] == 1.0
    assert body["metadata"]["is_demo"] is True
    assert body["investigation_id"] == INV_ID
    # source/target entities resolve to ids present in the same investigation
    entities = (await ac.get(f"/investigations/{INV_ID}/entities")).json()
    ent_ids = [e["id"] for e in entities]
    assert body["source_entity_id"] in ent_ids
    assert body["target_entity_id"] in ent_ids


@pytest.mark.anyio
async def test_relationship_detail_exposes_extraction_method_for_all_seed_rows(client):
    ac, factory = client
    await _seed(factory)

    listing = await ac.get(f"/investigations/{INV_ID}/relationships")
    for row in listing.json():
        detail = (await ac.get(f"/relationships/{row['id']}")).json()
        assert "extraction_method" in detail
        assert detail["extraction_method"] == "manual"


# ---------------------------------------------------------------------------
# 3. Scoped detail resolution + cross-investigation rejection
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_relationship_scoped_detail_resolves(client):
    ac, factory = client
    await _seed(factory)

    listing = await ac.get(f"/investigations/{INV_ID}/relationships")
    rel = listing.json()[0]
    ok = await ac.get(f"/relationships/{rel['id']}?investigation_id={INV_ID}")
    assert ok.status_code == 200
    assert ok.json()["id"] == rel["id"]


@pytest.mark.anyio
async def test_relationship_cross_investigation_rejected(client):
    ac, factory = client
    await _seed(factory)

    listing = await ac.get(f"/investigations/{INV_ID}/relationships")
    rel = listing.json()[0]

    # Create a second investigation with its own entity.
    other = await ac.post("/investigations", json={"title": "Other inv", "status": "draft"})
    other_inv_id = other.json()["id"]
    created = await ac.post(
        "/entities",
        json={
            "investigation_id": other_inv_id,
            "entity_type": "person",
            "name": "Other Person",
        },
    )
    other_ent_id = created.json()["id"]

    # Stitch a relationship owned by the other investigation.
    from app.models import RelationshipType

    async with factory() as session:
        session.add(
            Relationship(
                investigation_id=uuid.UUID(other_inv_id),
                source_entity_id=uuid.UUID(other_ent_id),
                target_entity_id=uuid.UUID(other_ent_id),
                relationship_type=RelationshipType.OTHER,
                confidence=0.5,
            )
        )
        await session.commit()

    other_id = rel["id"]

    # Reading Meridian's scope under the other investigation is a 404 — no leak.
    wrong = await ac.get(f"/relationships/{other_id}?investigation_id={other_inv_id}")
    assert wrong.status_code == 404
    assert wrong.json()["code"] == "not_found"
    assert wrong.json()["details"]["resource"] == "Relationships"

    # Correct scope resolves.
    ok = await ac.get(f"/relationships/{other_id}?investigation_id={INV_ID}")
    assert ok.status_code == 200

    # Unscoped reads still resolve.
    flat = await ac.get(f"/relationships/{other_id}")
    assert flat.status_code == 200


@pytest.mark.anyio
async def test_relationship_cross_investigation_list_is_isolated(client):
    ac, factory = client
    await _seed(factory)

    other = await ac.post("/investigations", json={"title": "Isolated inv", "status": "draft"})
    other_inv_id = other.json()["id"]
    created = await ac.post(
        "/entities",
        json={
            "investigation_id": other_inv_id,
            "entity_type": "person",
            "name": "Isolated Person",
        },
    )
    other_ent_id = created.json()["id"]

    from app.models import RelationshipType

    async with factory() as session:
        session.add(
            Relationship(
                investigation_id=uuid.UUID(other_inv_id),
                source_entity_id=uuid.UUID(other_ent_id),
                target_entity_id=uuid.UUID(other_ent_id),
                relationship_type=RelationshipType.OTHER,
                confidence=0.5,
            )
        )
        await session.commit()

    # The other investigation's relationship never leaks into Meridian's list.
    listing = await ac.get(f"/investigations/{INV_ID}/relationships")
    assert len(listing.json()) == 4

    other_listing = await ac.get(f"/investigations/{other_inv_id}/relationships")
    assert len(other_listing.json()) == 1


# ---------------------------------------------------------------------------
# 4. Missing / malformed relationship ids
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_invalid_relationship_missing(client):
    ac, factory = client
    await _seed(factory)
    resp = await ac.get(f"/relationships/{uuid.uuid4()}")
    assert resp.status_code == 404
    body = resp.json()
    assert body["code"] == "not_found"
    assert body["details"]["resource"] == "Relationships"


@pytest.mark.anyio
async def test_invalid_relationship_bad_uuid(client):
    ac, factory = client
    await _seed(factory)
    resp = await ac.get("/relationships/not-a-uuid")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 5. Relationship ↔ entity integrity (same-investigation)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_relationship_entities_share_investigation(client):
    ac, factory = client
    await _seed(factory)

    listing = await ac.get(f"/investigations/{INV_ID}/relationships")
    ent_listing = await ac.get(f"/investigations/{INV_ID}/entities")
    ent_ids = {e["id"] for e in ent_listing.json()}

    for row in listing.json():
        assert row["source_entity_id"] in ent_ids
        assert row["target_entity_id"] in ent_ids


# ---------------------------------------------------------------------------
# 6. Persisted extraction method
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_relationship_extraction_method_persisted(client):
    ac, factory = client
    await _seed(factory)

    listing = await ac.get(f"/investigations/{INV_ID}/relationships")
    rel = listing.json()[0]

    async with factory() as session:
        db_rel = await session.get(Relationship, uuid.UUID(rel["id"]))
        db_rel.extraction_method = ExtractionMethod.AI_NLP
        await session.commit()

    detail = await ac.get(f"/relationships/{rel['id']}")
    assert detail.json()["extraction_method"] == "ai_nlp"


# ---------------------------------------------------------------------------
# 7. Ingestion-created relationships are rounded out by the API
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_ingestion_relationships_surface_via_api(client):
    ac, factory = client
    await _seed(factory)

    inv = await ac.post("/investigations", json={"title": "Rel Ingestion", "status": "draft"})
    inv_id = inv.json()["id"]

    async with factory() as session:
        ds = Dataset(
            investigation_id=uuid.UUID(inv_id),
            name="CDR Test",
            source_name="CDR Extract",
            format="csv",
            category="structured",
            status=DatasetStatus.VALIDATING,
            file_name="cdr_test.csv",
            file_size=len(CDR_CSV.encode()),
        )
        session.add(ds)
        await session.flush()
        result = await IngestionPipeline(session).run(
            investigation_id=uuid.UUID(inv_id),
            dataset_id=ds.id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
            created_by="Test",
        )
        await session.commit()

    assert result.relationships_created >= 1

    listing = await ac.get(f"/investigations/{inv_id}/relationships")
    ingested = [r for r in listing.json() if r.get("metadata", {}).get("source") == "csv_ingestion"]
    assert ingested, "ingestion relationships should appear in the scoped list"

    for row in ingested:
        assert row["investigation_id"] == inv_id
        assert row["source"] == "CDR Test"
        assert isinstance(row["evidence_refs"], list)
        assert row["description"].startswith("associated_with relationship from CSV import")
        assert row["extraction_method"] == "manual"
        assert row["verification_status"] == "needs_review"
        assert row["relationship_type"] == "associated_with"

        detail = await ac.get(f"/relationships/{row['id']}?investigation_id={inv_id}")
        assert detail.status_code == 200
        assert detail.json()["id"] == row["id"]

    # Provenance rows exist for ingested relationships.
    async with factory() as session:
        from app.models import DataProvenance

        prov = (
            (
                await session.execute(
                    select(DataProvenance).where(
                        DataProvenance.investigation_id == uuid.UUID(inv_id),
                        DataProvenance.relationship_id.isnot(None),
                    )
                )
            )
            .scalars()
            .all()
        )
        assert prov, "ingested relationships should carry provenance rows"


# ---------------------------------------------------------------------------
# 8. API error contract
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_relationship_api_error_contract(client):
    ac, factory = client
    await _seed(factory)
    resp = await ac.get(f"/relationships/{uuid.uuid4()}")
    assert resp.status_code == 404
    body = resp.json()
    assert set(body.keys()) == {"code", "message", "details", "status_code"}
    assert body["code"] == "not_found"
    assert body["status_code"] == 404
    assert "Relationships" in body["message"]
