"""Blockchain Evidence Integrity Anchoring (Phase 21) tests.

Covers the deterministic primitives (digest, mock provider), the real /api/v2
surface (integrity, blockchain view, anchor, verify), idempotency, mismatch
detection, RBAC (auditors read-only), actor provenance (never client-supplied),
off-chain discipline (no PII / raw content), storage-checksum fallback and
404 isolation.
"""

import hashlib
import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.api.deps import CurrentUser
from app.db.seed import seed_database
from app.evidence_integrity import anchor_digest
from app.evidence_integrity.digest import custody_event_hash
from app.models import (
    Base,
    EvidenceBlockchainAnchor,
    InvestigationEvidence,
)

INV_006 = "6c887c98-939a-50ce-ac27-f58376941de2"
CHECKSUM_1 = "a" * 64
CHECKSUM_2 = "b" * 64


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


async def _evidence_ids(factory):
    async with factory() as session:
        result = await session.execute(
            select(InvestigationEvidence.id)
            .where(InvestigationEvidence.investigation_id == uuid.UUID(INV_006))
            .order_by(InvestigationEvidence.created_at)
            .limit(1)
        )
        return [row[0] for row in result.all()]


async def _set_checksum(factory, evidence_id, checksum):
    async with factory() as session:
        row = await session.get(InvestigationEvidence, evidence_id)
        row.checksum = checksum
        await session.commit()
        return row


# ---------------------------------------------------------------------------
# Deterministic primitives
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_mock_provider_is_deterministic_and_labelled():
    from app.evidence_integrity.providers.mock import MockBlockchainAnchorProvider

    provider = MockBlockchainAnchorProvider()
    assert provider.is_mock is True
    assert provider.network == "trinetra-mock-chain"

    digest = anchor_digest(
        investigation_id=INV_006,
        evidence_id=str(uuid.UUID(int=1)),
        evidence_checksum=CHECKSUM_1,
        custody_chain_hash=CHECKSUM_1,
        sequence=1,
    )
    first = provider.anchor(digest)
    assert first.status == "confirmed"
    assert first.confirmed_at is not None
    second = provider.anchor(digest)
    assert second.transaction_id == first.transaction_id
    assert second.block_number == first.block_number
    assert provider.verify(digest).transaction_id == first.transaction_id

    missing = provider.get_anchor("f" * 64)
    assert missing.status == "not_anchored"
    assert missing.is_mock is True


@pytest.mark.anyio
async def test_digest_deterministic_and_sensitive_to_inputs():
    d1 = anchor_digest(
        investigation_id=INV_006,
        evidence_id=str(uuid.UUID(int=1)),
        evidence_checksum=CHECKSUM_1,
        custody_chain_hash=CHECKSUM_1,
        sequence=1,
    )
    d2 = anchor_digest(
        investigation_id=INV_006,
        evidence_id=str(uuid.UUID(int=1)),
        evidence_checksum=CHECKSUM_1,
        custody_chain_hash=CHECKSUM_1,
        sequence=1,
    )
    assert d1 == d2
    assert len(d1) == 64
    changed = anchor_digest(
        investigation_id=INV_006,
        evidence_id=str(uuid.UUID(int=1)),
        evidence_checksum="c" * 64,
        custody_chain_hash=CHECKSUM_1,
        sequence=1,
    )
    assert changed != d1
    changed_seq = anchor_digest(
        investigation_id=INV_006,
        evidence_id=str(uuid.UUID(int=1)),
        evidence_checksum=CHECKSUM_1,
        custody_chain_hash=CHECKSUM_1,
        sequence=2,
    )
    assert changed_seq != d1


@pytest.mark.anyio
async def test_web3_provider_requires_web3_or_raises_clearly():
    from app.evidence_integrity.providers import ProviderError, resolve_provider

    try:
        resolve_provider("web3")
    except ProviderError as exc:
        assert "web3" in str(exc) or "configured" in str(exc) or "unreachable" in str(exc)
    else:
        # web3 installed + configured: never a mock, never invented ids.
        provider = resolve_provider("web3")
        assert provider.is_mock is False


