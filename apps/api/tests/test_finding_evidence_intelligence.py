"""Finding & Evidence Intelligence tests (Phase 28).

Phase 28 connects the persisted findings surface to its evidence traceability
context (integrity, custody chain, analyses) inside the investigation
workspace WITHOUT adding new endpoints or a migration — the workspace
reassembles existing contracts. These tests lock in the exact contracts the
Finding & Evidence Intelligence surface depends on:

1. access control — findings reads and every evidence-context read require an
   authenticated actor (401)
2. investigation-scoped findings with grounded references — every persisted
   finding's ``entity_refs`` and ``metadata.evidence_ids`` resolve to objects
   that belong to the SAME investigation
3. evidence traceability reads work for the evidence a finding references —
   detail, integrity block, custody chain, chain verification and analyses
   all resolve within the finding's own investigation scope
4. grounded relationships — the workspace exposes relationships that connect
   the entities a finding references
5. cross-investigation isolation — a finding and its referenced evidence are
   invisible (404 not_found) under any other investigation's scope, including
   the evidence-context reads
6. empty findings — an investigation without findings reports an honest empty
   list, never fabricated rows
7. safe errors — missing resources are a hidden 404, malformed ids a 422
8. no secret leakage — finding and evidence-context responses never expose
   credentials or raw payload blobs

The surface stays strictly read-only: nothing here mutates data or ascribes
judgement.
"""

from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import _uuid, seed_database
from app.models import Base
from tests.auth_stubs import install_auth_stub

# ---------------------------------------------------------------------------
# Operation Meridian canonical ids used by Phase 28 contracts.
# inf-006-1 references evidence ev-004 and entities ent-person-001 /
# ent-phone-001; those two entities are also the endpoints of rel-001.
# ---------------------------------------------------------------------------

INV_ID = str(_uuid("inv-006"))
FINDING_1 = str(_uuid("inf-006-1"))
FINDING_2 = str(_uuid("inf-006-2"))
EV_004 = str(_uuid("ev-004"))
EV_007 = str(_uuid("ev-007"))
ENT_PERSON_001 = str(_uuid("ent-person-001"))
ENT_PHONE_001 = str(_uuid("ent-phone-001"))

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


# ---------------------------------------------------------------------------
# 1. Access control — every findings / evidence-context read needs an actor
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_findings_and_evidence_context_require_authentication(public_client):
    ac = public_client
    missing = str(uuid4())
    for path in (
        f"/investigations/{missing}/findings",
        f"/findings/{missing}?investigation_id={missing}",
        f"/evidence/{missing}?investigation_id={missing}",
        f"/evidence/{missing}/integrity?investigation_id={missing}",
        f"/evidence/{missing}/chain?investigation_id={missing}",
        f"/evidence/{missing}/chain/verify?investigation_id={missing}",
        f"/evidence/{missing}/analyses?investigation_id={missing}",
    ):
        response = await ac.get(path)
        assert response.status_code == 401, f"{path} should be auth guarded"


# ---------------------------------------------------------------------------
# 2. Investigation-scoped findings with grounded references
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_scoped_findings_resolve_within_the_same_investigation(client):
    ac, factory = client
    await _seed(factory)

    findings = (await ac.get(f"/investigations/{INV_ID}/findings")).json()
    assert len(findings) == 2
    assert all(f["investigation_id"] == INV_ID for f in findings)

    by_id = {f["id"]: f for f in findings}
    first = by_id[FINDING_1]
    assert first["metadata"]["evidence_ids"] == [EV_004]
    assert set(first["entity_refs"]) == {ENT_PERSON_001, ENT_PHONE_001}

    second = by_id[FINDING_2]
    assert second["metadata"]["evidence_ids"] == [EV_007]
    assert ENT_PERSON_001 in second["entity_refs"]

    # Every referenced object addressable under the SAME investigation scope.
    evidence_ids = {eid for f in findings for eid in f["metadata"].get("evidence_ids", [])}
    entity_refs = {ref for f in findings for ref in f["entity_refs"]}
    for eid in evidence_ids:
        resp = await ac.get(f"/evidence/{eid}?investigation_id={INV_ID}")
        assert resp.status_code == 200
        assert resp.json()["investigation_id"] == INV_ID
    for ref in entity_refs:
        resp = await ac.get(f"/entities/{ref}?investigation_id={INV_ID}")
        assert resp.status_code == 200
        assert resp.json()["investigation_id"] == INV_ID


# ---------------------------------------------------------------------------
# 3. Evidence traceability context for the evidence a finding references
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_finding_referenced_evidence_exposes_traceability_context(client):
    ac, factory = client
    await _seed(factory)

    finding = await ac.get(f"/findings/{FINDING_1}?investigation_id={INV_ID}")
    assert finding.status_code == 200
    body = finding.json()
    assert body["title"] == "Coordinate cluster around the primary device"
    assert body["severity"] == "medium"
    assert body["confidence"] == "inferred"
    assert body["status"] == "open"
    assert body["metadata"]["evidence_ids"] == [EV_004]

    # The referenced evidence detail carries the integrity block, never content.
    detail = await ac.get(f"/evidence/{EV_004}?investigation_id={INV_ID}")
    assert detail.status_code == 200
    ev = detail.json()
    assert ev["title"] == "CDR subscriber records"
    assert ev["evidence_type"] == "COMMUNICATION"
    assert "integrity" in ev
    assert not ev.get("content"), "evidence must not embed a raw payload"

    # Integrity-focused detail is a pure read of the same scoped row.
    integrity = await ac.get(f"/evidence/{EV_004}/integrity?investigation_id={INV_ID}")
    assert integrity.status_code == 200
    assert integrity.json()["id"] == EV_004

    # Custody chain + verification return the persisted, verifiable chain.
    chain = await ac.get(f"/evidence/{EV_004}/chain?investigation_id={INV_ID}")
    assert chain.status_code == 200
    entries = chain.json()
    assert len(entries) >= 1
    assert all(e["evidence_id"] == EV_004 for e in entries)

    verify = await ac.get(f"/evidence/{EV_004}/chain/verify?investigation_id={INV_ID}")
    assert verify.status_code == 200
    v = verify.json()
    assert v["valid"] is True
    assert v["status"] == "VALID"
    assert v["entries"] == len(entries)
    assert v["chain_head_hash"]

    # Analyses surface as a (possibly empty) scoped list.
    analyses = await ac.get(f"/evidence/{EV_004}/analyses?investigation_id={INV_ID}")
    assert analyses.status_code == 200
    assert isinstance(analyses.json(), list)


