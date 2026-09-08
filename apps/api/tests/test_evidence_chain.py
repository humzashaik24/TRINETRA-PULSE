"""Evidence chain-of-custody tests (Phase 18.2).

Covers the tamper-evident hash chain from every angle the phase requires:
- deterministic canonicalization / entry-hash hashing
- linkage + sequencing (`previous_entry_hash`, sequence continuity)
- the verification engine (VALID / TAMPERED / BROKEN_CHAIN / MISSING)
- actor resolution (forged / unknown actors are rejected)
- investigation-scope isolation (no cross-investigation existence leak)
- idempotent append retries
- lifecycle integration: evidence creation + CSV ingestion append chains
- seeded Operation Meridian chains verify + cover every supported action
- audit-trail events (chain created / verified / verify-failed)
- auditor (read-only) can read + verify a chain
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import _uuid, seed_database
from app.models import (
    AuthAuditAction,
    AuthAuditEvent,
    Base,
    Dataset,
    DatasetStatus,
    EvidenceChainAction,
    EvidenceChainEntry,
    Investigation,
    InvestigationEvidence,
    UserRole,
)
from app.services import evidence_integrity
from app.services.evidence_chain import (
    BROKEN_CHAIN,
    MISSING,
    TAMPERED,
    VALID,
    EvidenceChainService,
    EvidenceChainVerifier,
    compute_entry_hash,
    compute_metadata_hash,
)
from app.services.real.ingestion import IngestionPipeline
from tests.auth_stubs import install_auth_stub

CHAIN_CDR_CSV = """caller,callee,call_date,duration,location
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


@pytest.fixture
async def db_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    f = async_sessionmaker(engine, expire_on_commit=False)
    async with f() as session:
        await seed_database(session)
        await session.commit()
    yield f
    await engine.dispose()


@pytest.mark.anyio
async def _seed(client):
    ac, factory = client
    async with factory() as session:
        await seed_database(session)
        await session.commit()


@pytest.mark.anyio
async def _inv_id(client) -> str:
    ac, factory = client
    async with factory() as session:
        result = await session.execute(select(InvestigationEvidence))
        return str(result.scalars().first().investigation_id)


@pytest.mark.anyio
async def _fresh_evidence(session) -> InvestigationEvidence:
    inv = (await session.execute(select(Investigation))).scalars().first()
    evidence = InvestigationEvidence(
        investigation_id=inv.id,
        evidence_type="OTHER",
        title=f"Service evidence {uuid.uuid4().hex[:8]}",
        metadata_={"service": True, "canonical_id": f"svc-{uuid.uuid4().hex[:6]}"},
    )
    session.add(evidence)
    await session.flush()
    return evidence


# ---------------------------------------------------------------------------
# 1. Deterministic hashing
# ---------------------------------------------------------------------------


def test_compute_entry_hash_is_deterministic():
    a = compute_entry_hash(
        evidence_id="abc",
        sequence_number=1,
        action="evidence_created",
        payload_hash="p" * 64,
        metadata_hash="m" * 64,
        previous_entry_hash=None,
        actor_email="who@test.local",
    )
    b = compute_entry_hash(
        evidence_id="abc",
        sequence_number=1,
        action="evidence_created",
        payload_hash="p" * 64,
        metadata_hash="m" * 64,
        previous_entry_hash=None,
        actor_email="who@test.local",
    )
    assert a == b
    assert len(a) == 64


def test_compute_entry_hash_changes_with_action_and_actor():
    base = dict(
        evidence_id="abc",
        sequence_number=1,
        payload_hash="p" * 64,
        metadata_hash="m" * 64,
        previous_entry_hash=None,
    )
    h1 = compute_entry_hash(action="evidence_created", **base)
    h2 = compute_entry_hash(action="evidence_uploaded", **base)
    assert h1 != h2
    h3 = compute_entry_hash(action="evidence_created", actor_email="other@test.local", **base)
    assert h1 != h3


