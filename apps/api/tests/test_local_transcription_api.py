"""Local (in-browser) transcription API tests (Phase 25).

Covers ``POST /evidence/{id}/analyses/local-transcription`` which persists a
result produced on-device by Whisper into the shared, immutable
``EvidenceUnderstanding`` layer with ``provider_type=LOCAL``:

- AUDIO-only restriction (UNSUPPORTED_AUDIO_FORMAT)
- server-authority SHA-256 re-verification (browser checksum never trusted)
- strict transcript / segment / metadata validation (INVALID_TRANSCRIPT)
- investigation scoping, RBAC (CanMutateDep), audit + custody events
- no credential / transcript leakage into audit details or result provenance
- LOCAL mode serialization, coexistence with the existing server analysis
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import seed_database
from app.models import (
    AIConfigProvider,
    Base,
    EvidenceUnderstanding,
    InvestigationEvidence,
)
from app.models.user import AuthAuditAction, AuthAuditEvent, UserRole
from app.services.evidence_integrity import compute_payload_checksum
from app.storage.evidence_storage import EvidenceStorage
from tests.auth_stubs import install_auth_stub


@pytest.fixture
async def client(tmp_path, monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

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


async def _seed(factory):
    async with factory() as session:
        await seed_database(session)
        await session.commit()


async def _inv_id(factory) -> str:
    async with factory() as session:
        result = await session.execute(select(InvestigationEvidence))
        return str(result.scalars().first().investigation_id)


async def _upload(ac, inv_id, filename, evidence_type, content, content_type):
    return await ac.post(
        "/evidence/upload",
        data={"investigation_id": inv_id, "evidence_type": evidence_type, "title": filename},
        files={"file": (filename, content, content_type)},
    )


def _submit_body(content: bytes, **overrides) -> dict:
    body = {
        "mode": "LOCAL",
        "checksum": compute_payload_checksum(content),
        "model_id": "Xenova/whisper-tiny",
        "transcript": "The quick brown fox jumps over the lazy dog.",
        "language": "en",
        "duration_seconds": 4.0,
        "segments": [
            {"start_seconds": 0.0, "end_seconds": 4.0, "text": "The quick brown fox."}
        ],
        "warnings": [],
    }
    body.update(overrides)
    return body


async def _upload_audio(ac, factory):
    await _seed(factory)
    inv_id = await _inv_id(factory)
    content = b"\x00audio-bytes\x00"
    up = await _upload(ac, inv_id, "clip.mp3", "AUDIO", content, "audio/mpeg")
    assert up.status_code == 201, up.text
    return inv_id, up.json()["id"], content


async def _understanding_count(factory) -> int:
    async with factory() as session:
        result = await session.execute(select(EvidenceUnderstanding))
        return len(list(result.scalars()))


async def _local_actions(factory) -> list[tuple[str, dict]]:
    async with factory() as session:
        result = await session.execute(
            select(AuthAuditEvent)
            .where(
                AuthAuditEvent.action.in_(
                    [
                        AuthAuditAction.LOCAL_TRANSCRIPTION_REQUESTED,
                        AuthAuditAction.LOCAL_TRANSCRIPTION_STARTED,
                        AuthAuditAction.LOCAL_TRANSCRIPTION_COMPLETED,
                        AuthAuditAction.LOCAL_TRANSCRIPTION_FAILED,
                    ]
                )
            )
            .order_by(AuthAuditEvent.created_at)
        )
        return [(a.action.value, dict(a.details or {})) for a in result.scalars()]


# ---------------------------------------------------------------------------
# 1-3. Persistence + LOCAL serialization
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_local_transcription_persists_local_row(client):
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "succeeded"
    assert body["media_type"] == "AUDIO"
    assert body["capability"] == "transcription"
    assert body["provider_type"] == "local"
    assert body["provider_name"] == "Whisper"
    assert body["mode"] == "LOCAL"
    assert len(body["checksum_at_analysis"]) == 64
    assert body["result"]["transcript"].startswith("The quick brown fox")
    assert body["result"]["language"] == "en"
    assert body["result"]["provider_name"] == "Whisper"
    assert body["result"]["mode"] == "LOCAL"
    assert body["result"]["model_id"] == "Xenova/whisper-tiny"
    assert body["result"]["segments"][0]["text"] == "The quick brown fox."

    # The analysis list surfaces the local run too.
    listed = await ac.get(f"/evidence/{ev_id}/analyses?investigation_id={inv_id}")
    assert listed.status_code == 200
    assert any(h["mode"] == "LOCAL" for h in listed.json())


@pytest.mark.anyio
async def test_local_transcription_provider_never_configured_as_admin(client):
    """LOCAL rows must never leak into the Phase 23 provider admin surface."""
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content),
    )
    assert resp.status_code == 201, resp.text
    async with factory() as session:
        rows = (await session.execute(select(AIConfigProvider))).scalars().all()
        assert all(r.provider_type.value != "local" for r in rows)


# ---------------------------------------------------------------------------
# 4-5. AUDIO-only restriction
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_non_audio_evidence_rejected(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    content = b"image bytes"
    up = await _upload(ac, inv_id, "frame.jpg", "IMAGE", content, "image/jpeg")
    ev_id = up.json()["id"]
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content),
    )
    assert resp.status_code == 415
    assert resp.status_code == 415
    assert resp.json()["code"] == "UNSUPPORTED_AUDIO_FORMAT"
    assert resp.json()["details"]["media_type"] == "IMAGE"
    assert await _understanding_count(factory) == 0


@pytest.mark.anyio
async def test_document_evidence_rejected(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    content = b"plain text"
    up = await _upload(ac, inv_id, "notes.txt", "DOCUMENT", content, "text/plain")
    ev_id = up.json()["id"]
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content),
    )
    assert resp.status_code == 415
    assert resp.json()["code"] in {"UNSUPPORTED_AUDIO_FORMAT", "UNSUPPORTED_MEDIA"}
    assert await _understanding_count(factory) == 0


# ---------------------------------------------------------------------------
# 6-7. Authorization + investigation isolation
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_auditor_cannot_submit_local_transcription(client):
    ac, factory, app = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    install_auth_stub(app, role=UserRole.AUDITOR)
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content),
    )
    assert resp.status_code == 403
    assert resp.json()["code"] == "forbidden"
    assert await _understanding_count(factory) == 0


@pytest.mark.anyio
async def test_local_transcription_is_investigation_scoped(client):
    ac, factory, _ = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    other = await ac.post("/investigations", json={"title": "Other", "status": "draft"})
    other_id = other.json()["id"]
    content = b"audio-a"
    up = await _upload(ac, other_id, "clip.mp3", "AUDIO", content, "audio/mpeg")
    other_ev = up.json()["id"]
    resp = await ac.post(
        f"/evidence/{other_ev}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content),
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"
    assert await _understanding_count(factory) == 0


# ---------------------------------------------------------------------------
# 8. Server-authority checksum re-verification
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_checksum_mismatch_rejected(client):
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    wrong = "0" * 64  # not the stored checksum
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content, checksum=wrong),
    )
    assert resp.status_code == 409
    assert resp.json()["code"] == "EVIDENCE_INTEGRITY_FAILED"
    assert resp.json()["details"]["reason"] == "checksum_mismatch"
    assert await _understanding_count(factory) == 0


# ---------------------------------------------------------------------------
# 9-11. Strict validation
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_oversized_transcript_rejected(client):
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content, transcript="x" * 50001),
    )
    assert resp.status_code == 422
    assert await _understanding_count(factory) == 0


@pytest.mark.anyio
async def test_non_hexadecimal_checksum_rejected(client):
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content, checksum="not-a-sha256"),
    )
    assert resp.status_code == 422
    assert await _understanding_count(factory) == 0


@pytest.mark.anyio
async def test_invalid_segment_timestamps_rejected(client):
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(
            content,
            segments=[{"start_seconds": 5.0, "end_seconds": 1.0, "text": "bad"}],
        ),
    )
    assert resp.status_code == 422
    assert await _understanding_count(factory) == 0


@pytest.mark.anyio
async def test_extra_fields_are_ignored_not_echoed(client):
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json={**_submit_body(content), "sneaky": "value", "api_key": "sk-secret"},
    )
    assert resp.status_code == 201, resp.text
    assert "sneaky" not in resp.json()["result"]
    assert "api_key" not in resp.json()["result"]


# ---------------------------------------------------------------------------
# 12. Audit + custody, no leakage
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_audit_and_custody_events_recorded(client):
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content),
    )
    assert resp.status_code == 201, resp.text

    actions = [a for a, _ in await _local_actions(factory)]
    assert "local_transcription_requested" in actions
    assert "local_transcription_started" in actions
    assert "local_transcription_completed" in actions

    chain = await ac.get(f"/evidence/{ev_id}/chain?investigation_id={inv_id}")
    assert chain.status_code == 200
    assert any(e["action"] == "evidence_accessed" for e in chain.json())


@pytest.mark.anyio
async def test_audit_details_never_carry_transcript_or_credentials(client):
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content),
    )
    assert resp.status_code == 201, resp.text

    for _action, details in await _local_actions(factory):
        serialized = str(details).lower()
        assert "quick brown fox" not in serialized
        assert "transcript" not in serialized
        assert "api_key" not in serialized
        assert "sk-" not in serialized
        assert "authorization" not in serialized


@pytest.mark.anyio
async def test_failed_local_transcription_is_audited_and_persisted_as_failed(client):
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)
    wrong = "1" * 64
    resp = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content, checksum=wrong),
    )
    assert resp.status_code == 409
    actions = [a for a, _ in await _local_actions(factory)]
    assert "local_transcription_failed" in actions


# ---------------------------------------------------------------------------
# 13-14. Coexistence with server transcription + history read
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_local_and_server_transcription_coexist(client, monkeypatch):
    ac, factory, _ = client
    inv_id, ev_id, content = await _upload_audio(ac, factory)

    from app.models import AIConfigProvider, ProviderCapability, ProviderType

    async with factory() as session:
        session.add(
            AIConfigProvider(
                provider_name="Mock Speech",
                provider_type=ProviderType.MOCK,
                capability=ProviderCapability.TRANSCRIPTION,
                model="trinetra-deterministic-local-v0",
                enabled=True,
                is_default=True,
            )
        )
        await session.commit()

    async def fake_execute(binding, kind, payload, content_type):
        return {
            "summary": "Server transcription.",
            "transcript": "Server produced transcript.",
            "segments": [{"start_seconds": 0, "end_seconds": 2, "text": "Server."}],
            "observations": [],
            "entities": [],
            "locations": [],
            "warnings": [],
            "language": "en",
        }

    monkeypatch.setattr(
        "app.evidence_intelligence.service.execute_capability_call", fake_execute
    )
    server = await ac.post(f"/evidence/{ev_id}/analyze?investigation_id={inv_id}")
    assert server.status_code == 201, server.text
    assert server.json()["mode"] == "MOCK"

    local = await ac.post(
        f"/evidence/{ev_id}/analyses/local-transcription?investigation_id={inv_id}",
        json=_submit_body(content),
    )
    assert local.status_code == 201, local.text
    assert local.json()["mode"] == "LOCAL"

    listed = await ac.get(f"/evidence/{ev_id}/analyses?investigation_id={inv_id}")
    history = listed.json()
    assert len(history) == 2
    modes = {h["mode"] for h in history}
    assert modes == {"MOCK", "LOCAL"}
    assert all(h["status"] == "succeeded" for h in history)
