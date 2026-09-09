"""Investigation timeline intelligence tests (Phase 29).

Phase 29 strengthens the existing merged timeline contract (GET
``/timeline/{investigation_id}``) that the investigation workspace depends
on. It does NOT add a new endpoint or a migration — the surface is the
already-shipped read path, hardening its determinism and its honesty:

1. access control — the timeline requires an authenticated actor (401)
2. investigation-scoped merged feed — every entry's ``ref_id`` resolves to
   an object inside the SAME investigation (event / evidence / finding /
   note)
3. chronological ordering with timestamp semantics — entries stream in
   ascending order of their REAL temporal field (event ``timestamp``,
   evidence ``collected_at``, finding ``created_at``, note ``created_at``);
   the API never substitutes ``created_at`` for a missing event/collection
   time
4. deterministic ordering for untimed entries — entries without a recorded
   time (event without ``timestamp``, evidence without ``collected_at``)
   sort deterministically BEFORE the dated stream instead of crashing a
   mixed datetime/str comparison
5. cross-investigation isolation — no seeded Meridian objects leak into a
   foreign investigation's timeline
6. honest empty timelines — a fresh investigation reports an empty feed,
   never fabricated rows
7. safe errors — missing resources are a hidden 404, malformed ids a 422
8. no secret leakage — timeline responses never expose credentials or
   raw payload blobs

The surface stays strictly read-only: nothing here mutates the timeline or
ascribes judgement to an event.
"""

from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import _uuid, seed_database
from app.models import Base
from app.models.investigation import InvestigationEvent
from tests.auth_stubs import install_auth_stub

# ---------------------------------------------------------------------------
# Operation Meridian canonical ids used by the Phase 29 timeline contracts.
# ---------------------------------------------------------------------------

INV_ID = str(_uuid("inv-006"))
EVENT_001 = str(_uuid("event-001"))
EVENT_002 = str(_uuid("event-002"))
EVENT_003 = str(_uuid("event-003"))
EV_001 = str(_uuid("ev-001"))
EV_004 = str(_uuid("ev-004"))
EV_007 = str(_uuid("ev-007"))
EV_009 = str(_uuid("ev-009"))
FINDING_1 = str(_uuid("inf-006-1"))
FINDING_2 = str(_uuid("inf-006-2"))

SECRET_MARKERS = (
    "api_key",
    "secret_key",
    "provider_api_key",
    "password",
    "oauth",
    "bearer",
    "sk-",
    "content_base64",
    "payload_content",
)


def _as_utc(value: str) -> datetime:
    """Parse an ISO timestamp defensively (handles a trailing ``Z``)."""
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


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


@pytest.fixture
async def public_client():
    """Same real stack, but WITHOUT the auth stub so the JWT bearer guard runs."""
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

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await engine.dispose()


async def _seed(factory):
    async with factory() as session:
        await seed_database(session)
        await session.commit()