def test_metadata_hash_ignores_key_order():
    assert compute_metadata_hash(
        EvidenceChainAction.EVIDENCE_CREATED, {"b": 2, "a": 1}
    ) == compute_metadata_hash(EvidenceChainAction.EVIDENCE_CREATED, {"a": 1, "b": 2})


# ---------------------------------------------------------------------------
# 2. Service: linking + sequencing
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_append_links_entries_and_sequences(db_factory):
    async with db_factory() as session:
        evidence = await _fresh_evidence(session)
        chain = EvidenceChainService(session)
        e1 = await chain.append(evidence=evidence, action=EvidenceChainAction.EVIDENCE_CREATED)
        e2 = await chain.append(evidence=evidence, action=EvidenceChainAction.EVIDENCE_VERIFIED)
        e3 = await chain.append(evidence=evidence, action=EvidenceChainAction.EVIDENCE_ACCESSED)
        await session.commit()

        entries = await chain.list_chain(evidence.id)
        assert [e.sequence_number for e in entries] == [1, 2, 3]
        assert e1.previous_entry_hash == "GENESIS"
        assert e2.previous_entry_hash == e1.entry_hash
        assert e3.previous_entry_hash == e2.entry_hash
        # payload_hash reuses the single authoritative evidence checksum.
        assert e1.payload_hash == evidence_integrity.compute_checksum(evidence)


# ---------------------------------------------------------------------------
# 3. Verification engine
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_verifier_valid(db_factory):
    async with db_factory() as session:
        evidence = await _fresh_evidence(session)
        chain = EvidenceChainService(session)
        await chain.append(
            evidence=evidence, action=EvidenceChainAction.EVIDENCE_CREATED, actor_email="a@x.local"
        )
        await chain.append(
            evidence=evidence, action=EvidenceChainAction.EVIDENCE_VERIFIED, actor_email="a@x.local"
        )
        await session.commit()
        result = await EvidenceChainVerifier(session).verify(evidence)
        assert result["status"] == VALID
        assert result["valid"] is True
        assert result["entries"] == 2


@pytest.mark.anyio
async def test_verifier_tampered_entry(db_factory):
    async with db_factory() as session:
        evidence = await _fresh_evidence(session)
        chain = EvidenceChainService(session)
        await chain.append(
            evidence=evidence, action=EvidenceChainAction.EVIDENCE_CREATED, actor_email="a@x.local"
        )
        await chain.append(
            evidence=evidence, action=EvidenceChainAction.EVIDENCE_ACCESSED, actor_email="a@x.local"
        )
        await session.commit()

        entry = (await chain.list_chain(evidence.id))[1]
        entry.actor_email = "attacker@evil.local"  # hash now mismatches
        await session.commit()

        result = await EvidenceChainVerifier(session).verify(evidence)
        assert result["status"] == TAMPERED
        assert result["valid"] is False


@pytest.mark.anyio
async def test_verifier_tampered_evidence_payload(db_factory):
    async with db_factory() as session:
        evidence = await _fresh_evidence(session)
        await EvidenceChainService(session).append(
            evidence=evidence, action=EvidenceChainAction.EVIDENCE_CREATED, actor_email="a@x.local"
        )
        await session.commit()

        # Mutating the persisted evidence changes its payload checksum, so the
        # chain's stored payload_hash no longer matches.
        evidence.title = "tampered title"
        await session.commit()

        result = await EvidenceChainVerifier(session).verify(evidence)
        assert result["status"] == TAMPERED


@pytest.mark.anyio
async def test_verifier_broken_chain(db_factory):
    async with db_factory() as session:
        evidence = await _fresh_evidence(session)
        chain = EvidenceChainService(session)
        await chain.append(
            evidence=evidence, action=EvidenceChainAction.EVIDENCE_CREATED, actor_email="a@x.local"
        )
        await chain.append(
            evidence=evidence, action=EvidenceChainAction.EVIDENCE_UPLOADED, actor_email="a@x.local"
        )
        await chain.append(
            evidence=evidence, action=EvidenceChainAction.EVIDENCE_VERIFIED, actor_email="a@x.local"
        )
        await session.commit()

        # Deleting the middle entry breaks the link from the successor.
        middle = (await chain.list_chain(evidence.id))[1]
        await session.execute(delete(EvidenceChainEntry).where(EvidenceChainEntry.id == middle.id))
        await session.commit()

        result = await EvidenceChainVerifier(session).verify(evidence)
        assert result["status"] == BROKEN_CHAIN
        assert result["valid"] is False


