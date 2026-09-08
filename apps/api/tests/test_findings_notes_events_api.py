"""Findings, Notes & Events API tests (Phase 17.9).

Covers the real persisted findings / notes / events layer:
- investigation-scoped listings (findings, notes, events)
- persisted detail reads (severity / confidence / status / entity_refs for
  findings, event_type / timestamp / location for events, content / author
  for notes)
- scoped detail resolution and cross-investigation rejection (404)
- cross-investigation list isolation
- missing / malformed ids
- event ordering by timestamp (ascending)
- ingestion-created events (dataset_uploaded / ingestion_started /
  ingestion_completed) surface in the scoped events list and timeline with
  the correct investigation scope
- POST /findings and POST /notes remain compatible (created rows read back
  through scoped detail + list)
- API error contract
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import _uuid, seed_database
from app.models import Base, Dataset, DatasetStatus, InvestigationEvent
from app.services.real.ingestion import IngestionPipeline
from tests.auth_stubs import install_auth_stub

CDR_CSV = """caller,callee,call_date,duration,location
+919876543210,+919021011345,2026-02-10,120,Chennai
+919876543210,+919811122334,2026-02-11,45,Pune
+919021011345,+919811122334,2026-02-12,300,Mumbai
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
FINDING_1 = str(_uuid("inf-006-1"))
FINDING_2 = str(_uuid("inf-006-2"))
EVENT_1 = str(_uuid("event-001"))
EVENT_2 = str(_uuid("event-002"))
EVENT_3 = str(_uuid("event-003"))
NOTE_1 = str(_uuid("inn-006-1"))


# ---------------------------------------------------------------------------
# 1. Scoped listings
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_findings_events_notes_lists_are_investigation_scoped(client):
    ac, factory = client
    await _seed(factory)

    findings = await ac.get(f"/investigations/{INV_ID}/findings")
    assert findings.status_code == 200
    assert len(findings.json()) == 2
    assert all(f["investigation_id"] == INV_ID for f in findings.json())

    events = await ac.get(f"/investigations/{INV_ID}/events")
    assert events.status_code == 200
    assert len(events.json()) == 3
    assert all(e["investigation_id"] == INV_ID for e in events.json())

    notes = await ac.get(f"/investigations/{INV_ID}/notes")
    assert notes.status_code == 200
    assert len(notes.json()) == 1
    assert all(n["investigation_id"] == INV_ID for n in notes.json())


@pytest.mark.anyio
async def test_events_list_is_ordered_by_timestamp_ascending(client):
    ac, factory = client
    await _seed(factory)

    events = (await ac.get(f"/investigations/{INV_ID}/events")).json()
    stamps = [e["timestamp"] for e in events]
    assert stamps == sorted(stamps)
    assert events[0]["event_type"] == "case_event"
    assert events[-1]["event_type"] == "meeting"