# ---------------------------------------------------------------------------
# Real surface: integrity read
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_integrity_checksum_unavailable_before_stamp(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]

    resp = await ac.get(f"/evidence/{evidence_id}/integrity")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "CHECKSUM_UNAVAILABLE"
    assert body["custody_events"] == []


@pytest.mark.anyio
async def test_integrity_nonexistent_evidence_404(client):
    ac, factory, _ = client
    await _seed(factory)
    missing = uuid.uuid4()
    resp = await ac.get(f"/evidence/{missing}/integrity")
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"


@pytest.mark.anyio
async def test_integrity_derives_custody_chain(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)

    resp = await ac.get(f"/evidence/{evidence_id}/integrity")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "NOT_ANCHORED"
    assert body["evidence_checksum"] == CHECKSUM_1
    assert body["algorithm_version"] == "evidence-integrity-v1"
    events = body["custody_events"]
    assert len(events) == 1
    assert events[0]["action"] == "EVIDENCE_UPLOADED"
    assert events[0]["sequence"] == 1
    assert events[0]["previous_event_hash"] is None
    assert len(events[0]["current_event_hash"]) == 64
    assert events[0]["metadata"]["event_type"] == "evidence-uploaded"
    # Off-chain discipline: only reference identifiers in the bounded event set.
    allowed = {
        "evidence_id",
        "investigation_id",
        "source",
        "source_id",
        "source_type",
        "record_identifier",
        "event_type",
    }
    assert set(events[0]["metadata"]).issubset(allowed)
    assert body["custody_chain_hash"] == events[0]["current_event_hash"]


