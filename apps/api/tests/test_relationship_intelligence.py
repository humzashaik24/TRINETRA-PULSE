"""Relationship Intelligence & Multi-Source Correlation (Phase 21) tests.

Covers the deterministic domain (vocabulary, correlation keys, scoring,
conflicts, observation derivation) and the real /api/v2 surface (evaluate,
intelligence, observations, evidence linkage, list, confirm, reject, RBAC,
actor provenance, isolation, timeline and graph enrichment).
"""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.api.deps import CurrentUser
from app.db.seed import seed_database
from app.models import (
    Base,
    DataProvenance,
    InvestigationEvidence,
    ProvenanceSourceType,
    Relationship,
    RelationshipType,
)

INV_006 = "6c887c98-939a-50ce-ac27-f58376941de2"


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

    app.dependency_overrides.clear()
    from app.api.deps import get_session

    app.dependency_overrides[get_session] = override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, factory, app
    await engine.dispose()


async def _seed(factory):
    async with factory() as session:
        await seed_database(session)
        await session.commit()


async def _evaluate(ac, inv_id):
    resp = await ac.post(f"/investigations/{inv_id}/relationships/evaluate")
    assert resp.status_code == 200, resp.text
    return resp.json()


async def _relationships(ac, inv_id):
    resp = await ac.get(f"/investigations/{inv_id}/relationships")
    assert resp.status_code == 200, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# Vocabulary
# ---------------------------------------------------------------------------
def test_directed_versus_symmetric_vocabulary():
    from app.relationship_intelligence import is_directed, is_symmetric

    assert is_directed(RelationshipType.TRANSACTION)
    assert is_directed(RelationshipType.COMMUNICATES)
    assert is_directed(RelationshipType.CONTACTS)
    assert is_directed(RelationshipType.OWNS)
    assert is_directed(RelationshipType.LOCATED_AT)
    assert not is_directed(RelationshipType.ASSOCIATED_WITH)

    assert is_symmetric(RelationshipType.ASSOCIATED_WITH)
    assert is_symmetric(RelationshipType.KNOWN_ASSOCIATE)
    assert is_symmetric(RelationshipType.FAMILY)
    assert is_symmetric(RelationshipType.TRAVELS_WITH)
    assert is_symmetric(RelationshipType.MEMBER_OF)
    assert not is_symmetric(RelationshipType.TRANSACTION)


def test_observation_predicate_heuristic():
    from app.relationship_intelligence import observation_predicate

    assert (
        observation_predicate("CDR Extract - Operation clean", ["cdr_extract.csv #1"])
        == "call"
    )
    assert (
        observation_predicate("Bank Transaction Log", ["transactions_flagged.xlsx row 1"])
        == "transfer"
    )
    assert observation_predicate("Field Interview", ["file-09.pdf"]) == "observation"
    assert observation_predicate(None, []) == "observation"


# ---------------------------------------------------------------------------
# Correlation keys
# ---------------------------------------------------------------------------
def test_correlation_key_is_deterministic():
    from app.relationship_intelligence import relationship_correlation_key

    inv = uuid.uuid4()
    k1 = relationship_correlation_key(
        inv, "AAAA", "BBBB", RelationshipType.TRANSACTION, direction="directed"
    )
    k2 = relationship_correlation_key(
        inv, "AAAA", "BBBB", RelationshipType.TRANSACTION, direction="directed"
    )
    assert k1 == k2
    assert len(k1) == 64


def test_correlation_key_symmetric_canonicalises_endpoints():
    from app.relationship_intelligence import relationship_correlation_key

    inv = uuid.uuid4()
    ab = relationship_correlation_key(
        inv, "AAAA", "BBBB", RelationshipType.ASSOCIATED_WITH, direction="symmetric"
    )
    ba = relationship_correlation_key(
        inv, "BBBB", "AAAA", RelationshipType.ASSOCIATED_WITH, direction="symmetric"
    )
    assert ab == ba


def test_correlation_key_directed_preserves_direction():
    from app.relationship_intelligence import relationship_correlation_key

    inv = uuid.uuid4()
    ab = relationship_correlation_key(
        inv, "AAAA", "BBBB", RelationshipType.TRANSACTION, direction="directed"
    )
    ba = relationship_correlation_key(
        inv, "BBBB", "AAAA", RelationshipType.TRANSACTION, direction="directed"
    )
    assert ab != ba