# ---------------------------------------------------------------------------
# 2. Persisted detail reads
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_finding_detail_reads_persisted_data(client):
    ac, factory = client
    await _seed(factory)

    detail = await ac.get(f"/findings/{FINDING_1}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == FINDING_1
    assert body["title"] == "Coordinate cluster around the primary device"
    assert body["severity"] == "medium"
    assert body["confidence"] == "inferred"
    assert body["status"] == "open"
    assert body["investigation_id"] == INV_ID
    assert isinstance(body["entity_refs"], list) and len(body["entity_refs"]) == 2
    assert body["metadata"]["canonical_id"] == "inf-006-1"
    assert body["metadata"]["is_demo"] is True


@pytest.mark.anyio
async def test_event_detail_reads_persisted_data(client):
    ac, factory = client
    await _seed(factory)

    detail = await ac.get(f"/events/{EVENT_2}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == EVENT_2
    assert body["event_type"] == "transaction"
    assert body["timestamp"].startswith("2026-02-14T11:05:00")
    assert body["location"] == "Pune"
    assert body["description"].startswith("₹4,80,000 transferred")
    assert body["investigation_id"] == INV_ID
    assert body["metadata"]["canonical_id"] == "event-002"


@pytest.mark.anyio
async def test_note_detail_reads_persisted_data(client):
    ac, factory = client
    await _seed(factory)

    detail = await ac.get(f"/notes/{NOTE_1}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == NOTE_1
    assert body["author"] == "Inspector Mehta"
    assert body["content"].startswith("Demo journey anchor")
    assert body["investigation_id"] == INV_ID
    assert body["metadata"]["canonical_id"] == "inn-006-1"


# ---------------------------------------------------------------------------
# 3. Scoped detail resolution + cross-investigation rejection
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_finding_notes_events_scoped_detail_resolves(client):
    ac, factory = client
    await _seed(factory)

    ok_f = await ac.get(f"/findings/{FINDING_1}?investigation_id={INV_ID}")
    assert ok_f.status_code == 200
    assert ok_f.json()["id"] == FINDING_1

    ok_e = await ac.get(f"/events/{EVENT_1}?investigation_id={INV_ID}")
    assert ok_e.status_code == 200
    assert ok_e.json()["id"] == EVENT_1

    ok_n = await ac.get(f"/notes/{NOTE_1}?investigation_id={INV_ID}")
    assert ok_n.status_code == 200
    assert ok_n.json()["id"] == NOTE_1


@pytest.mark.anyio
async def test_finding_notes_events_cross_investigation_rejected(client):
    ac, factory = client
    await _seed(factory)

    other = await ac.post("/investigations", json={"title": "Other inv", "status": "draft"})
    other_inv_id = other.json()["id"]

    # Create a foreign finding + note + event owned by the other investigation.
    created_f = await ac.post(
        "/findings",
        json={
            "investigation_id": other_inv_id,
            "title": "Other finding",
            "severity": "low",
        },
    )
    other_finding_id = created_f.json()["id"]
    created_n = await ac.post(
        "/notes",
        json={"investigation_id": other_inv_id, "content": "Other note", "author": "Other"},
    )
    other_note_id = created_n.json()["id"]

    async with factory() as session:
        session.add(
            InvestigationEvent(
                investigation_id=uuid.UUID(other_inv_id),
                event_type="meeting",
                timestamp=None,
                description="Other event",
                metadata_={},
            )
        )
        await session.commit()

    other_event_id = (await ac.get(f"/investigations/{other_inv_id}/events")).json()[0]["id"]

    # Reading Meridian's rows under the other investigation is a 404 — no leak.
    for resource, _item_id in (
        (f"/findings/{FINDING_1}", FINDING_1),
        (f"/events/{EVENT_1}", EVENT_1),
        (f"/notes/{NOTE_1}", NOTE_1),
    ):
        wrong = await ac.get(f"{resource}?investigation_id={other_inv_id}")
        assert wrong.status_code == 404
        assert wrong.json()["code"] == "not_found"

    # Correct scope resolves.
    assert (await ac.get(f"/findings/{FINDING_1}?investigation_id={INV_ID}")).status_code == 200
    assert (await ac.get(f"/events/{EVENT_1}?investigation_id={INV_ID}")).status_code == 200
    assert (await ac.get(f"/notes/{NOTE_1}?investigation_id={INV_ID}")).status_code == 200

    # Unscoped reads still resolve.
    assert (await ac.get(f"/findings/{FINDING_1}")).status_code == 200
    assert (await ac.get(f"/events/{EVENT_1}")).status_code == 200
    assert (await ac.get(f"/notes/{NOTE_1}")).status_code == 200

    # Foreign-owned rows stay readable under their own (correct) scope.
    assert (
        await ac.get(f"/findings/{other_finding_id}?investigation_id={other_inv_id}")
    ).status_code == 200
    assert (
        await ac.get(f"/notes/{other_note_id}?investigation_id={other_inv_id}")
    ).status_code == 200
    assert (
        await ac.get(f"/events/{other_event_id}?investigation_id={other_inv_id}")
    ).status_code == 200

    # Meridian's rows reject the other investigation's owning scope too.
    assert (await ac.get(f"/notes/{NOTE_1}?investigation_id={other_inv_id}")).status_code == 404


@pytest.mark.anyio
async def test_finding_notes_events_lists_are_isolated(client):
    ac, factory = client
    await _seed(factory)

    other = await ac.post("/investigations", json={"title": "Isolated inv", "status": "draft"})
    other_inv_id = other.json()["id"]

    await ac.post(
        "/findings",
        json={
            "investigation_id": other_inv_id,
            "title": "Isolated finding",
            "severity": "high",
        },
    )
    await ac.post(
        "/notes",
        json={"investigation_id": other_inv_id, "content": "Isolated note", "author": "I"},
    )
    async with factory() as session:
        session.add(
            InvestigationEvent(
                investigation_id=uuid.UUID(other_inv_id),
                event_type="transaction",
                timestamp=None,
                description="Isolated event",
                metadata_={},
            )
        )
        await session.commit()

    assert len((await ac.get(f"/investigations/{INV_ID}/findings")).json()) == 2
    assert len((await ac.get(f"/investigations/{INV_ID}/events")).json()) == 3
    assert len((await ac.get(f"/investigations/{INV_ID}/notes")).json()) == 1

    other_findings = (await ac.get(f"/investigations/{other_inv_id}/findings")).json()
    other_notes = (await ac.get(f"/investigations/{other_inv_id}/notes")).json()
    other_events = (await ac.get(f"/investigations/{other_inv_id}/events")).json()
    assert len(other_findings) == 1
    assert len(other_notes) == 1
    assert len(other_events) == 1
    assert all(f["investigation_id"] == other_inv_id for f in other_findings)
    assert all(n["investigation_id"] == other_inv_id for n in other_notes)
    assert all(e["investigation_id"] == other_inv_id for e in other_events)


# ---------------------------------------------------------------------------
# 4. Missing / malformed ids
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_invalid_finding_notes_events_missing(client):
    ac, factory = client
    await _seed(factory)

    for resource, expected in (
        ("findings", "Findings"),
        ("events", "Events"),
        ("notes", "Notes"),
    ):
        resp = await ac.get(f"/{resource}/{uuid.uuid4()}")
        assert resp.status_code == 404
        body = resp.json()
        assert body["code"] == "not_found"
        assert body["details"]["resource"] == expected


@pytest.mark.anyio
async def test_invalid_finding_notes_events_bad_uuid(client):
    ac, factory = client
    await _seed(factory)

    for resource in ("findings", "events", "notes"):
        resp = await ac.get(f"/{resource}/not-a-uuid")
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 5. Non-list investigation resources 404 without the investigation scope
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_list_resources_require_real_investigation(client):
    ac, factory = client
    await _seed(factory)

    for resource in ("findings", "events", "notes"):
        resp = await ac.get(f"/investigations/{uuid.uuid4()}/{resource}")
        assert resp.status_code == 404
        assert resp.json()["code"] == "not_found"


# ---------------------------------------------------------------------------
# 6. Ingestion-created events surface in the scoped events list + timeline
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_ingestion_events_surface_scoped(client):
    ac, factory = client
    await _seed(factory)

    inv = await ac.post("/investigations", json={"title": "Event Ingestion", "status": "draft"})
    inv_id = inv.json()["id"]

    async with factory() as session:
        ds = Dataset(
            investigation_id=uuid.UUID(inv_id),
            name="CDR Event Test",
            source_name="CDR Extract",
            format="csv",
            category="structured",
            status=DatasetStatus.VALIDATING,
            file_name="cdr_event_test.csv",
            file_size=len(CDR_CSV.encode()),
        )
        session.add(ds)
        await session.flush()
        result = await IngestionPipeline(session).run(
            investigation_id=uuid.UUID(inv_id),
            dataset_id=ds.id,
            file_content=CDR_CSV,
            file_name="cdr_event_test.csv",
            created_by="Test",
        )
        await session.commit()

    assert result.relationships_created >= 1

    events = (await ac.get(f"/investigations/{inv_id}/events")).json()
    types = {e["event_type"] for e in events}
    assert {"dataset_uploaded", "ingestion_started", "ingestion_completed"} <= types

    for e in events:
        assert e["investigation_id"] == inv_id
        assert e["timestamp"] is not None

    uploaded = next(e for e in events if e["event_type"] == "dataset_uploaded")
    assert uploaded["metadata"]["dataset_id"] is not None

    started = next(e for e in events if e["event_type"] == "ingestion_started")
    assert started["metadata"]["job_id"] is not None

    completed = next(e for e in events if e["event_type"] == "ingestion_completed")
    detail = await ac.get(f"/events/{completed['id']}?investigation_id={inv_id}")
    assert detail.status_code == 200
    assert detail.json()["event_type"] == "ingestion_completed"

    # Timeline carries the ingestion events as scoped event entries.
    timeline = (await ac.get(f"/timeline/{inv_id}")).json()["entries"]
    timeline_types = {e["title"] for e in timeline if e["kind"] == "event"}
    assert {"dataset_uploaded", "ingestion_started", "ingestion_completed"} <= timeline_types

    # Meridian's event list is untouched by another investigation's ingestion.
    meridian = (await ac.get(f"/investigations/{INV_ID}/events")).json()
    assert len(meridian) == 3
    assert all(e["investigation_id"] == INV_ID for e in meridian)


# ---------------------------------------------------------------------------
# 7. POST /findings and POST /notes remain compatible
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_created_finding_and_note_read_back(client):
    ac, factory = client
    await _seed(factory)

    created_f = await ac.post(
        "/findings",
        json={
            "investigation_id": INV_ID,
            "title": "API-created finding",
            "description": "created through the persisted contract",
            "severity": "critical",
            "confidence": "analytical",
            "status": "open",
            "entity_refs": [],
            "metadata": {"created_by": "test"},
        },
    )
    assert created_f.status_code == 201
    f = created_f.json()
    assert f["severity"] == "critical"
    assert f["confidence"] == "analytical"

    detail = await ac.get(f"/findings/{f['id']}?investigation_id={INV_ID}")
    assert detail.status_code == 200
    assert detail.json()["title"] == "API-created finding"
    assert detail.json()["metadata"]["created_by"] == "test"

    listing = await ac.get(f"/investigations/{INV_ID}/findings")
    assert len(listing.json()) == 3

    created_n = await ac.post(
        "/notes",
        json={
            "investigation_id": INV_ID,
            "content": "API-created note",
            "author": "Inspector Mehta",
            "metadata": {"category": "hypothesis"},
        },
    )
    assert created_n.status_code == 201
    n = created_n.json()
    assert n["author"] == "Inspector Mehta"

    detail = await ac.get(f"/notes/{n['id']}?investigation_id={INV_ID}")
    assert detail.status_code == 200
    assert detail.json()["metadata"]["category"] == "hypothesis"

    listing = await ac.get(f"/investigations/{INV_ID}/notes")
    assert len(listing.json()) == 2


# ---------------------------------------------------------------------------
# 8. API error contract
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_finding_notes_events_api_error_contract(client):
    ac, factory = client
    await _seed(factory)

    for resource in ("findings", "events", "notes"):
        resp = await ac.get(f"/{resource}/{uuid.uuid4()}")
        assert resp.status_code == 404
        body = resp.json()
        assert set(body.keys()) == {"code", "message", "details", "status_code"}
        assert body["code"] == "not_found"
        assert body["status_code"] == 404
