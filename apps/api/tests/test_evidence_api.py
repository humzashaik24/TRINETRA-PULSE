"""Evidence API + integrity tests (Phase 17.6).

Covers the real persisted evidence layer:
- investigation-scoped evidence listing
- evidence detail with provenance
- invalid / missing evidence
- cross-investigation rejection
- SHA-256 checksum creation and verification
- payload / storage path safety
- evidence link resolution (provenance references)
- API error contract
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import _uuid, seed_database
from app.models import Base
from app.models.investigation import InvestigationEvidence
from app.services import evidence_integrity
from app.storage.evidence_storage import (
    EvidenceBlob,
    EvidenceStorage,
    EvidenceStorageError,
    LocalFilesystemEvidenceStorage,
)
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


@pytest.mark.anyio
async def _inv_id(factory) -> str:
    async with factory() as session:
        result = await session.execute(select(InvestigationEvidence))
        return str(result.scalars().first().investigation_id)


# ---------------------------------------------------------------------------
# 1. Evidence list is investigation scoped
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_evidence_list_is_investigation_scoped(client):
    ac, factory = client
    await _seed(factory)
    inv_id = await _inv_id(factory)

    resp = await ac.get(f"/investigations/{inv_id}/evidence")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 4
    assert all(row["investigation_id"] == inv_id for row in body)


# ---------------------------------------------------------------------------
# 2. Evidence detail
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_evidence_detail_reads_persisted_data(client):
    ac, factory = client
    await _seed(factory)

    resp = await ac.get(f"/investigations/{_uuid('inv-006')}/evidence")
    ev = resp.json()[0]

    detail = await ac.get(f"/evidence/{ev['id']}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == ev["id"]
    assert body["title"] == ev["title"]
    assert body["evidence_type"] == "FIR"
    assert body["provenance"]["source_id"] == "FIR-2026-001 / R2"


# ---------------------------------------------------------------------------
# 3. Invalid evidence
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_invalid_evidence_missing(client):
    ac, factory = client
    await _seed(factory)
    resp = await ac.get(f"/evidence/{uuid.uuid4()}")
    assert resp.status_code == 404
    body = resp.json()
    assert body["code"] == "not_found"
    assert body["details"]["resource"] == "Evidence"
    assert "status_code" in body


@pytest.mark.anyio
async def test_invalid_evidence_bad_uuid(client):
    ac, factory = client
    await _seed(factory)
    resp = await ac.get("/evidence/not-a-uuid")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 4. Cross-investigation rejection
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_cross_investigation_evidence_rejected(client):
    ac, factory = client
    await _seed(factory)
    inv_id = await _inv_id(factory)

    # Create evidence in a second investigation.
    resp2 = await ac.post("/investigations", json={"title": "Other inv", "status": "draft"})
    other_inv_id = resp2.json()["id"]
    ev = await ac.post(
        "/evidence",
        json={
            "investigation_id": other_inv_id,
            "evidence_type": "REPORT",
            "title": "Other evidence",
        },
    )
    other_ev_id = ev.json()["id"]

    # Scoped read from the wrong investigation must be rejected as not found.
    resp = await ac.get(
        f"/evidence/{other_ev_id}?investigation_id={inv_id}",
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"

    # Reading with the correct investigation scope succeeds.
    ok = await ac.get(
        f"/evidence/{other_ev_id}?investigation_id={other_inv_id}",
    )
    assert ok.status_code == 200
    assert ok.json()["investigation_id"] == other_inv_id


# ---------------------------------------------------------------------------
# 5. Provenance retrieval
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_evidence_provenance_retained(client):
    ac, factory = client
    await _seed(factory)
    detail = await ac.get(f"/investigations/{_uuid('inv-006')}/evidence")
    ev008 = next(e for e in detail.json() if e["title"] == "GST registration")
    assert ev008["provenance"]["source"] == "GST Registry Extract"
    assert ev008["provenance"]["source_id"] == "gst_registry.json #MTC-001"
    assert ev008["provenance"]["confidence"] == 0.9
    assert ev008["metadata"]["record_identifier"] == "GST-MTC-001"


# ---------------------------------------------------------------------------
# 6. Checksum creation
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_evidence_checksum_created_on_create(client):
    ac, factory = client
    await _seed(factory)
    inv_id = await _inv_id(factory)

    resp = await ac.post(
        "/evidence",
        json={
            "investigation_id": inv_id,
            "evidence_type": "IMAGE",
            "title": "Surveillance frame",
            "description": "FLIR capture 04:12",
            "source": "CCTV archive",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["integrity"] is not None
    assert len(body["integrity"]["checksum"]) == 64
    assert body["integrity"]["status"] == "VALID"


@pytest.mark.anyio
async def test_seeded_evidence_has_checksums(client):
    ac, factory = client
    await _seed(factory)
    resp = await ac.get(f"/investigations/{_uuid('inv-006')}/evidence")
    for row in resp.json():
        assert row["integrity"] is not None
        assert len(row["integrity"]["checksum"]) == 64
        assert row["integrity"]["status"] == "VALID"


# ---------------------------------------------------------------------------
# 7. Checksum verification
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_checksum_verification_mismatch(client):
    _, factory = client
    await _seed(factory)
    async with factory() as session:
        result = await session.execute(select(InvestigationEvidence))
        evidence = result.scalars().first()
        status = evidence_integrity.verify_integrity(evidence)
        assert status == evidence_integrity.VALID

        original_metadata = dict(evidence.metadata_ or {})
        evidence.metadata_ = {**original_metadata, "checksum": "deadbeef"}
        await session.flush()
        altered = evidence_integrity.verify_integrity(evidence)
        assert altered == evidence_integrity.MISMATCH

        evidence.metadata_ = {**original_metadata, "checksum": None}
        await session.flush()
        assert evidence_integrity.verify_integrity(evidence) == "MISSING_CHECKSUM"


# ---------------------------------------------------------------------------
# 8. Missing payload behavior
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_missing_payload_raises_storage_error(client):
    storage = EvidenceStorage("/tmp/nonexistent-evidence-store-unused")
    with pytest.raises(EvidenceStorageError):
        storage.load(uuid.uuid4())
    with pytest.raises(EvidenceStorageError):
        storage.delete(uuid.uuid4())


# ---------------------------------------------------------------------------
# 9. Evidence storage path safety
# ---------------------------------------------------------------------------


def test_storage_rejects_non_uuid_path_segments(tmp_path):
    storage = EvidenceStorage(tmp_path / "evidence")
    with pytest.raises(EvidenceStorageError):
        storage.exists("../../etc/passwd")  # type: ignore[arg-type]
    with pytest.raises(EvidenceStorageError):
        storage.load("../../etc/passwd")  # type: ignore[arg-type]
    # Valid UUIDs still work.
    assert storage.exists(uuid.uuid4()) is False


def test_storage_checksum_and_integrity(tmp_path):
    storage = EvidenceStorage(tmp_path / "evidence")
    evidence_id = uuid.uuid4()
    blob = EvidenceBlob(
        evidence_id=evidence_id,
        filename="report.pdf",
        content_type="application/pdf",
        data=b"integrity payload",
        metadata={},
    )
    storage.save(blob)
    assert storage.checksum(evidence_id) == blob.checksum
    assert storage.verify_integrity(evidence_id) == "VALID"
    assert len(blob.checksum) == 64

    # Tamper with the payload → MISMATCH.
    (storage._blob_dir(evidence_id) / "payload").write_bytes(b"tampered")
    assert storage.verify_integrity(evidence_id) == "MISMATCH"


def test_storage_integrity_missing_checksum(tmp_path):
    storage = EvidenceStorage(tmp_path / "evidence")
    evidence_id = uuid.uuid4()
    blob = EvidenceBlob(
        evidence_id=evidence_id,
        filename="a.txt",
        content_type="text/plain",
        data=b"x",
        metadata={},
    )
    storage.save(blob)
    (storage._blob_dir(evidence_id) / "checksum.sha256").unlink()
    assert storage.verify_integrity(evidence_id) == "MISSING_CHECKSUM"


# ---------------------------------------------------------------------------
# 10. Evidence link resolution (provenance references)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_evidence_link_resolution(client):
    ac, factory = client
    await _seed(factory)
    detail = await ac.get(f"/investigations/{_uuid('inv-006')}/evidence")
    fir = next(e for e in detail.json() if e["title"].startswith("FIR"))
    # The evidence carries its source document and record references.
    assert fir["provenance"]["document_id"] == "ent-doc-001"
    assert fir["provenance"]["source"] == "FIR Records - Pune District"
    # Findings reference evidence ids that resolve to seeded rows.
    findings = await ac.get(f"/investigations/{_uuid('inv-006')}/findings")
    inf_refs = findings.json()[0]["entity_refs"]
    assert isinstance(inf_refs, list)


# ---------------------------------------------------------------------------
# 11. API error contract
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_api_error_contract(client):
    ac, factory = client
    await _seed(factory)
    resp = await ac.get(f"/evidence/{uuid.uuid4()}")
    assert resp.status_code == 404
    body = resp.json()
    assert set(body.keys()) == {"code", "message", "details", "status_code"}
    assert body["code"] == "not_found"
    assert body["status_code"] == 404
    assert "Evidence" in body["message"]
    assert body["details"]["id"]


@pytest.mark.anyio
async def test_authenticated_multipart_upload_persists_payload_and_lifecycle(
    client, tmp_path, monkeypatch
):
    ac, factory = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    storage = LocalFilesystemEvidenceStorage(tmp_path)
    from app.api.routers import evidence as evidence_router
    from app.core.config import Settings
    from app.services import evidence_integrity

    monkeypatch.setattr(evidence_router, "get_evidence_storage", lambda: storage)
    monkeypatch.setattr(evidence_integrity, "get_evidence_storage", lambda: storage)
    monkeypatch.setattr(
        evidence_router,
        "get_settings",
        lambda: Settings(evidence_max_upload_bytes=1024),
    )

    response = await ac.post(
        "/evidence/upload",
        data={
            "investigation_id": inv_id,
            "evidence_type": "REPORT",
            "title": "Uploaded report",
        },
        files={"file": ("report.txt", b"authoritative bytes", "text/plain")},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["filename"] == "report.txt"
    assert body["size"] == len(b"authoritative bytes")
    assert body["integrity"]["status"] == "VALID"
    assert body["integrity"]["storage_status"] == "VALID"
    assert body["storage_ref"].endswith("/payload")

    download = await ac.get(f"/evidence/{body['id']}/download?investigation_id={inv_id}")
    assert download.status_code == 200
    assert download.content == b"authoritative bytes"

    async with factory() as session:
        result = await session.execute(
            select(InvestigationEvidence).where(
                InvestigationEvidence.id == uuid.UUID(body["id"])
            )
        )
        item = result.scalar_one()
        assert item.metadata_["payload_checksum"] == body["integrity"]["checksum"]
        assert item.provenance["storage_ref"] == body["storage_ref"]


@pytest.mark.anyio
async def test_multipart_upload_rejects_empty_oversized_and_traversal(
    client, tmp_path, monkeypatch
):
    ac, factory = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    storage = LocalFilesystemEvidenceStorage(tmp_path)
    from app.api.routers import evidence as evidence_router
    from app.core.config import Settings

    monkeypatch.setattr(evidence_router, "get_evidence_storage", lambda: storage)
    monkeypatch.setattr(
        evidence_router,
        "get_settings",
        lambda: Settings(evidence_max_upload_bytes=4),
    )
    base = {"investigation_id": inv_id, "evidence_type": "DOCUMENT"}

    empty = await ac.post(
        "/evidence/upload",
        data=base,
        files={"file": ("x.txt", b"", "text/plain")},
    )
    assert empty.status_code == 400
    oversized = await ac.post(
        "/evidence/upload",
        data=base,
        files={"file": ("x.txt", b"12345", "text/plain")},
    )
    assert oversized.status_code == 400
    traversal = await ac.post(
        "/evidence/upload",
        data=base,
        files={"file": ("../x.txt", b"ok", "text/plain")},
    )
    assert traversal.status_code == 400
