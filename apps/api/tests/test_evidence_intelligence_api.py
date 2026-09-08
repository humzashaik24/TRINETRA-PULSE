"""Multimedia evidence intelligence API tests (Phase 24).

Covers the real persisted analysis layer over ``/api/v2/evidence``:

- media kind derivation + MIME-mismatch rejection (UNSUPPORTED_MEDIA)
- SHA-256 integrity gate before ANY provider call (EVIDENCE_INTEGRITY_FAILED)
- deterministic provider resolution per capability (VISION / VIDEO /
  TRANSCRIPTION) with no silent mock fallback (PROVIDER_NOT_CONFIGURED)
- mock analysis success paths for IMAGE / VIDEO / AUDIO
- external provider success + auth/unavailable/timeout failure mapping,
  including the persisted FAILED history row
- analysis history appends (no overwrite), investigation scoping, RBAC
- error contract codes
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.api.errors import (
    AnalysisFailedError,
    ProviderAuthenticationFailedError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from app.db.seed import seed_database
from app.evidence_intelligence.mock import run_mock_analysis
from app.models import (
    AIConfigProvider,
    AnalysisStatus,
    Base,
    EvidenceUnderstanding,
    InvestigationEvidence,
    ProviderCapability,
    ProviderType,
)
from app.models.user import UserRole
from app.storage.evidence_storage import EvidenceStorage
from tests.auth_stubs import install_auth_stub


@pytest.fixture
async def client(tmp_path, monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    # Direct every storage read/write at a per-test temp directory.
    storage = EvidenceStorage(tmp_path / "evidence")
    from app.api.routers import evidence as evidence_router
    from app.evidence_intelligence import service as intelligence_service
    from app.services import evidence_integrity

    monkeypatch.setattr(evidence_router, "get_evidence_storage", lambda: storage)
    monkeypatch.setattr(evidence_integrity, "get_evidence_storage", lambda: storage)
    monkeypatch.setattr(intelligence_service, "get_evidence_storage", lambda: storage)

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
        yield ac, factory, app
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


@pytest.mark.anyio
async def _add_mock_provider(factory, capability: ProviderCapability):
    async with factory() as session:
        session.add(
            AIConfigProvider(
                provider_name=f"Deterministic Mock {capability.value}",
                provider_type=ProviderType.MOCK,
                capability=capability,
                model="trinetra-deterministic-local-v0",
                enabled=True,
                is_default=True,
            )
        )
        await session.commit()


@pytest.mark.anyio
async def _add_external_provider(factory, capability: ProviderCapability):
    async with factory() as session:
        session.add(
            AIConfigProvider(
                provider_name="External OpenAI",
                provider_type=ProviderType.OPENAI,
                capability=capability,
                model="gpt-4o-mini",
                base_url="https://openai.test/v1",
                enabled=True,
                is_default=True,
                encrypted_api_key=None,
            )
        )
        await session.commit()


@pytest.mark.anyio
async def _upload(
    ac,
    inv_id,
    filename,
    evidence_type,
    content: bytes,
    content_type,
):
    return await ac.post(
        "/evidence/upload",
        data={
            "investigation_id": inv_id,
            "evidence_type": evidence_type,
            "title": filename,
        },
        files={"file": (filename, content, content_type)},
    )


@pytest.mark.anyio
async def _understanding_count(factory) -> int:
    async with factory() as session:
        result = await session.execute(select(EvidenceUnderstanding))
        return len(list(result.scalars()))


# ---------------------------------------------------------------------------
# 1-3. Mock analysis success for IMAGE / VIDEO / AUDIO
# ---------------------------------------------------------------------------


async def _analyze_image_success(client):
    ac, factory, _app = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_mock_provider(factory, ProviderCapability.VISION)
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", b"scanned:1\n", "image/jpeg")
    assert up.status_code == 201, up.text
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    return ac, factory, inv_id, ev_id, resp


@pytest.mark.anyio
async def test_image_analysis_via_mock_vision(client):
    ac, factory, inv_id, ev_id, resp = await _analyze_image_success(client)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == AnalysisStatus.SUCCEEDED.value
    assert body["media_type"] == "IMAGE"
    assert body["capability"] == "vision"
    assert body["provider_type"] == "mock"
    assert body["mode"] == "MOCK"
    assert len(body["checksum_at_analysis"]) == 64
    assert "image" in body["result"]["summary"].lower()
    assert body["result"]["observations"]
    assert body["result"]["warnings"]


@pytest.mark.anyio
async def test_audio_analysis_via_mock_transcription(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_mock_provider(factory, ProviderCapability.TRANSCRIPTION)
    up = await _upload(ac, inv_id, "call.mp3", "AUDIO", b"audiodata", "audio/mpeg")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["capability"] == "transcription"
    assert body["result"]["transcript"]
    assert body["result"]["segments"]


@pytest.mark.anyio
async def test_video_analysis_via_mock_video(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_mock_provider(factory, ProviderCapability.VIDEO)
    up = await _upload(ac, inv_id, "clip.mp4", "VIDEO", b"videodata", "video/mp4")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["capability"] == "video"
    assert body["result"]["timestamps"]


# ---------------------------------------------------------------------------
# 4-6. Media derivation + MIME-mismatch rejection
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_declared_media_type_mime_mismatch_rejected(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    up = await _upload(ac, inv_id, "fake.png", "IMAGE", b"not an image", "text/plain")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 415
    assert resp.json()["code"] == "UNSUPPORTED_MEDIA"
    assert await _understanding_count(factory) == 0


@pytest.mark.anyio
async def test_undeclared_media_kind_derived_from_mime(client):
    ac, factory, inv_id, ev_id, resp = await _analyze_image_success(client)
    up = await _upload(ac, inv_id, "scan.png", "DOCUMENT", b"pngbytes", "image/png")
    ev_id2 = up.json()["id"]
    resp2 = await ac.post(f"/evidence/{ev_id2}/analyze?investigation_id={inv_id}")
    assert resp2.status_code == 201, resp2.text
    assert resp2.json()["media_type"] == "IMAGE"


@pytest.mark.anyio
async def test_non_media_payload_rejected(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    up = await _upload(ac, inv_id, "notes.txt", "DOCUMENT", b"plain", "text/plain")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 415
    assert resp.json()["code"] == "UNSUPPORTED_MEDIA"


# ---------------------------------------------------------------------------
# 7-9. Provider resolution + no silent mock
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_provider_not_configured_when_no_rows(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", b"x1", "image/jpeg")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 503
    assert resp.json()["code"] == "PROVIDER_NOT_CONFIGURED"


@pytest.mark.anyio
async def test_provider_not_configured_when_all_disabled(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_mock_provider(factory, ProviderCapability.VISION)
    async with factory() as session:
        rows = (await session.execute(select(AIConfigProvider))).scalars().all()
        for row in rows:
            row.enabled = False
        await session.commit()
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", b"x2", "image/jpeg")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 503
    assert resp.json()["code"] == "PROVIDER_NOT_CONFIGURED"


@pytest.mark.anyio
async def test_provider_resolution_is_per_capability(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_mock_provider(factory, ProviderCapability.VISION)
    up = await _upload(ac, inv_id, "call.mp3", "AUDIO", b"aud", "audio/mpeg")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 503
    assert resp.json()["code"] == "PROVIDER_NOT_CONFIGURED"


# ---------------------------------------------------------------------------
# 10-11. Integrity gate
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_integrity_mismatch_blocks_analysis(client, tmp_path):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", b"original bytes", "image/jpeg")
    ev_id = up.json()["id"]
    payload_dir = tmp_path / "evidence" / inv_id / ev_id
    payload_dir.mkdir(parents=True, exist_ok=True)
    (payload_dir / "payload").write_bytes(b"tampered bytes")
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 409
    assert resp.json()["code"] == "EVIDENCE_INTEGRITY_FAILED"
    assert resp.json()["details"]["reason"] == "mismatch"
    assert await _understanding_count(factory) == 0


@pytest.mark.anyio
async def test_metadata_only_evidence_has_no_payload(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    created = await ac.post(
        "/evidence",
        json={
            "investigation_id": inv_id,
            "evidence_type": "IMAGE",
            "title": "Metadata only",
        },
    )
    ev_id = created.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 409
    assert resp.json()["code"] == "EVIDENCE_INTEGRITY_FAILED"
    assert resp.json()["details"]["reason"] == "payload_unavailable"


# ---------------------------------------------------------------------------
# 12-16. External provider success + failure mapping
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_external_openai_vision_success(client, monkeypatch):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_external_provider(factory, ProviderCapability.VISION)

    async def fake_execute(binding, kind, payload, content_type):
        return {
            "summary": "An office entrance is shown.",
            "observations": [{"text": "A person appears near the entrance."}],
            "entities": [],
            "locations": [],
            "warnings": [],
        }

    monkeypatch.setattr(
        "app.evidence_intelligence.service.execute_capability_call", fake_execute
    )
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", b"x3", "image/jpeg")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["provider_type"] == "openai"
    assert body["mode"] == "EXTERNAL"
    assert body["status"] == "succeeded"
    assert "entrance" in body["result"]["summary"]


@pytest.mark.anyio
async def test_external_provider_auth_failure_maps_and_persists(client, monkeypatch):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_external_provider(factory, ProviderCapability.VISION)

    async def fake_execute(binding, kind, payload, content_type):
        raise ProviderAuthenticationFailedError()

    monkeypatch.setattr(
        "app.evidence_intelligence.service.execute_capability_call", fake_execute
    )
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", b"x4", "image/jpeg")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 502
    assert resp.json()["code"] == "PROVIDER_AUTHENTICATION_FAILED"

    listed = await ac.get(f"/evidence/{ev_id}/analyses?investigation_id={inv_id}")
    assert listed.status_code == 200
    history = listed.json()
    assert len(history) == 1
    assert history[0]["status"] == "failed"
    assert history[0]["error_code"] == "PROVIDER_AUTHENTICATION_FAILED"


@pytest.mark.anyio
async def test_external_provider_unavailable_maps(client, monkeypatch):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_external_provider(factory, ProviderCapability.VISION)

    async def fake_execute(binding, kind, payload, content_type):
        raise ProviderUnavailableError()

    monkeypatch.setattr(
        "app.evidence_intelligence.service.execute_capability_call", fake_execute
    )
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", b"x5", "image/jpeg")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 502
    assert resp.json()["code"] == "PROVIDER_UNAVAILABLE"


@pytest.mark.anyio
async def test_external_provider_timeout_maps(client, monkeypatch):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_external_provider(factory, ProviderCapability.VISION)

    async def fake_execute(binding, kind, payload, content_type):
        raise ProviderTimeoutError()

    monkeypatch.setattr(
        "app.evidence_intelligence.service.execute_capability_call", fake_execute
    )
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", b"x6", "image/jpeg")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 504
    assert resp.json()["code"] == "PROVIDER_TIMEOUT"


@pytest.mark.anyio
async def test_external_unreadable_result_maps_to_analysis_failed(client, monkeypatch):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_external_provider(factory, ProviderCapability.VISION)

    async def fake_execute(binding, kind, payload, content_type):
        raise AnalysisFailedError(details={"reason": "provider_output_not_json"})

    monkeypatch.setattr(
        "app.evidence_intelligence.service.execute_capability_call", fake_execute
    )
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", b"x7", "image/jpeg")
    ev_id = up.json()["id"]
    resp = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert resp.status_code == 500
    assert resp.json()["code"] == "ANALYSIS_FAILED"

    listed = await ac.get(f"/evidence/{ev_id}/analyses?investigation_id={inv_id}")
    history = listed.json()
    assert len(history) == 1
    assert history[0]["error_code"] == "ANALYSIS_FAILED"


# ---------------------------------------------------------------------------
# 17. History appends without overwrite, newest first
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_analysis_history_appends_without_overwrite(client):
    ac, factory, inv_id, ev_id, first = await _analyze_image_success(client)
    second = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]

    listed = await ac.get(f"/evidence/{ev_id}/analyses?investigation_id={inv_id}")
    history = listed.json()
    assert len(history) == 2
    assert all(h["status"] == "succeeded" for h in history)
    assert history[0]["id"] == second.json()["id"]  # newest first


# ---------------------------------------------------------------------------
# 18. Investigation scoping (no existence leak)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_analysis_is_investigation_scoped(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    await _add_mock_provider(factory, ProviderCapability.VISION)

    other = await ac.post("/investigations", json={"title": "Other", "status": "draft"})
    other_id = other.json()["id"]
    up = await _upload(ac, other_id, "frame.jpg", "IMAGE", b"x8", "image/jpeg")
    other_ev = up.json()["id"]

    scoped = await ac.get(
        f"/evidence/{other_ev}/analyses?investigation_id={inv_id}"
    )
    assert scoped.status_code == 404
    assert scoped.json()["code"] == "not_found"
    scoped_post = await ac.post(
        f"/evidence/{other_ev}/analyze?investigation_id={inv_id}"
    )
    assert scoped_post.status_code == 404
    assert scoped_post.json()["code"] == "not_found"

    ok = await ac.post(
        f"/evidence/{other_ev}/analyze?investigation_id={other_id}"
    )
    assert ok.status_code == 201


# ---------------------------------------------------------------------------
# 19. History is a pure read (auditor allowed)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_auditor_can_read_history_but_not_analyze(client):
    ac, factory, app = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", b"x9", "image/jpeg")
    ev_id = up.json()["id"]
    # Switch to a read-only auditor BEFORE attempting the actions.
    install_auth_stub(app, role=UserRole.AUDITOR)
    listed = await ac.get(f"/evidence/{ev_id}/analyses?investigation_id={inv_id}")
    assert listed.status_code == 200
    assert listed.json() == []

    forbidden = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert forbidden.status_code == 403
    assert forbidden.json()["code"] == "forbidden"


# ---------------------------------------------------------------------------
# 20. Mock analyzer determinism (standalone unit)
# ---------------------------------------------------------------------------


def test_mock_analyzer_is_deterministic():
    first = run_mock_analysis("IMAGE", b"payload", "image/jpeg")
    second = run_mock_analysis("IMAGE", b"payload", "image/jpeg")
    assert first == second
    assert "placeholder" in " ".join(first["warnings"]).lower()