# ---------------------------------------------------------------------------
# Anchor
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_anchor_creates_mock_anchor(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)

    resp = await ac.post(
        f"/evidence/{evidence_id}/blockchain/anchor",
        headers={"X-User-Id": "inspector.mehta@trinetra.local"},
        json={"message": "Operation Meridian"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["anchored"] is True
    assert body["already_anchored"] is False
    assert body["verification_state"] == "ANCHORED"
    anchor = body["anchor"]
    assert anchor["status"] == "ANCHORED"
    assert anchor["provider"] == "mock"
    assert anchor["is_mock"] is True
    assert anchor["network"] == "trinetra-mock-chain"
    assert anchor["transaction_id"].startswith("0x")
    assert anchor["block_number"] is not None
    assert anchor["metadata"]["actor"] == "inspector.mehta@trinetra.local"
    # Bounded metadata only — no raw evidence or PII leaked out.
    assert set(anchor["metadata"]).issubset({"actor", "message", "confirmations"})
    assert len(anchor["anchor_digest"]) == 64


@pytest.mark.anyio
async def test_anchor_is_idempotent(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)

    first = await ac.post(f"/evidence/{evidence_id}/blockchain/anchor")
    assert first.status_code == 200
    second = await ac.post(f"/evidence/{evidence_id}/blockchain/anchor")
    assert second.status_code == 200
    second_body = second.json()
    assert second_body["already_anchored"] is True
    assert second_body["anchor"]["anchor_id"] == first.json()["anchor"]["anchor_id"]


@pytest.mark.anyio
async def test_anchor_conflict_on_changed_state(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)

    first = await ac.post(f"/evidence/{evidence_id}/blockchain/anchor")
    assert first.status_code == 200

    await _set_checksum(factory, evidence_id, CHECKSUM_2)
    resp = await ac.post(f"/evidence/{evidence_id}/blockchain/anchor")
    assert resp.status_code == 409
    assert resp.json()["code"] == "conflict"


@pytest.mark.anyio
async def test_anchor_persists_checksum_stamp(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)

    integrity_before = (await ac.get(f"/evidence/{evidence_id}/integrity")).json()
    chain_head_before = integrity_before["custody_chain_hash"]

    await ac.post(f"/evidence/{evidence_id}/blockchain/anchor")
    async with factory() as session:
        row = await session.get(InvestigationEvidence, evidence_id)
        assert row.checksum == CHECKSUM_1
        anchors = list(
            (
                await session.execute(
                    select(EvidenceBlockchainAnchor).where(
                        EvidenceBlockchainAnchor.evidence_id == evidence_id
                    )
                )
            ).scalars()
        )
    assert len(anchors) == 1
    # The persisted anchor references the custody chain head ONLY (the digest
    # binds checksum + chain head + sequence; the chain hash is the head).
    assert anchors[0].custody_chain_hash == chain_head_before
    assert len(anchors[0].custody_chain_hash) == 64
    assert anchors[0].anchor_digest != CHECKSUM_1


# ---------------------------------------------------------------------------
# Blockchain view + verify
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_blockchain_view_after_anchor(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)

    await ac.post(
        f"/evidence/{evidence_id}/blockchain/anchor",
        headers={"X-User-Id": "inspector.mehta@trinetra.local"},
    )

    resp = await ac.get(f"/evidence/{evidence_id}/blockchain")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["verification_state"] == "VERIFIED"
    assert body["anchor"]["is_mock"] is True
    assert body["provider"]["provider"] == "mock"
    assert body["provider"]["is_mock"] is True
    assert body["provider"]["healthy"] is True
    assert body["integrity"]["status"] == "ANCHORED"
    # The custody chain now carries the BLOCKCHAIN_ANCHORED event.
    assert [e["action"] for e in body["integrity"]["custody_events"]] == [
        "EVIDENCE_UPLOADED",
        "BLOCKCHAIN_ANCHORED",
    ]
    assert body["integrity"]["custody_events"][1]["metadata"]["is_mock"] is True


@pytest.mark.anyio
async def test_verify_returns_verified_and_stamps_offset(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)
    await ac.post(f"/evidence/{evidence_id}/blockchain/anchor")

    resp = await ac.post(f"/evidence/{evidence_id}/blockchain/verify")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["verification_state"] == "VERIFIED"
    assert body["verified_at"] is not None
    assert body["on_chain_digest"] == body["anchor"]["anchor_digest"]
    assert body["current_custody_chain_hash"] is not None

    view = (await ac.get(f"/evidence/{evidence_id}/blockchain")).json()
    assert view["last_verified_at"] is not None

    def _ts(value: str):
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone(UTC).replace(tzinfo=None)
        return parsed

    assert _ts(view["last_verified_at"]) == _ts(body["verified_at"])


@pytest.mark.anyio
async def test_verify_without_anchor_is_not_anchored(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)

    resp = await ac.post(f"/evidence/{evidence_id}/blockchain/verify")
    assert resp.status_code == 200, resp.text
    assert resp.json()["verification_state"] == "NOT_ANCHORED"


@pytest.mark.anyio
async def test_mismatch_detected_after_checksum_change(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)
    await ac.post(f"/evidence/{evidence_id}/blockchain/anchor")

    await _set_checksum(factory, evidence_id, CHECKSUM_2)

    integrity = (await ac.get(f"/evidence/{evidence_id}/integrity")).json()
    assert integrity["status"] == "NOT_ANCHORED"

    resp = await ac.post(f"/evidence/{evidence_id}/blockchain/verify")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["verification_state"] == "MISMATCH"
    assert body["current_custody_chain_hash"] != body["anchored_custody_chain_hash"]

    view = (await ac.get(f"/evidence/{evidence_id}/blockchain")).json()
    assert view["verification_state"] == "MISMATCH"


# ---------------------------------------------------------------------------
# Storage-checksum fallback
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_checksum_falls_back_to_payload_hash(tmp_path, client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, None)

    blob_dir = tmp_path / "evidence"
    async with factory() as session:
        row = await session.get(InvestigationEvidence, evidence_id)
        row.storage_ref = "payload-backed"
        await session.commit()
    import json as _json

    blob_data = b"raw-evidence-bytes-for-integrity-check"
    payload_dir = blob_dir / str(evidence_id)
    payload_dir.mkdir(parents=True, exist_ok=True)
    (payload_dir / "payload").write_bytes(blob_data)
    (payload_dir / "meta.json").write_text(
        _json.dumps(
            {
                "evidence_id": str(evidence_id),
                "filename": "x.bin",
                "content_type": "application/octet-stream",
            }
        ),
        encoding="utf-8",
    )

    import app.core.config as config_mod
    config_mod.get_settings.cache_clear()
    config_mod.get_settings().evidence_storage_dir = str(blob_dir)

    expected = hashlib.sha256(blob_data).hexdigest()
    resp = await ac.get(f"/evidence/{evidence_id}/integrity")
    assert resp.status_code == 200, resp.text
    assert resp.json()["evidence_checksum"] == expected

    anchored = await ac.post(f"/evidence/{evidence_id}/blockchain/anchor")
    assert anchored.status_code == 200, anchored.text
    async with factory() as session:
        row = await session.get(InvestigationEvidence, evidence_id)
        assert row.checksum == expected


# ---------------------------------------------------------------------------
# RBAC / actor provenance / isolation
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_auditor_cannot_anchor_but_can_verify(client):
    from app.api.deps import get_current_user

    ac, factory, app = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)

    async def auditor_user():
        return CurrentUser(id="auditor.verma@trinetra.local", role="auditor", groups=["audit"])

    app.dependency_overrides[get_current_user] = auditor_user

    resp = await ac.post(f"/evidence/{evidence_id}/blockchain/anchor")
    assert resp.status_code == 403
    assert resp.json()["code"] == "forbidden"

    read = await ac.get(f"/evidence/{evidence_id}/blockchain")
    assert read.status_code == 200
    assert read.json()["verification_state"] == "NOT_ANCHORED"

    verify = await ac.post(f"/evidence/{evidence_id}/blockchain/verify")
    assert verify.status_code == 200


@pytest.mark.anyio
async def test_actor_identity_comes_from_auth_not_body(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)

    resp = await ac.post(
        f"/evidence/{evidence_id}/blockchain/anchor",
        headers={"X-User-Id": "inspector.mehta@trinetra.local"},
        json={"actor": "sneaky@evil.example"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["anchor"]["metadata"]["actor"] == "inspector.mehta@trinetra.local"


@pytest.mark.anyio
async def test_no_pii_or_raw_payload_reaches_anchor(client):
    ac, factory, _ = client
    await _seed(factory)
    evidence_id = (await _evidence_ids(factory))[0]
    await _set_checksum(factory, evidence_id, CHECKSUM_1)

    resp = await ac.post(f"/evidence/{evidence_id}/blockchain/anchor")
    assert resp.status_code == 200
    raw = resp.text
    # No full source strings, no evidence titles/descriptions, no checksum,
    # no transaction secrets — only reference identifiers and derived digests.
    assert "FIR Records - Pune District" not in raw
    assert "cdr_extract.csv" not in raw
    assert CHECKSUM_1 not in raw
    assert "private" not in raw.lower()
    assert "s3://" not in raw


@pytest.mark.anyio
async def test_anchor_isolation_404_for_unknown_evidence(client):
    ac, factory, _ = client
    await _seed(factory)
    missing = uuid.uuid4()
    resp = await ac.post(f"/evidence/{missing}/blockchain/anchor")
    assert resp.status_code == 404
    resp = await ac.post(f"/evidence/{missing}/blockchain/verify")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Custody chain determinism unit checks
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_custody_event_hash_chains_previous_events():
    ts = datetime(2026, 9, 6, tzinfo=UTC)
    first = custody_event_hash(
        previous_event_hash=None,
        sequence=1,
        action="EVIDENCE_UPLOADED",
        event_timestamp=ts,
        evidence_checksum=CHECKSUM_1,
        metadata_hash="m" * 64,
        actor="system",
    )
    second = custody_event_hash(
        previous_event_hash=first,
        sequence=2,
        action="BLOCKCHAIN_ANCHORED",
        event_timestamp=ts,
        evidence_checksum=CHECKSUM_1,
        metadata_hash="m" * 64,
        actor="system",
    )
    assert first != second
    third_again = custody_event_hash(
        previous_event_hash=first,
        sequence=2,
        action="BLOCKCHAIN_ANCHORED",
        event_timestamp=ts,
        evidence_checksum=CHECKSUM_1,
        metadata_hash="m" * 64,
        actor="system",
    )
    assert second == third_again

    first_retry = custody_event_hash(
        previous_event_hash=None,
        sequence=1,
        action="EVIDENCE_UPLOADED",
        event_timestamp=ts,
        evidence_checksum=CHECKSUM_1,
        metadata_hash="m" * 64,
        actor="system",
    )
    assert first == first_retry