@pytest.mark.anyio
async def test_verifier_missing(db_factory):
    async with db_factory() as session:
        inv = (await session.execute(select(Investigation))).scalars().first()
        orphan = InvestigationEvidence(
            investigation_id=inv.id,
            evidence_type="OTHER",
            title="Chainless evidence",
            metadata_={"unlinked": True},
        )
        session.add(orphan)
        await session.commit()
        result = await EvidenceChainVerifier(session).verify(orphan)
        assert result["status"] == MISSING
        assert result["valid"] is False


# ---------------------------------------------------------------------------
# 4. Actor resolution — forged / unknown actors rejected
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_forged_actor_is_rejected(db_factory):
    async with db_factory() as session:
        evidence = await _fresh_evidence(session)
        # An id that matches no users row must not attach a dangling FK.
        forged_id = str(uuid.uuid4())
        entry = await EvidenceChainService(session).append(
            evidence=evidence,
            action=EvidenceChainAction.EVIDENCE_ACCESSED,
            actor_id=forged_id,
            actor_email="forged@evil.local",
        )
        await session.commit()
        assert entry.actor_id is None
        assert entry.actor_email == "forged@evil.local"  # snapshot preserved


# ---------------------------------------------------------------------------
# 5. Idempotent retries
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_idempotent_append_retries_keep_chain_valid(db_factory):
    async with db_factory() as session:
        evidence = await _fresh_evidence(session)
        chain = EvidenceChainService(session)
        for _ in range(3):  # retry of the same custody action
            await chain.append(
                evidence=evidence,
                action=EvidenceChainAction.EVIDENCE_UPLOADED,
                actor_email="a@x.local",
            )
        await session.commit()
        entries = await chain.list_chain(evidence.id)
        assert len(entries) == 3
        assert sorted(e.sequence_number for e in entries) == [1, 2, 3]
        await session.commit()
        result = await EvidenceChainVerifier(session).verify(evidence)
        assert result["valid"] is True and result["status"] == VALID


# ---------------------------------------------------------------------------
# 6. Seeded chains
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_seeded_chains_verify_and_cover_all_actions(client):
    await _seed(client)
    ac, factory = client
    inv_id = await _inv_id(client)
    resp = await ac.get(f"/investigations/{inv_id}/evidence")
    assert resp.status_code == 200
    assert len(resp.json()) == 4

    seen_actions: set[str] = set()
    for row in resp.json():
        chain = await ac.get(f"/evidence/{row['id']}/chain")
        assert chain.status_code == 200
        entries = chain.json()
        assert len(entries) >= 1
        seen_actions.update(e["action"] for e in entries)
        verify = await ac.get(f"/evidence/{row['id']}/chain/verify")
        assert verify.status_code == 200
        assert verify.json()["status"] == VALID
        assert verify.json()["valid"] is True

    assert seen_actions == {
        "evidence_created",
        "evidence_uploaded",
        "evidence_accessed",
        "evidence_verified",
        "evidence_metadata_updated",
        "evidence_exported",
    }


@pytest.mark.anyio
async def test_seed_is_idempotent_for_chains(client):
    ac, factory = client
    await _seed(client)
    before = await ac.get(f"/evidence/{_uuid('ev-001')}/chain")
    assert before.status_code == 200
    assert len(before.json()) == 2

    # Re-running the seed must not duplicate chain rows.
    async with factory() as session:
        await seed_database(session)
        await session.commit()
    after = await ac.get(f"/evidence/{_uuid('ev-001')}/chain")
    assert len(after.json()) == len(before.json())


