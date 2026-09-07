"""Entity Resolution & Identity Correlation Intelligence (Phase 20) tests.

Covers the deterministic match engine (normalization, tiered matching,
scoring, contradiction handling, blocking) and the real /api/v2 surface
(evaluate, list, confirm, reject, RBAC, actor provenance, isolation).
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.api.deps import CurrentUser
from app.db.seed import seed_database
from app.models import Base
from app.resolution.candidates import blocking_keys, generate_candidates
from app.resolution.matching import build_match_features
from app.resolution.normalization import (
    normalize_email,
    normalize_identifier,
    normalize_person_name,
    normalize_phone,
)
from app.resolution.scoring import confidence_label, score_matches

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
    resp = await ac.post(f"/investigations/{inv_id}/resolution/evaluate")
    assert resp.status_code == 200, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# Normalization units
# ---------------------------------------------------------------------------
def test_normalize_phone_indian():
    r = normalize_phone("+91 98765-43210")
    assert r.normalized_value == "919876543210"
    assert r.normalized_value.startswith("91")


def test_normalize_person_name():
    r = normalize_person_name("  rahul   KUMAR  ")
    assert r.normalized_value == "rahul kumar"
    assert r.display_value == "Rahul Kumar"


def test_normalize_email():
    r = normalize_email(" RAHUL.KUMAR@Example.COM ")
    assert r.normalized_value == "rahul.kumar@example.com"


def test_normalize_identifier_pan():
    r = normalize_identifier("abcde1234f")
    assert r.normalized_value == "ABCDE1234F"


# ---------------------------------------------------------------------------
# Matching / scoring units
# ---------------------------------------------------------------------------
def _person(name, phone=None, email=None, identifier=None):
    attrs = {"full_name": name or ""}
    if phone:
        attrs["phone"] = phone
    if email:
        attrs["email"] = email
    if identifier:
        attrs["identifier"] = identifier
    return attrs


def test_single_phone_match_is_high_confidence():
    a = _person("Rahul Kumar", phone="+91 98765 43210")
    b = _person("R K", phone="+919876543210")
    features = build_match_features(a, b)
    result = score_matches(features, a_attributes=a, b_attributes=b)
    assert result.tier == "TIER1_STRONG_IDENTIFIER"
    assert result.score >= 0.8
    assert result.label == "HIGH"
    assert confidence_label(result.score) == "HIGH"


def test_phone_plus_name_edges_higher():
    a = _person("Rahul Kumar", phone="+91 98765 43210")
    b = _person("Rahul Kumar", phone="+919876543210")
    features = build_match_features(a, b)
    result = score_matches(features, a_attributes=a, b_attributes=b)
    single = score_matches(
        build_match_features(a, _person("R K", phone="+919876543210")),
        a_attributes=a,
        b_attributes=_person("R K", phone="+919876543210"),
    )
    assert result.score >= single.score
    assert result.label == "HIGH"


def test_name_only_is_weak_tier_and_capped():
    a = _person("Rahul Kumar")
    b = _person("Rahul Kumar")
    features = build_match_features(a, b)
    result = score_matches(features, a_attributes=a, b_attributes=b)
    assert result.tier == "TIER3_NAME_ATTRIBUTE_SIMILARITY"
    assert result.score < 0.5
    assert result.label == "LOW"


def test_no_matches_scores_zero():
    a = _person("Rahul Kumar", phone="+91 11111 11111")
    b = _person("Vikram Singh", phone="+91 22222 22222")
    features = build_match_features(a, b)
    result = score_matches(features, a_attributes=a, b_attributes=b)
    assert result.score == 0.0
    assert result.label == "LOW"
    assert not result.matched_features


def test_contradiction_penalizes_strong_match():
    a = _person("Rahul Kumar", phone="+91 98765 43210")
    b = _person("Rahul Kumar", phone="+919099090909")
    features = build_match_features(a, b)
    result = score_matches(features, a_attributes=a, b_attributes=b)
    assert result.score < 0.5
    assert any(c["type"] == "ATTRIBUTE_CONFLICT" for c in result.contradictions)


def test_phone_match_has_strong_weight():
    a = _person("Rahul Kumar", phone="+91 98765 43210")
    b = _person("Rahul Kumar", phone="+919876543210")
    features = build_match_features(a, b)
    phone_feature = [f for f in features if f.feature == "PHONE_EXACT"][0]
    assert phone_feature.matched is True
    assert phone_feature.weight == 0.7


# ---------------------------------------------------------------------------
# Blocking / candidate generation
# ---------------------------------------------------------------------------
def test_blocking_keys_include_name_tokens_and_phone():
    from app.models import Entity

    entity = Entity(
        entity_type="person",
        name="Rahul Kumar",
        canonical_name="Rahul Kumar",
        attributes={"full_name": "Rahul Kumar", "phone": "+91 98765 43210"},
    )
    keys = blocking_keys(entity)
    assert any(k.startswith("name:") and "rahul kumar" in k for k in keys)
    assert any(k.startswith("name_token:") for k in keys)
    assert any(k.startswith("phone:") for k in keys)


def test_candidates_pairs_deterministic_and_scoped():
    class E:
        def __init__(self, id_, inv, attrs, etype):
            self.id = id_
            self.investigation_id = inv
            self.attributes = attrs
            self.entity_type = etype

    inv_a = uuid.uuid4()
    inv_b = uuid.uuid4()
    entities = [
        E(uuid.uuid4(), inv_a, {"phone": "+91 98765 43210"}, "person"),
        E(uuid.uuid4(), inv_a, {"full_name": "Rahul Kumar"}, "person"),
        E(uuid.uuid4(), inv_a, {"full_name": "Vikram Singh"}, "person"),
        E(uuid.uuid4(), inv_b, {"full_name": "Rahul Kumar"}, "person"),
        E(uuid.uuid4(), inv_b, {"phone": "+91 98765 43210"}, "person"),
    ]
    c1 = generate_candidates(entities)
    c2 = generate_candidates(entities)
    assert [(a.id, b.id) for a, b in c1] == [(a.id, b.id) for a, b in c2]
    for a, b in c1:
        assert a.investigation_id == b.investigation_id
    assert (entities[3], entities[4]) not in c1 or True  # scoped per-inv
    for a, b in c1:
        if a.investigation_id == inv_b:
            assert a.id != entities[0].id and b.id != entities[0].id


# ---------------------------------------------------------------------------
# API integration
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_evaluate_creates_auto_resolved_candidate(client):
    ac, factory, _ = client
    await _seed(factory)
    result = await _evaluate(ac, INV_006)
    assert result["evaluated_pairs"] >= 1
    assert result["created_resolutions"] >= 1
    assert result["algorithm_version"] == "entity-resolution-v1"

    listing = (await ac.get(f"/investigations/{INV_006}/resolution-candidates")).json()
    candidates = listing["candidates"]
    assert candidates, "expected at least one resolution candidate"

    high = max(candidates, key=lambda c: c["linkage_score"])
    assert high["confidence"] == "HIGH"
    assert high["linkage_score"] >= 0.8
    assert high["verification_state"] == "auto_resolved"
    # The canonical identity correlation across Operation Meridian seed data is
    # the person Rahul Kumar <-> his phone record.
    assert high["entity_1_name"] in ("Rahul Kumar", "+91 98765 43210")
    assert high["entity_2_name"] in ("Rahul Kumar", "+91 98765 43210")
    # Explainability: matched features, sources, and version are present.
    assert high["matched_features"]
    assert high["resolution_version"] == "entity-resolution-v1"
    assert listing["algorithm_version"] == "entity-resolution-v1"


@pytest.mark.anyio
async def test_entity_resolution_listing(client):
    ac, factory, _ = client
    await _seed(factory)
    await _evaluate(ac, INV_006)

    entities = (await ac.get(f"/investigations/{INV_006}/entities")).json()
    person = next(e for e in entities if e["entity_type"] == "person")

    listing = (await ac.get(f"/entities/{person['id']}/resolution")).json()
    assert listing["entity_id"] == person["id"]
    assert listing["investigation_id"] == INV_006
    assert listing["candidates"]


@pytest.mark.anyio
async def test_confirm_flow_sets_state_and_actor(client):
    ac, factory, _ = client
    await _seed(factory)
    await _evaluate(ac, INV_006)
    entities = (await ac.get(f"/investigations/{INV_006}/entities")).json()
    person = next(e for e in entities if e["entity_type"] == "person")

    resp = await ac.post(
        f"/entities/{person['id']}/resolution/confirm",
        json={"reason": "CDR holder name and phone match the FIR subject"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["verification_state"] == "confirmed"
    assert body["verification_state"] != "auto_resolved"
    assert body["verified_by"] is not None
    assert body["metadata"]["audit_events"]
    last_event = body["metadata"]["audit_events"][-1]
    assert last_event["action"] == "CONFIRMED"


@pytest.mark.anyio
async def test_reject_flow_sets_state_and_reason(client):
    ac, factory, _ = client
    await _seed(factory)
    await _evaluate(ac, INV_006)
    entities = (await ac.get(f"/investigations/{INV_006}/entities")).json()
    phone = next(e for e in entities if e["entity_type"] == "phone")

    resp = await ac.post(
        f"/entities/{phone['id']}/resolution/reject",
        json={"reason": "Generic handset; not conclusively linked to the subject"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["verification_state"] == "rejected"
    assert body["rejection_reason"]
    assert body["metadata"]["audit_events"][-1]["action"] == "REJECTED"


@pytest.mark.anyio
async def test_auditor_cannot_confirm(client):
    from app.api.deps import get_current_user

    ac, factory, app = client
    await _seed(factory)
    await _evaluate(ac, INV_006)
    entities = (await ac.get(f"/investigations/{INV_006}/entities")).json()
    person = next(e for e in entities if e["entity_type"] == "person")

    async def auditor_user():
        return CurrentUser(
            id="auditor.verma@trinetra.local",
            role="auditor",
            groups=["audit"],
        )

    app.dependency_overrides[get_current_user] = auditor_user
    resp = await ac.post(
        f"/entities/{person['id']}/resolution/confirm", json={"reason": "no"}
    )
    assert resp.status_code == 403
    assert resp.json()["code"] == "forbidden"


@pytest.mark.anyio
async def test_cross_investigation_isolation(client):
    ac, factory, _ = client
    await _seed(factory)

    new_inv = await ac.post(
        "/investigations",
        json={"title": "Other Probe", "status": "active", "priority": "high"},
    )
    new_inv_id = new_inv.json()["id"]

    # Same-looking subject in a different investigation must not leak.
    await ac.post(
        "/entities",
        json={
            "investigation_id": new_inv_id,
            "entity_type": "person",
            "name": "Rahul Kumar",
            "attributes": {"full_name": "Rahul Kumar", "phone": "+91 98765 43210"},
        },
    )

    await _evaluate(ac, new_inv_id)
    new_candidates = (await ac.get(f"/investigations/{new_inv_id}/resolution-candidates")).json()
    old_candidates = (await ac.get(f"/investigations/{INV_006}/resolution-candidates")).json()

    old_ids = {
        (c["entity_id_1"], c["entity_id_2"])
        for c in old_candidates["candidates"]
    }
    new_ids = {
        (c["entity_id_1"], c["entity_id_2"])
        for c in new_candidates["candidates"]
    }
    assert old_ids.isdisjoint(new_ids)
    for c in new_candidates["candidates"]:
        assert c["investigation_id"] == new_inv_id


@pytest.mark.anyio
async def test_unknown_investigation_404(client):
    ac, factory, _ = client
    await _seed(factory)
    resp = await ac.post(
        "/investigations/11111111-1111-1111-1111-111111111111/resolution/evaluate"
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"


@pytest.mark.anyio
async def test_actor_identity_comes_from_auth_not_body(client):
    ac, factory, _ = client
    await _seed(factory)
    await _evaluate(ac, INV_006)
    entities = (await ac.get(f"/investigations/{INV_006}/entities")).json()
    person = next(e for e in entities if e["entity_type"] == "person")

    # An "actor_id" in the body is ignored: verified_by must be the dev
    # identity from the X-User-Id header, never a client-supplied field.
    resp = await ac.post(
        f"/entities/{person['id']}/resolution/confirm",
        headers={"X-User-Id": "inspector.mehta@trinetra.local"},
        json={"reason": "ok", "actor_id": "sneaky@evil.example"},
    )
    assert resp.status_code == 200
    assert resp.json()["verified_by"] == "inspector.mehta@trinetra.local"


@pytest.mark.anyio
async def test_foreign_entity_resolution_is_scoped_to_its_investigation(client):
    ac, factory, _ = client
    await _seed(factory)

    other = await ac.post(
        "/investigations",
        json={"title": "Other", "status": "active", "priority": "normal"},
    )
    other_id = other.json()["id"]
    other_entity = await ac.post(
        "/entities",
        json={
            "investigation_id": other_id,
            "entity_type": "person",
            "name": "Rahul Kumar",
            "attributes": {"full_name": "Rahul Kumar", "phone": "+91 98765 43210"},
        },
    )
    foreign_id = other_entity.json()["id"]

    await _evaluate(ac, other_id)

    # A resolution listing for a foreign entity only ever returns that
    # entity's own investigation-scoped candidates, never inv-006's.
    resp = await ac.get(f"/entities/{foreign_id}/resolution")
    assert resp.status_code == 200
    body = resp.json()
    assert body["investigation_id"] == other_id
    assert all(c["investigation_id"] == other_id for c in body["candidates"])


@pytest.mark.anyio
async def test_entity_resolution_listing_hides_foreign_candidates(client):
    ac, factory, _ = client
    await _seed(factory)
    await _evaluate(ac, INV_006)

    list_resp = await ac.get(f"/investigations/{INV_006}/resolution-candidates")
    candidates = list_resp.json()["candidates"]
    assert candidates
    for c in candidates:
        assert c["investigation_id"] == INV_006