# ---------------------------------------------------------------------------
# 4. Grounded relationships among the entities a finding references
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_finding_entities_are_connected_by_grounded_relationships(client):
    ac, factory = client
    await _seed(factory)

    finding = (await ac.get(f"/findings/{FINDING_1}?investigation_id={INV_ID}")).json()
    refs = set(finding["entity_refs"])
    assert {ENT_PERSON_001, ENT_PHONE_001} <= refs

    relationships = (await ac.get(f"/investigations/{INV_ID}/relationships")).json()
    assert relationships, "workspace should expose grounded relationships"
    assert all(r["investigation_id"] == INV_ID for r in relationships)

    # rel-001 connects the two entities referenced by this finding.
    between = [
        r for r in relationships if r["source_entity_id"] in refs and r["target_entity_id"] in refs
    ]
    assert between, "finding entities should be connected by a grounded relationship"
    assert any(r["source_entity_id"] == ENT_PERSON_001 for r in relationships)


# ---------------------------------------------------------------------------
# 5. Cross-investigation isolation (finding + referenced evidence context)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_finding_and_evidence_context_reject_foreign_scope(client):
    ac, factory = client
    await _seed(factory)
    other_id = await _create_other_investigation(ac)

    # Finding + its referenced evidence are invisible under a foreign scope.
    wrong_finding = await ac.get(f"/findings/{FINDING_1}?investigation_id={other_id}")
    assert wrong_finding.status_code == 404
    assert wrong_finding.json()["code"] == "not_found"

    for path in (
        f"/evidence/{EV_004}?investigation_id={other_id}",
        f"/evidence/{EV_004}/integrity?investigation_id={other_id}",
        f"/evidence/{EV_004}/chain?investigation_id={other_id}",
        f"/evidence/{EV_004}/chain/verify?investigation_id={other_id}",
        f"/evidence/{EV_004}/analyses?investigation_id={other_id}",
    ):
        resp = await ac.get(path)
        assert resp.status_code == 404, f"{path} must not leak across investigations"
        assert resp.json()["code"] == "not_found"

    # The foreign investigation reports no findings — Meridian's never leak in.
    foreign_findings = (await ac.get(f"/investigations/{other_id}/findings")).json()
    assert foreign_findings == []

    # Correct scope still resolves after the foreign reads.
    assert (await ac.get(f"/findings/{FINDING_1}?investigation_id={INV_ID}")).status_code == 200
    assert (await ac.get(f"/evidence/{EV_004}?investigation_id={INV_ID}")).status_code == 200


# ---------------------------------------------------------------------------
# 6. Empty findings — honest empty list, never fabricated rows
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_investigation_without_findings_reports_an_empty_list(client):
    ac, factory = client
    await _seed(factory)
    inv_id = await _create_other_investigation(ac)

    response = await ac.get(f"/investigations/{inv_id}/findings")
    assert response.status_code == 200
    assert response.json() == []

    # A missing investigation reports 404, not an empty list for a phantom.
    missing = await ac.get(f"/investigations/{uuid4()}/findings")
    assert missing.status_code == 404
    assert missing.json()["code"] == "not_found"


# ---------------------------------------------------------------------------
# 7. Safe errors — hidden 404s, malformed ids as 422
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_missing_and_malformed_ids_return_safe_errors(client):
    ac, factory = client
    await _seed(factory)

    missing_finding = await ac.get(f"/findings/{uuid4()}?investigation_id={INV_ID}")
    assert missing_finding.status_code == 404
    body = missing_finding.json()
    assert body["code"] == "not_found"
    assert body["details"]["resource"] == "Findings"

    for path in (
        f"/findings/not-a-uuid?investigation_id={INV_ID}",
        f"/evidence/not-a-uuid?investigation_id={INV_ID}",
        f"/evidence/not-a-uuid/chain/verify?investigation_id={INV_ID}",
    ):
        resp = await ac.get(path)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 8. No secret / payload leakage in findings + evidence-context responses
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_finding_and_evidence_context_responses_do_not_leak_secrets(client):
    ac, factory = client
    await _seed(factory)

    paths = (
        f"/investigations/{INV_ID}/findings",
        f"/findings/{FINDING_1}?investigation_id={INV_ID}",
        f"/evidence/{EV_004}?investigation_id={INV_ID}",
        f"/evidence/{EV_004}/integrity?investigation_id={INV_ID}",
        f"/evidence/{EV_004}/chain?investigation_id={INV_ID}",
        f"/evidence/{EV_004}/chain/verify?investigation_id={INV_ID}",
        f"/evidence/{EV_004}/analyses?investigation_id={INV_ID}",
    )

    for path in paths:
        raw = await ac.get(path)
        assert raw.status_code == 200
        body_text = raw.text.lower()
        for marker in SECRET_MARKERS:
            assert marker not in body_text, f"{marker} leaked from {path}"
        assert "content_base64" not in body_text
        assert '"content":' not in body_text.replace("content_type", "content_type_x")