def test_correlation_key_keeps_types_separate():
    from app.relationship_intelligence import relationship_correlation_key

    inv = uuid.uuid4()
    txn = relationship_correlation_key(
        inv, "AAAA", "BBBB", RelationshipType.TRANSACTION, direction="directed"
    )
    comm = relationship_correlation_key(
        inv, "AAAA", "BBBB", RelationshipType.COMMUNICATES, direction="directed"
    )
    assert txn != comm


# ---------------------------------------------------------------------------
# Scoring / conflicts
# ---------------------------------------------------------------------------
def test_linkage_score_derivation():
    from app.relationship_intelligence import confidence_label, linkage_score

    base = linkage_score(
        base_confidence=0.7, source_count=1, observation_count=1, conflict_count=0
    )
    assert base == 0.7

    multi_source = linkage_score(
        base_confidence=0.7, source_count=3, observation_count=1, conflict_count=0
    )
    assert multi_source == pytest.approx(0.8)  # 0.7 + 0.10 cap

    extra_observations = linkage_score(
        base_confidence=0.7, source_count=1, observation_count=3, conflict_count=0
    )
    assert extra_observations == pytest.approx(0.72)  # +0.02, capped at 0.05

    penalised = linkage_score(
        base_confidence=0.9, source_count=2, observation_count=1, conflict_count=1
    )
    assert penalised == pytest.approx(0.75)  # 0.9 + 0.05 - 0.2

    clamped = linkage_score(
        base_confidence=0.99, source_count=2, observation_count=2, conflict_count=0
    )
    assert clamped <= 1.0

    assert confidence_label(0.9) == "HIGH"
    assert confidence_label(0.6) == "MEDIUM"
    assert confidence_label(0.3) == "LOW"


def test_detect_conflicts_duplicate_record_across_sources():
    from app.relationship_intelligence import RELATIONSHIP_CONFLICT, detect_conflicts

    conflicts = detect_conflicts(
        observations=[
            {
                "source_dataset": "CDR A",
                "source_record": "rec-1",
                "confidence": 0.8,
            },
            {
                "source_dataset": "CDR B",
                "source_record": "rec-1",
                "confidence": 0.8,
            },
        ]
    )
    assert any(
        c["type"] == RELATIONSHIP_CONFLICT and c["field"] == "observation.source_record"
        for c in conflicts
    )
    record_conflict = next(c for c in conflicts if c["field"] == "observation.source_record")
    assert record_conflict["sources"] == ["CDR A", "CDR B"]
    assert record_conflict["values"] == ["rec-1"]


def test_detect_conflicts_confidence_divergence():
    from app.relationship_intelligence import detect_conflicts

    conflicts = detect_conflicts(
        observations=[
            {"source_dataset": "A", "source_record": "r1", "confidence": 0.95},
            {"source_dataset": "B", "source_record": "r2", "confidence": 0.55},
        ]
    )
    assert any(c["field"] == "observation.confidence" for c in conflicts)


def test_detect_conflicts_is_clean_for_unique_single_source():
    from app.relationship_intelligence import detect_conflicts

    conflicts = detect_conflicts(
        observations=[
            {"source_dataset": "A", "source_record": "r1", "confidence": 0.9},
            {"source_dataset": "A", "source_record": "r2", "confidence": 0.9},
        ]
    )
    assert conflicts == []


# ---------------------------------------------------------------------------
# API integration — Operation Meridian (seed)
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_evaluate_seed_meridian(client):
    ac, factory, _ = client
    await _seed(factory)
    result = await _evaluate(ac, INV_006)

    assert result["investigation_id"] == INV_006
    assert result["evaluated_relationships"] == 4
    assert result["correlation_groups"] == 4
    assert result["correlated_relationships"] == 0
    assert result["conflicts_detected"] == 0
    assert result["algorithm_version"] == "relationship-intelligence-v1"


