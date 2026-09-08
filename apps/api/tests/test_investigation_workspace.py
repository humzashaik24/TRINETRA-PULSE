"""Investigation Intelligence Workspace tests (Phase 27).

Phase 27 connects the existing read-only investigation surface into a unified
workspace WITHOUT adding new endpoints — the workspace is assembled from the
summary, the scoped child collection listings, the merged timeline and the
direction-intelligence API.

These tests lock in the contracts the workspace depends on:

1. access control — every workspace read requires an authenticated actor (401)
2. accurate summary counts that mirror the seeded linked records
3. scoped child listings with no cross-investigation references
4. per-investigation isolation when a workspace detail is read under the wrong
   investigation (404, existence hidden)
5. directions stay scoped and grounded in their own investigation only
6. workspace responses never leak credentials or raw payload blobs

The workspace itself remains strictly read-only: nothing here mutates data or
ascribes judgement.
"""

from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.models import Base, InvestigationEvent, Relationship, RelationshipType, VerificationStatus
from tests.auth_stubs import install_auth_stub

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


async def _create_investigation(ac, title: str, status: str = "active") -> str:
    response = await ac.post(
        "/investigations",
        json={"title": title, "status": status, "priority": "high"},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _create_entity(ac, investigation_id: str, name: str) -> str:
    response = await ac.post(
        "/entities",
        json={"investigation_id": investigation_id, "entity_type": "person", "name": name},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _create_evidence(ac, investigation_id: str, title: str) -> str:
    response = await ac.post(
        "/evidence",
        json={
            "investigation_id": investigation_id,
            "evidence_type": "DOCUMENT",
            "title": title,
            "collected_at": "2026-08-01T09:15:00Z",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _create_finding(ac, investigation_id: str, title: str) -> str:
    response = await ac.post(
        "/findings",
        json={"investigation_id": investigation_id, "title": title, "severity": "low"},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _seed_relationship(factory, investigation_id: str, source_id: str, target_id: str) -> str:
    async with factory() as session:
        rel = Relationship(
            investigation_id=UUID(investigation_id),
            source_entity_id=UUID(source_id),
            target_entity_id=UUID(target_id),
            relationship_type=RelationshipType.TRANSACTION,
            verification_status=VerificationStatus.NEEDS_REVIEW,
            evidence_refs=[],
            confidence=0.0,
        )
        session.add(rel)
        await session.commit()
        return str(rel.id)


async def _seed_event(factory, investigation_id: str, description: str) -> str:
    async with factory() as session:
        event = InvestigationEvent(
            investigation_id=UUID(investigation_id),
            event_type="meeting",
            timestamp=datetime(2026, 8, 10, 9, 0, tzinfo=UTC),
            description=description,
            metadata_={},
        )
        session.add(event)
        await session.commit()
        return str(event.id)


async def _seed_full_workspace(ac, factory, title: str = "Workspace probe"):
    """Investigation with 2 entities, 1 relationship, 1 evidence, 1 finding, 1 event."""
    inv_id = await _create_investigation(ac, title)
    a = await _create_entity(ac, inv_id, "Hub Entity")
    b = await _create_entity(ac, inv_id, "Leaf Entity")
    relationship_id = await _seed_relationship(factory, inv_id, a, b)
    evidence_id = await _create_evidence(ac, inv_id, "Witness statement")
    finding_id = await _create_finding(ac, inv_id, "Association observed")
    event_id = await _seed_event(factory, inv_id, "Coordination meeting")
    return (
        inv_id,
        {
            "a": a,
            "b": b,
            "relationship": relationship_id,
            "evidence": evidence_id,
            "finding": finding_id,
            "event": event_id,
        },
    )


# ---------------------------------------------------------------------------
# 1. Access control — every workspace read requires an authenticated actor
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_workspace_reads_require_authentication(public_client):
    ac = public_client
    missing = str(uuid4())
    for path in (
        f"/investigations/{missing}/summary",
        f"/investigations/{missing}/directions",
        f"/timeline/{missing}",
        f"/investigations/{missing}/entities",
        f"/investigations/{missing}/relationships",
        f"/investigations/{missing}/evidence",
        f"/investigations/{missing}/findings",
        f"/investigations/{missing}/events",
    ):
        response = await ac.get(path)
        assert response.status_code == 401, f"{path} should be auth guarded"


# ---------------------------------------------------------------------------
# 2. Summary counts mirror the seeded linked records
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_workspace_summary_reflects_seeded_linked_records(client):
    ac, factory = client
    inv_id, ids = await _seed_full_workspace(ac, factory)

    response = await ac.get(f"/investigations/{inv_id}/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == inv_id
    assert body["title"] == "Workspace probe"
    assert body["status"] == "active"
    assert body["entity_count"] == 2
    assert body["relationship_count"] == 1
    assert body["evidence_count"] == 1
    assert body["finding_count"] == 1
    assert body["event_count"] == 1
    assert body["note_count"] == 0
    assert "updated_at" in body

    # Every workspace object the summary counts is individually addressable.
    for path in (
        f"/investigations/{inv_id}/entities",
        f"/investigations/{inv_id}/relationships",
        f"/investigations/{inv_id}/evidence",
        f"/investigations/{inv_id}/findings",
        f"/investigations/{inv_id}/events",
    ):
        listing = await ac.get(path)
        assert listing.status_code == 200
        assert isinstance(listing.json(), list)


# ---------------------------------------------------------------------------
# 3. Child listings are scoped — no cross-investigation references
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_workspace_child_lists_are_scoped_per_investigation(client):
    ac, factory = client
    inv_a, _ids_a = await _seed_full_workspace(ac, factory, title="Workspace A")
    inv_b, _ids_b = await _seed_full_workspace(ac, factory, title="Workspace B")

    for resource in ("entities", "relationships", "evidence", "findings", "events"):
        rows_a = (await ac.get(f"/investigations/{inv_a}/{resource}")).json()
        assert rows_a, f"{resource} should be populated"
        assert all(
            row["investigation_id"] == inv_a for row in rows_a
        ), f"{resource} leaked across investigations"

    summary_b = (await ac.get(f"/investigations/{inv_b}/summary")).json()
    assert summary_b["entity_count"] == 2

    # Timeline for A references only A's items.
    timeline = (await ac.get(f"/timeline/{inv_a}")).json()["entries"]
    kinds = {entry["kind"] for entry in timeline}
    assert {"event", "evidence", "finding"} <= kinds
    ref_ids = [entry["ref_id"] for entry in timeline if entry["ref_id"]]
    assert all(ref_id not in _ids_b for ref_id in ref_ids)


# ---------------------------------------------------------------------------
# 4. Workspace detail reads cannot cross investigations (404 hides existence)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_workspace_detail_reads_cannot_cross_investigations(client):
    ac, factory = client
    inv_a, ids_a = await _seed_full_workspace(ac, factory, title="Workspace A")
    inv_b, _ids_b = await _seed_full_workspace(ac, factory, title="Workspace B")

    detail_routes = (
        ("/entities", ids_a["a"]),
        ("/entities", ids_a["b"]),
        ("/relationships", ids_a["relationship"]),
        ("/evidence", ids_a["evidence"]),
        ("/findings", ids_a["finding"]),
        ("/events", ids_a["event"]),
    )

    for route, item_id in detail_routes:
        # Correct scope resolves.
        ok = await ac.get(f"{route}/{item_id}?investigation_id={inv_a}")
        assert (
            ok.status_code == 200
        ), f"{route}/{item_id} should resolve under its own investigation"

        # Wrong scope must look like the item does not exist.
        wrong = await ac.get(f"{route}/{item_id}?investigation_id={inv_b}")
        assert (
            wrong.status_code == 404
        ), f"{route}/{item_id} must not leak under a foreign investigation"
        assert wrong.json()["code"] == "not_found"


# ---------------------------------------------------------------------------
# 5. Directions stay scoped and grounded in their own investigation
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_workspace_directions_are_scoped_and_grounded(client):
    ac, factory = client
    inv_a, ids_a = await _seed_full_workspace(ac, factory, title="Workspace A")
    inv_b, ids_b = await _seed_full_workspace(ac, factory, title="Workspace B")

    directions_a = (await ac.get(f"/investigations/{inv_a}/directions")).json()["directions"]
    assert directions_a

    referenced_a = {
        entity_id
        for direction in directions_a
        for entity_id in direction["related_entity_ids"]
    }
    assert referenced_a
    assert {ids_a["a"], ids_a["b"]} <= referenced_a
    assert ids_b["a"] not in referenced_a and ids_b["b"] not in referenced_a

    # Supporting facts reference only objects that exist in the workspace.
    all_fact_entities = {
        fact["entity_id"]
        for direction in directions_a
        for fact in direction["supporting_facts"]
        if fact["entity_id"]
    }
    assert all_fact_entities <= referenced_a | {ids_a["a"], ids_a["b"]}

    # A direction owned by A is not reachable under B's workspace.
    sample = directions_a[0]
    hidden = await ac.get(f"/investigations/{inv_b}/directions/{sample['id']}")
    assert hidden.status_code == 404
    assert hidden.json()["code"] == "not_found"


# ---------------------------------------------------------------------------
# 6. Workspace responses never leak credentials or raw payload blobs
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_workspace_responses_do_not_leak_secrets_or_payloads(client):
    ac, factory = client
    inv_id, _ids = await _seed_full_workspace(ac, factory)

    secret_markers = (
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

    evidence_list = (await ac.get(f"/investigations/{inv_id}/evidence")).json()
    assert evidence_list
    for row in evidence_list:
        assert "integrity" in row, "evidence rows should expose the integrity block"
        assert not row.get("content"), "evidence rows must not embed raw content"

    for path in (
        f"/investigations/{inv_id}/summary",
        f"/investigations/{inv_id}/evidence",
        f"/investigations/{inv_id}/directions",
        f"/timeline/{inv_id}",
    ):
        raw = await ac.get(path)
        assert raw.status_code == 200
        body_text = raw.text.lower()
        for marker in secret_markers:
            assert marker not in body_text, f"{marker} leaked from {path}"