# ---------------------------------------------------------------------------
# 7. Investigation-scope isolation
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_chain_respects_investigation_scope(client):
    ac, factory = client
    await _seed(client)
    inv_id = await _inv_id(client)

    # A fresh investigation owns a new evidence item with its own chain.
    other = await ac.post("/investigations", json={"title": "Other inv"})
    other_inv_id = other.json()["id"]
    ev = await ac.post(
        "/evidence",
        json={"investigation_id": other_inv_id, "evidence_type": "OTHER", "title": "Other"},
    )
    other_ev_id = ev.json()["id"]

    # Reading the chain scoped to the WRONG investigation must 404.
    blocked = await ac.get(f"/evidence/{other_ev_id}/chain?investigation_id={inv_id}")
    assert blocked.status_code == 404
    blocked_verify = await ac.get(f"/evidence/{other_ev_id}/chain/verify?investigation_id={inv_id}")
    assert blocked_verify.status_code == 404
    # The correct scope succeeds.
    ok = await ac.get(f"/evidence/{other_ev_id}/chain")
    assert ok.status_code == 200
    assert len(ok.json()) == 1


# ---------------------------------------------------------------------------
# 8. Lifecycle: creation appends the genesis entry + audit event
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_evidence_appends_genesis_chain_and_audits(client):
    ac, factory = client
    await _seed(client)
    inv_id = await _inv_id(client)

    resp = await ac.post(
        "/evidence",
        json={
            "investigation_id": inv_id,
            "evidence_type": "IMAGE",
            "title": "Scene photo",
            "source": "field team",
        },
    )
    assert resp.status_code == 201
    ev_id = resp.json()["id"]
    assert resp.json()["integrity"]["status"] == VALID

    chain = await ac.get(f"/evidence/{ev_id}/chain")
    assert chain.status_code == 200
    entries = chain.json()
    assert len(entries) == 1
    assert entries[0]["action"] == "evidence_created"
    assert entries[0]["sequence_number"] == 1

    async with factory() as session:
        audits = (
            (
                await session.execute(
                    select(AuthAuditEvent).where(
                        AuthAuditEvent.action == AuthAuditAction.EVIDENCE_CHAIN_CREATED
                    )
                )
            )
            .scalars()
            .all()
        )
        assert any(a.details and a.details.get("evidence_id") == ev_id for a in audits)


# ---------------------------------------------------------------------------
# 9. Lifecycle: CSV ingestion appends uploaded chain entries + checksum
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_ingestion_appends_uploaded_chain_with_checksum(db_factory):
    async with db_factory() as session:
        inv = (
            await session.execute(
                select(Investigation).where(Investigation.title == "Operation Meridian")
            )
        ).scalar_one()
        ds = Dataset(
            investigation_id=inv.id,
            name="CDR Chain Test",
            source_name="CDR Extract",
            format="csv",
            category="structured",
            status=DatasetStatus.VALIDATING,
            file_name="cdr_chain_test.csv",
            file_size=len(CHAIN_CDR_CSV.encode()),
        )
        session.add(ds)
        await session.flush()
        result = await IngestionPipeline(session).run(
            investigation_id=inv.id,
            dataset_id=ds.id,
            file_content=CHAIN_CDR_CSV,
            file_name="cdr_chain_test.csv",
            actor_id=str(uuid.uuid4()),  # unknown actor → no dangling FK
            actor_email="ingest@test.local",
        )
        await session.commit()

        assert result.evidence_created == 3
        rows = (
            (
                await session.execute(
                    select(InvestigationEvidence).where(
                        InvestigationEvidence.investigation_id == inv.id
                    )
                )
            )
            .scalars()
            .all()
        )
        ingested = [r for r in rows if r.metadata_.get("source") == "csv_ingestion"]
        assert len(ingested) == 3
        chain = EvidenceChainService(session)
        for row_ev in ingested:
            assert evidence_integrity.stored_checksum(row_ev) is not None
            entries = await chain.list_chain(row_ev.id)
            assert len(entries) == 1
            assert entries[0].action == EvidenceChainAction.EVIDENCE_UPLOADED
            assert entries[0].actor_email == "ingest@test.local"
            assert entries[0].actor_id is None  # unknown actor not attached
        verifier = EvidenceChainVerifier(session)
        for row_ev in ingested:
            assert (await verifier.verify(row_ev))["status"] == VALID