@pytest.mark.anyio
async def test_intelligence_read_for_seed_relationship(client):
    ac, factory, _ = client
    await _seed(factory)
    rels = await _relationships(ac, INV_006)

    # rel-001 is the only seed relationship with two evidence references.
    rel_001 = next(r for r in rels if len(r["evidence_refs"]) == 2)
    resp = await ac.get(f"/relationships/{rel_001['id']}/intelligence")
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["relationship_id"] == rel_001["id"]
    assert body["investigation_id"] == INV_006
    # Single-source seed relationships are honest: observed, not correlated.
    assert body["intelligence_status"] == "observed"
    assert body["source_count"] == 1
    # Two distinct evidence refs were un-flattened into two observations
    # without inventing a date.
    assert body["observation_count"] == 2
    assert body["first_observed_at"] is None
    assert body["last_observed_at"] is None
    assert body["linkage_score"] > rel_001["confidence"]
    assert body["confidence_label"] == "HIGH"
    assert body["correlation_version"] == "relationship-intelligence-v1"
    assert len(body["correlation_key"]) == 64
    assert len(body["observations"]) == 2
    for obs in body["observations"]:
        assert obs["provenance"] is False
        assert obs["source_record"] is not None
        assert obs["observed_at"] is None
    # The seed contains a CDR evidence record whose source matches rel-001.
    assert body["evidence"]["linked"] is True
    assert body["evidence"]["evidence_count"] == 1
    assert body["evidence"]["datasets"] == ["CDR Extract - Operation clean"]


@pytest.mark.anyio
async def test_observations_endpoint(client):
    ac, factory, _ = client
    await _seed(factory)
    rels = await _relationships(ac, INV_006)
    rel = rels[0]

    resp = await ac.get(f"/relationships/{rel['id']}/observations")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["relationship_id"] == rel["id"]
    assert body["investigation_id"] == INV_006
    assert body["observations"]
    assert body["algorithm_version"] == "relationship-intelligence-v1"


@pytest.mark.anyio
async def test_evaluate_is_idempotent_and_deterministic(client):
    ac, factory, _ = client
    await _seed(factory)
    first = await _evaluate(ac, INV_006)
    second = await _evaluate(ac, INV_006)
    assert first["evaluated_relationships"] == second["evaluated_relationships"] == 4
    assert first["correlation_groups"] == second["correlation_groups"]
    assert first["conflicts_detected"] == second["conflicts_detected"]


@pytest.mark.anyio
async def test_relationship_read_exposes_intelligence_fields(client):
    ac, factory, _ = client
    await _seed(factory)
    await _evaluate(ac, INV_006)
    rels = await _relationships(ac, INV_006)
    assert all(r["intelligence_status"] == "observed" for r in rels)
    assert all(r["observation_count"] >= 1 for r in rels)
    # Direction is derived on the intelligence surfaces; the additive base
    # read leaves it unset by default (contract preserved).
    assert all(r["direction"] in (None, "directed", "undirected") for r in rels)


@pytest.mark.anyio
async def test_graph_edges_include_intelligence(client):
    ac, factory, _ = client
    await _seed(factory)
    await _evaluate(ac, INV_006)
    graph = (await ac.get(f"/networks/{INV_006}/graph")).json()
    assert graph["edges"]
    for edge in graph["edges"]:
        assert "intelligence_status" in edge
        assert edge["direction"] in ("directed", "undirected")
        assert edge["observation_count"] >= 1
        assert edge["source_count"] == 1