async def _create_other_investigation(ac, title: str = "Isolated investigation") -> str:
    response = await ac.post(
        "/investigations",
        json={"title": title, "status": "draft", "priority": "normal"},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _add_event_without_timestamp(factory, investigation_id: str, event_type: str) -> str:
    """Insert an event row directly (there is no POST /events read-only surface)."""
    event_id = uuid4()
    async with factory() as session:
        session.add(
            InvestigationEvent(
                id=event_id,
                investigation_id=UUID(investigation_id),
                event_type=event_type,
                timestamp=None,
                location=None,
                description="An event without a recorded time.",
                metadata_={},
            )
        )
        await session.commit()
    return str(event_id)


async def _add_evidence(
    ac,
    investigation_id: str,
    title: str,
    evidence_type: str = "DOCUMENT",
    collected_at: str | None = None,
) -> str:
    body = {
        "investigation_id": investigation_id,
        "evidence_type": evidence_type,
        "title": title,
        "description": "Phase 29 timeline evidence fixture.",
        "source": None,
        "provenance": {"collected_by": "test"},
        "metadata": {},
    }
    if collected_at:
        body["collected_at"] = collected_at
    response = await ac.post("/evidence", json=body)
    assert response.status_code == 201, response.text
    return response.json()["id"]


# ---------------------------------------------------------------------------
# 1. Access control — the timeline needs an authenticated actor
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_timeline_requires_authentication(public_client):
    ac = public_client
    response = await ac.get(f"/timeline/{uuid4()}")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# 2. Safe errors — hidden 404s, malformed ids as 422
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_timeline_unknown_investigation_is_404(client):
    ac, factory = client
    await _seed(factory)

    response = await ac.get(f"/timeline/{uuid4()}")
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


@pytest.mark.anyio
async def test_timeline_invalid_investigation_id_is_422(client):
    ac, factory = client
    await _seed(factory)

    response = await ac.get("/timeline/not-a-uuid")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 3. Investigation-scoped merged feed with grounded references
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_timeline_is_scoped_to_the_owning_investigation(client):
    ac, factory = client
    await _seed(factory)

    response = await ac.get(f"/timeline/{INV_ID}")
    assert response.status_code == 200
    body = response.json()
    assert body["investigation_id"] == INV_ID
    assert isinstance(body["entries"], list)
    assert body["entries"], "seed timeline should not be empty"

    event_ids = [e["ref_id"] for e in body["entries"] if e["kind"] == "event"]
    assert EVENT_002 in event_ids
    for eid in event_ids:
        resp = await ac.get(f"/events/{eid}?investigation_id={INV_ID}")
        assert resp.status_code == 200
        assert resp.json()["investigation_id"] == INV_ID

    evidence_ids = [e["ref_id"] for e in body["entries"] if e["kind"] == "evidence"]
    assert EV_004 in evidence_ids
    for eid in evidence_ids:
        resp = await ac.get(f"/evidence/{eid}?investigation_id={INV_ID}")
        assert resp.status_code == 200
        assert resp.json()["investigation_id"] == INV_ID

    finding_ids = [e["ref_id"] for e in body["entries"] if e["kind"] == "finding"]
    assert FINDING_1 in finding_ids
    for fid in finding_ids:
        resp = await ac.get(f"/findings/{fid}?investigation_id={INV_ID}")
        assert resp.status_code == 200
        assert resp.json()["investigation_id"] == INV_ID

    note_ids = [e["ref_id"] for e in body["entries"] if e["kind"] == "note"]
    for nid in note_ids:
        resp = await ac.get(f"/notes/{nid}?investigation_id={INV_ID}")
        assert resp.status_code == 200
        assert resp.json()["investigation_id"] == INV_ID


# ---------------------------------------------------------------------------
# 4. Chronological ordering with real timestamp semantics
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_timeline_streams_ascending_by_the_persisted_temporal_field(client):
    ac, factory = client
    await _seed(factory)

    response = await ac.get(f"/timeline/{INV_ID}")
    assert response.status_code == 200
    entries = response.json()["entries"]

    stamped = [e for e in entries if e["at"] is not None]
    assert stamped, "seed timeline should contain dated entries"
    stamps = [_as_utc(e["at"]) for e in stamped]
    assert stamps == sorted(stamps), "timeline must be ascending chronological"

    # Deterministic: a second read returns the same ordering.
    again = await ac.get(f"/timeline/{INV_ID}")
    assert [e["ref_id"] for e in again.json()["entries"]] == [e["ref_id"] for e in entries]


@pytest.mark.anyio
async def test_timeline_uses_event_time_and_evidence_collection_time_never_created_at(client):
    ac, factory = client
    await _seed(factory)

    entries = (await ac.get(f"/timeline/{INV_ID}")).json()["entries"]
    by_ref = {e["ref_id"]: e for e in entries}

    # Event entries are timed by the event's OWN timestamp field.
    event_entry = by_ref[EVENT_001]
    event_detail = (await ac.get(f"/events/{EVENT_001}?investigation_id={INV_ID}")).json()
    assert _as_utc(event_entry["at"]) == _as_utc(event_detail["timestamp"])
    # And NOT the analysis/record created_at substitute.
    assert _as_utc(event_entry["at"]) != _as_utc(event_detail["created_at"])

    event_002_entry = by_ref[EVENT_002]
    event_002_detail = (await ac.get(f"/events/{EVENT_002}?investigation_id={INV_ID}")).json()
    assert _as_utc(event_002_entry["at"]) == _as_utc(event_002_detail["timestamp"])

    # Evidence entries are timed by the persisted collection time.
    evidence_entry = by_ref[EV_001]
    evidence_detail = (await ac.get(f"/evidence/{EV_001}?investigation_id={INV_ID}")).json()
    assert _as_utc(evidence_entry["at"]) == _as_utc(evidence_detail["collected_at"])

    # Finding entries stream by their recording time (created_at).
    finding_entry = by_ref[FINDING_1]
    finding_detail = (await ac.get(f"/findings/{FINDING_1}?investigation_id={INV_ID}")).json()
    assert _as_utc(finding_entry["at"]) == _as_utc(finding_detail["created_at"])


# ---------------------------------------------------------------------------
# 5. Deterministic ordering for untimed entries (no mixed-type crash)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_timeline_with_missing_timestamps_is_ordered_deterministically(client):
    ac, factory = client
    await _seed(factory)
    other_id = await _create_other_investigation(ac)

    untimed_event = await _add_event_without_timestamp(factory, other_id, "observation")
    timed_event_at = "2026-08-20T08:00:00+00:00"
    timed_event = uuid4()
    async with factory() as session:
        session.add(
            InvestigationEvent(
                id=timed_event,
                investigation_id=UUID(other_id),
                event_type="transaction",
                timestamp=datetime.fromisoformat(timed_event_at),
                location=None,
                description="A dated event.",
                metadata_={},
            )
        )
        await session.commit()
    timed_event = str(timed_event)

    untimed_evidence = await _add_evidence(ac, other_id, "Undated exhibit", collected_at=None)
    dated_evidence = await _add_evidence(
        ac, other_id, "Dated exhibit", collected_at="2026-08-19T09:00:00+00:00"
    )

    response = await ac.get(f"/timeline/{other_id}")
    assert response.status_code == 200
    entries = response.json()["entries"]
    assert len(entries) == 4

    sequence = [(e["kind"], e["ref_id"], e["at"]) for e in entries]
    # Untimed entries sort deterministically FIRST (event < evidence by kind),
    # then the dated stream ascending — the call must never raise a
    # datetime/str comparison error.
    assert sequence[0] == ("event", untimed_event, None)
    assert sequence[1] == ("evidence", untimed_evidence, None)
    dated = [e for e in entries if e["at"] is not None]
    assert dated[0]["ref_id"] == dated_evidence
    assert dated[1]["ref_id"] == timed_event
    assert _as_utc(dated[0]["at"]) < _as_utc(dated[1]["at"])

    # Deterministic across reads.
    again = await ac.get(f"/timeline/{other_id}")
    assert [e["ref_id"] for e in again.json()["entries"]] == [e["ref_id"] for e in entries]


# ---------------------------------------------------------------------------
# 6. Cross-investigation isolation + honest empty timelines
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_foreign_investigation_timeline_is_isolated_and_reports_an_empty_feed(client):
    ac, factory = client
    await _seed(factory)
    other_id = await _create_other_investigation(ac)

    response = await ac.get(f"/timeline/{other_id}")
    assert response.status_code == 200
    entries = response.json()["entries"]
    assert entries == [], "a fresh investigation has no invented timeline rows"

    # Meridian's events/evidence/findings never surface under the foreign scope.
    refs = {(e["kind"], e["ref_id"]) for e in entries}
    assert (
        (("event", EVENT_001), ("event", EVENT_003), ("evidence", EV_004), ("finding", FINDING_1))
        not in refs
    )

    # The correct scope still resolves after the foreign read.
    assert (await ac.get(f"/timeline/{INV_ID}")).status_code == 200


# ---------------------------------------------------------------------------
# 7. No secret / payload leakage in timeline responses
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_timeline_responses_do_not_leak_secrets(client):
    ac, factory = client
    await _seed(factory)

    response = await ac.get(f"/timeline/{INV_ID}")
    assert response.status_code == 200
    body_text = response.text.lower()
    for marker in SECRET_MARKERS:
        assert marker not in body_text, f"{marker} leaked from the timeline response"
    assert '"content":' not in body_text.replace("content_type", "content_type_x")