# ---------------------------------------------------------------------------
# 10. Audit events on explicit verification
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_post_verify_records_audit_success(client):
    ac, factory = client
    await _seed(client)
    ev_id = str(_uuid("ev-001"))

    resp = await ac.post(f"/evidence/{ev_id}/chain/verify")
    assert resp.status_code == 200
    assert resp.json()["status"] == VALID

    async with factory() as session:
        audits = (
            (
                await session.execute(
                    select(AuthAuditEvent).where(
                        AuthAuditEvent.action == AuthAuditAction.EVIDENCE_CHAIN_VERIFIED
                    )
                )
            )
            .scalars()
            .all()
        )
        assert any(a.details and a.details.get("evidence_id") == ev_id for a in audits)


@pytest.mark.anyio
async def test_post_verify_records_audit_failure_on_tamper(client):
    ac, factory = client
    await _seed(client)
    ev_id = str(_uuid("ev-001"))

    async with factory() as session:
        entry = (
            (
                await session.execute(
                    select(EvidenceChainEntry).where(
                        EvidenceChainEntry.evidence_id == _uuid("ev-001")
                    )
                )
            )
            .scalars()
            .first()
        )
        entry.actor_email = "tampered@evil.local"
        await session.commit()

    resp = await ac.post(f"/evidence/{ev_id}/chain/verify")
    assert resp.status_code == 200
    assert resp.json()["status"] == TAMPERED
    assert resp.json()["valid"] is False

    async with factory() as session:
        audits = (
            (
                await session.execute(
                    select(AuthAuditEvent).where(
                        AuthAuditEvent.action == AuthAuditAction.EVIDENCE_CHAIN_VERIFY_FAILED
                    )
                )
            )
            .scalars()
            .all()
        )
        tampered = [a for a in audits if a.details and a.details.get("evidence_id") == ev_id]
        assert tampered and tampered[0].details["status"] == TAMPERED


@pytest.mark.anyio
async def test_get_verify_is_read_only_no_audit(client):
    ac, factory = client
    await _seed(client)
    ev_id = str(_uuid("ev-004"))

    resp = await ac.get(f"/evidence/{ev_id}/chain/verify")
    assert resp.status_code == 200
    assert resp.json()["status"] == VALID

    async with factory() as session:
        audited = (await session.execute(select(AuthAuditEvent))).scalars().all()
        chain_actions = {a.action for a in audited} & {
            AuthAuditAction.EVIDENCE_CHAIN_VERIFIED,
            AuthAuditAction.EVIDENCE_CHAIN_VERIFY_FAILED,
        }
        assert chain_actions == set()


# ---------------------------------------------------------------------------
# 11. Auditor (read-only) can read + verify
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_auditor_can_read_and_verify_chain(client):
    ac, factory = client
    await _seed(client)
    ev_id = str(_uuid("ev-001"))
    app = create_real_app()

    # Re-create an app with an auditor stub mounted for this case only.
    from app.api.deps import CurrentUser, get_current_user, get_session

    async def auditor_current_user() -> CurrentUser:
        return CurrentUser(
            id="11111111-1111-1111-1111-111111111111",
            email="auditor@trinetra.local",
            display_name="Auditor",
            role=UserRole.AUDITOR,
            is_active=True,
        )

    app.dependency_overrides[get_current_user] = auditor_current_user

    async def override_get_session_au():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_session] = override_get_session_au
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac2:
        chain = await ac2.get(f"/evidence/{ev_id}/chain")
        assert chain.status_code == 200
        verify = await ac2.post(f"/evidence/{ev_id}/chain/verify")
        assert verify.status_code == 200
        assert verify.json()["status"] == VALID