@pytest.mark.anyio
async def test_confirm_flow(client):
    ac, factory, _ = client
    await _seed(factory)
    rels = await _relationships(ac, INV_006)
    rel_id = rels[0]["id"]

    resp = await ac.post(
        f"/relationships/{rel_id}/confirm",
        json={"reason": "Primary subscriber confirmed by both datasets"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["intelligence_status"] == "confirmed"
    assert body["verified_by"] == "inspector.mehta@trinetra.local"
    assert body["verified_at"] is not None
    assert body["rejection_reason"] is None
    audit = body["metadata"]["audit_events"]
    assert audit[-1]["action"] == "CONFIRMED"
    assert audit[-1]["new_state"] == "confirmed"

    # Subsequent evaluation must NOT overwrite an investigator decision.
    await _evaluate(ac, INV_006)
    after = (await ac.get(f"/relationships/{rel_id}/intelligence")).json()
    assert after["intelligence_status"] == "confirmed"


@pytest.mark.anyio
async def test_reject_flow(client):
    ac, factory, _ = client
    await _seed(factory)
    rels = await _relationships(ac, INV_006)
    rel_id = rels[0]["id"]

    resp = await ac.post(
        f"/relationships/{rel_id}/reject",
        json={"reason": "Record duplicates another dataset"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["intelligence_status"] == "rejected"
    assert body["rejection_reason"] == "Record duplicates another dataset"
    assert body["metadata"]["audit_events"][-1]["action"] == "REJECTED"


@pytest.mark.anyio
async def test_actor_identity_comes_from_auth_not_body(client):
    ac, factory, _ = client
    await _seed(factory)
    rels = await _relationships(ac, INV_006)
    rel_id = rels[0]["id"]

    resp = await ac.post(
        f"/relationships/{rel_id}/confirm",
        headers={"X-User-Id": "inspector.mehta@trinetra.local"},
        json={"reason": "ok", "actor_id": "sneaky@evil.example"},
    )
    assert resp.status_code == 200
    assert resp.json()["verified_by"] == "inspector.mehta@trinetra.local"


@pytest.mark.anyio
async def test_auditor_cannot_confirm_or_reject(client):
    from app.api.deps import get_current_user

    ac, factory, app = client
    await _seed(factory)
    rels = await _relationships(ac, INV_006)
    rel_id = rels[0]["id"]

    async def auditor_user():
        return CurrentUser(id="auditor.verma@trinetra.local", role="auditor", groups=["audit"])

    app.dependency_overrides[get_current_user] = auditor_user

    resp = await ac.post(f"/relationships/{rel_id}/confirm", json={"reason": "no"})
    assert resp.status_code == 403
    assert resp.json()["code"] == "forbidden"

    resp = await ac.post(f"/relationships/{rel_id}/reject", json={"reason": "no"})
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_unknown_relationship_404(client):
    ac, factory, _ = client
    await _seed(factory)
    resp = await ac.get("/relationships/11111111-1111-1111-1111-111111111111/intelligence")
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"


@pytest.mark.anyio
async def test_unknown_investigation_evaluate_404(client):
    ac, factory, _ = client
    await _seed(factory)
    resp = await ac.post(
        "/investigations/11111111-1111-1111-1111-111111111111/relationships/evaluate"
    )
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_seed_timeline_has_no_relationship_entries(client):
    ac, factory, _ = client
    await _seed(factory)
    await _evaluate(ac, INV_006)
    timeline = (await ac.get(f"/timeline/{INV_006}")).json()
    assert all(entry["kind"] != "relationship" for entry in timeline["entries"])


# ---------------------------------------------------------------------------
# Synthetic multi-source correlation (not present in seed data)
# ---------------------------------------------------------------------------
async def _make_investigation(ac, title="Correlation Probe"):
    resp = await ac.post(
        "/investigations",
        json={"title": title, "status": "active", "priority": "high"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _add_entity(ac, inv_id, entity_type, name, **extra):
    payload = {
        "investigation_id": inv_id,
        "entity_type": entity_type,
        "name": name,
        **extra,
    }
    resp = await ac.post("/entities", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _add_relationship(
    session,
    *,
    inv_id,
    source_id,
    target_id,
    rtype="transaction",
    confidence=0.7,
    source="Transaction Warehouse",
    evidence_refs=None,
):
    rel = Relationship(
        investigation_id=uuid.UUID(inv_id),
        source_entity_id=uuid.UUID(source_id),
        target_entity_id=uuid.UUID(target_id),
        relationship_type=RelationshipType(rtype),
        confidence=confidence,
        source=source,
        evidence_refs=evidence_refs or [],
    )
    session.add(rel)
    await session.flush()
    return rel


def _provenance(
    rel,
    *,
    inv_id,
    source_name,
    record,
    observed_at,
    confidence=0.7,
):
    return DataProvenance(
        investigation_id=uuid.UUID(inv_id),
        relationship_id=rel.id,
        source_type=ProvenanceSourceType.DATABASE,
        source_name=source_name,
        timestamp=observed_at,
        extraction_method="database_import",
        confidence=confidence,
        evidence_refs=[record],
    )


@pytest.mark.anyio
async def test_multi_source_correlation_and_timeline(client):
    ac, factory, _ = client
    await _seed(factory)

    inv_id = await _make_investigation(ac)
    person = await _add_entity(ac, inv_id, "person", "Rahul Kumar")
    phone = await _add_entity(ac, inv_id, "phone", "+91 99999 00000")

    async with factory() as session:
        rel = await _add_relationship(
            session,
            inv_id=inv_id,
            source_id=person,
            target_id=phone,
            rtype="associated_with",
            confidence=0.6,
            source="Phone Registry",
        )
        session.add(
            _provenance(
                rel,
                inv_id=inv_id,
                source_name="Phone Registry",
                record="reg-row-1",
                observed_at=datetime(2026, 7, 1, tzinfo=UTC),
                confidence=0.6,
            )
        )
        session.add(
            _provenance(
                rel,
                inv_id=inv_id,
                source_name="Service Plan Database",
                record="plan-row-9",
                observed_at=datetime(2026, 7, 3, tzinfo=UTC),
                confidence=0.55,
            )
        )
        await session.commit()
        rel_id = str(rel.id)

    result = await _evaluate(ac, inv_id)
    assert result["evaluated_relationships"] == 1
    assert result["correlated_relationships"] == 1
    assert result["conflicts_detected"] == 0

    body = (await ac.get(f"/relationships/{rel_id}/intelligence")).json()
    assert body["intelligence_status"] == "correlated"
    assert body["source_count"] == 2
    assert body["observation_count"] == 2
    assert body["observation_count"] >= body["source_count"]
    # Provenance timestamps are used verbatim, never invented (SQLite drops
    # the UTC suffix from the serialized value).
    assert body["first_observed_at"].replace("+00:00", "") == "2026-07-01T00:00:00"
    assert body["last_observed_at"].replace("+00:00", "") == "2026-07-03T00:00:00"
    assert all(obs["provenance"] is True for obs in body["observations"])
    assert body["linkage_score"] > 0.6
    # Temporal intelligence now surfaces as a timeline entry.
    timeline = (await ac.get(f"/timeline/{inv_id}")).json()
    rel_entries = [e for e in timeline["entries"] if e["kind"] == "relationship"]
    assert len(rel_entries) == 1
    assert rel_entries[0]["ref_id"] == rel_id


@pytest.mark.anyio
async def test_conflicts_raise_review_required(client):
    ac, factory, _ = client
    await _seed(factory)

    inv_id = await _make_investigation(ac)
    person = await _add_entity(ac, inv_id, "person", "Vikram Patel")
    txn = await _add_entity(ac, inv_id, "transaction", "TXN-8821")

    async with factory() as session:
        rel = await _add_relationship(
            session,
            inv_id=inv_id,
            source_id=person,
            target_id=txn,
            rtype="transaction",
            confidence=0.9,
            source="Bank Log A",
        )
        # The same source record appears under two datasets -> conflict.
        session.add(
            _provenance(
                rel,
                inv_id=inv_id,
                source_name="Bank Log A",
                record="txn-row-1",
                observed_at=datetime(2026, 8, 1, tzinfo=UTC),
                confidence=0.9,
            )
        )
        session.add(
            _provenance(
                rel,
                inv_id=inv_id,
                source_name="Bank Log B",
                record="txn-row-1",
                observed_at=datetime(2026, 8, 1, tzinfo=UTC),
                confidence=0.9,
            )
        )
        await session.commit()
        rel_id = str(rel.id)

    result = await _evaluate(ac, inv_id)
    assert result["conflicts_detected"] == 1
    assert result["correlated_relationships"] == 0

    body = (await ac.get(f"/relationships/{rel_id}/intelligence")).json()
    assert body["intelligence_status"] == "review_required"
    assert body["conflict_flags"]
    assert body["conflict_flags"][0]["type"] == "RELATIONSHIP_CONFLICT"
    # Conflicts penalise the linkage score below base confidence.
    assert body["linkage_score"] < 0.9

    # Investigator decision overrides the system conflict state.
    confirmed = (
        await ac.post(f"/relationships/{rel_id}/confirm", json={"reason": "Reviewed"})
    ).json()
    assert confirmed["intelligence_status"] == "confirmed"
    await _evaluate(ac, inv_id)
    after = (await ac.get(f"/relationships/{rel_id}/intelligence")).json()
    assert after["intelligence_status"] == "confirmed"


@pytest.mark.anyio
async def test_evidence_linkage_and_no_linked_evidence(client):
    ac, factory, _ = client
    await _seed(factory)

    inv_id = await _make_investigation(ac)
    person = await _add_entity(ac, inv_id, "person", "Rahul Kumar")
    org = await _add_entity(ac, inv_id, "organization", "Mumbai Trading Corp")

    async with factory() as session:
        rel = await _add_relationship(
            session,
            inv_id=inv_id,
            source_id=person,
            target_id=org,
            rtype="other",
            confidence=0.8,
            source="GST Registration",
            evidence_refs=["gst-row-42"],
        )
        session.add(
            InvestigationEvidence(
                investigation_id=uuid.UUID(inv_id),
                evidence_type="record",
                title="GST registration",
                source="GST Registration",
                metadata_={"record_identifier": "gst-row-42"},
            )
        )
        session.add(
            InvestigationEvidence(
                investigation_id=uuid.UUID(inv_id),
                evidence_type="report",
                title="Import docs",
                source="Import Dock",
            )
        )
        # A second relationship with no matching evidence source/refs.
        no_link = await _add_relationship(
            session,
            inv_id=inv_id,
            source_id=person,
            target_id=org,
            rtype="other",
            confidence=0.8,
            source="Unknown Source",
        )
        await session.commit()
        rel_id = str(rel.id)
        no_link_id = str(no_link.id)

    support = (await ac.get(f"/relationships/{rel_id}/evidence")).json()
    assert support["linked"] is True
    assert support["evidence_count"] == 1
    assert support["datasets"] == ["GST Registration"]

    # A relationship with nothing matching reports absence, not disproof.
    no_support = (await ac.get(f"/relationships/{no_link_id}/evidence")).json()
    assert no_support["linked"] is False
    assert no_support["evidence_count"] == 0
    assert no_support["message"] == "No linked evidence"


@pytest.mark.anyio
async def test_list_endpoint_is_investigation_scoped(client):
    ac, factory, _ = client
    await _seed(factory)

    inv_id = await _make_investigation(ac)
    person = await _add_entity(ac, inv_id, "person", "Rahul Kumar")
    phone = await _add_entity(ac, inv_id, "phone", "+91 99999 00000")

    async with factory() as session:
        await _add_relationship(
            session,
            inv_id=inv_id,
            source_id=person,
            target_id=phone,
            rtype="associated_with",
            confidence=0.5,
            source="Registry",
            evidence_refs=["reg-row-5"],
        )
        await session.commit()

    await _evaluate(ac, inv_id)
    listing = (
        await ac.get(f"/investigations/{inv_id}/relationships/intelligence")
    ).json()
    assert listing["investigation_id"] == inv_id
    assert len(listing["items"]) == 1
    item = listing["items"][0]
    assert item["intelligence_status"] == "observed"
    assert item["source_count"] == 1
    assert item["evidence_count"] == 0
    assert item["source_entity_name"] == "Rahul Kumar"
    assert item["confidence_label"] == "MEDIUM"
    assert item["direction"] == "undirected"

    # Seed investigation listing is unaffected by the synthetic probe.
    seed_listing = (
        await ac.get(f"/investigations/{INV_006}/relationships/intelligence")
    ).json()
    assert all(i["investigation_id"] == INV_006 for i in seed_listing["items"])
    assert all(i["relationship_id"] != item["relationship_id"] for i in seed_listing["items"])


@pytest.mark.anyio
async def test_call_and_transfer_remain_separate_groups(client):
    ac, factory, _ = client
    await _seed(factory)

    inv_id = await _make_investigation(ac)
    a = await _add_entity(ac, inv_id, "person", "Person A")
    b = await _add_entity(ac, inv_id, "person", "Person B")

    async with factory() as session:
        rel_call = await _add_relationship(
            session,
            inv_id=inv_id,
            source_id=a,
            target_id=b,
            rtype="communicates",
            confidence=0.5,
            source="CDR Calls",
        )
        rel_txn = await _add_relationship(
            session,
            inv_id=inv_id,
            source_id=a,
            target_id=b,
            rtype="transaction",
            confidence=0.5,
            source="Bank Transfers",
        )
        await session.commit()
        call_id = str(rel_call.id)
        txn_id = str(rel_txn.id)

    result = await _evaluate(ac, inv_id)
    assert result["evaluated_relationships"] == 2
    assert result["correlation_groups"] == 2

    call_key = (await ac.get(f"/relationships/{call_id}/intelligence")).json()["correlation_key"]
    txn_key = (await ac.get(f"/relationships/{txn_id}/intelligence")).json()["correlation_key"]
    assert call_key != txn_key
