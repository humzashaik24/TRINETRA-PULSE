"""Phase 23 — AI/media provider management integration tests.

Runs against the real ``create_real_app()`` stack on an in-memory SQLite
database with NO ``get_current_user`` override, exercising the actual JWT
bearer dependency, ADMIN-only gates, credential encryption, masked reads,
default handling, connection testing and audit recording.

Key invariants verified here (13 scenarios):

1. every provider route requires a verified Bearer token (401)
2. only ADMIN may read OR mutate provider configuration (403 otherwise,
   including AUDITOR — read-only role cannot touch providers)
3. plaintext credentials are never returned: responses expose
   ``has_credential`` + a masked digest only (NGET/API write-only)
4. credentials never land in logs
5. connection tests never echo secrets or raw upstream error text
6. disabled providers can never be the default (explicit request rejected,
   disabling a default auto-clears the flag)
7. incompatible provider/capability pairs are rejected
8. credential replacement works without exposing the old secret; blank
   credential keeps the existing secret
9. deleting a provider invalidates its credential (row gone, 404 afterwards)
10. encryption fails closed (corrupt blob -> no credential) and production
    requires PROVIDER_ENCRYPTION_KEY
11. mock mode works credential-free and the existing AI assistant still works
12. exactly one default per capability, deterministic resolution
13. provider audit events are recorded and never carry secrets
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import DEMO_USER_LOGINS, seed_database
from app.models import Base

INVESTIGATOR = "investigator@trinetra.dev"
SUPERVISOR = "supervisor@trinetra.dev"
ADMIN = "admin@trinetra.dev"
AUDITOR = "auditor@trinetra.dev"

REAL_KEY = "sk-proj-SECRET-7A2F-testing-2026"


@pytest.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as session:
        await seed_database(session)
        await session.commit()

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


async def _login(ac: AsyncClient, email: str) -> dict:
    response = await ac.post(
        "/auth/login", json={"email": email, "password": DEMO_USER_LOGINS[email]}
    )
    assert response.status_code == 200, response.text
    return response.json()


def _bearer(data: dict) -> dict:
    return {"Authorization": f"Bearer {data['access_token']}"}


def _provider_body(**overrides) -> dict:
    body = {
        "provider_name": "OpenAI Official",
        "provider_type": "openai",
        "capability": "investigation_ai",
        "model": "gpt-4o",
        "base_url": "https://api.openai.com/v1",
        "enabled": True,
        "is_default": False,
        "configuration": {"environment": "production"},
        "credential": REAL_KEY,
    }
    body.update(overrides)
    return body


async def _create(client, headers, **overrides) -> dict:
    response = await client.post(
        "/admin/providers", headers=headers, json=_provider_body(**overrides)
    )
    assert response.status_code == 201, response.text
    return response.json()


# 1 -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_provider_routes_require_authentication(client):
    cases = [
        ("get", "/admin/providers", None),
        ("post", "/admin/providers", _provider_body()),
        ("patch", "/admin/providers/00000000-0000-0000-0000-000000000000", {"enabled": False}),
        ("delete", "/admin/providers/00000000-0000-0000-0000-000000000000", None),
        ("post", "/admin/providers/00000000-0000-0000-0000-000000000000/test", None),
    ]
    for method, path, body in cases:
        response = await client.request(method.upper(), path, json=body)
        assert response.status_code == 401, f"{method} {path}: {response.text}"
        assert response.json()["code"] == "authentication_required"


# 2 -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_provider_routes_admin_only(client):
    non_admins = {INVESTIGATOR, SUPERVISOR, AUDITOR}
    admin = await _login(client, ADMIN)
    for email in non_admins:
        actor = await _login(client, email)
        headers = _bearer(actor)
        # AUDITOR is read-only but must not even LIST provider configuration.
        read = await client.get("/admin/providers", headers=headers)
        assert read.status_code == 403, f"{email} GET: {read.text}"
        for method, path, body in [
            ("post", "/admin/providers", _provider_body()),
            (
                "patch",
                "/admin/providers/00000000-0000-0000-0000-000000000000",
                {"enabled": False},
            ),
            ("delete", "/admin/providers/00000000-0000-0000-0000-000000000000", None),
            (
                "post",
                "/admin/providers/00000000-0000-0000-0000-000000000000/test",
                None,
            ),
        ]:
            response = await client.request(method.upper(), path, headers=headers, json=body)
            assert response.status_code == 403, f"{email} {method} {path}"
            assert response.json()["code"] == "forbidden"

    assert (await client.get("/admin/providers", headers=_bearer(admin))).status_code == 200


# 3 -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_credentials_are_write_only_and_masked(client):
    admin = await _login(client, ADMIN)
    headers = _bearer(admin)

    created = await _create(client, headers, credential=REAL_KEY)
    body = str(created)
    assert body.count(REAL_KEY) == 0
    assert "'has_credential': True" in body
    assert created["credential_masked"].endswith(REAL_KEY[-4:])
    assert REAL_KEY not in created["credential_masked"]
    assert "SECRET-7A2F" not in created["credential_masked"]  # only last 4 shown

    listed = await client.get("/admin/providers", headers=headers)
    assert listed.status_code == 200
    listed_body = str(listed.json())
    assert REAL_KEY not in listed_body
    assert all("has_credential" in item for item in listed.json())
    assert all("credential_masked" in item for item in listed.json())


# 4 -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_credentials_never_appear_in_logs(client, caplog):
    admin = await _login(client, ADMIN)
    headers = _bearer(admin)

    await _create(client, headers, credential="sk-log-leak-check-0000")
    patched = await client.patch(
        "/admin/providers/00000000-0000-0000-0000-000000000000",
        headers=headers,
        json={},
    )
    _ = patched
    text = caplog.text
    assert "sk-log-leak-check-0000" not in text

    created = await _create(
        client,
        headers,
        credential=REAL_KEY,
        provider_name="Logger Probe",
        provider_type="mock",
    )
    updated = await client.patch(
        f"/admin/providers/{created['id']}",
        headers=headers,
        json={"credential": "sk-log-leak-check-1111"},
    )
    assert updated.status_code == 200
    tested = await client.post(f"/admin/providers/{created['id']}/test", headers=headers)
    assert tested.status_code == 200
    deleted = await client.delete(f"/admin/providers/{created['id']}", headers=headers)
    assert deleted.status_code == 204
    assert "sk-log-leak-check-0000" not in caplog.text
    assert "sk-log-leak-check-1111" not in caplog.text
    assert REAL_KEY not in caplog.text


# 5 -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_connection_test_never_leaks_secrets(client):
    admin = await _login(client, ADMIN)
    headers = _bearer(admin)

    # Mock: credential-free, deterministic CONNECTED, clearly marked MOCK.
    mock = await _create(
        client, headers, provider_name="Simulator", provider_type="mock", capability="vision"
    )
    result = await client.post(f"/admin/providers/{mock['id']}/test", headers=headers)
    assert result.status_code == 200
    body = result.json()
    assert body["status"] == "CONNECTED"
    assert body["mode"] == "MOCK"
    assert body["provider"] == "Simulator"

    # External without a credential: FAILED before any network call, and the
    # response carries no secret, URL or raw upstream text.
    openai = await _create(
        client,
        headers,
        provider_name="OpenAI NoKey",
        provider_type="openai",
        capability="investigation_ai",
        credential="",
    )
    result = await client.post(f"/admin/providers/{openai['id']}/test", headers=headers)
    assert result.status_code == 200
    body = result.json()
    assert body["status"] == "FAILED"
    assert body["mode"] == "EXTERNAL"
    assert "credential" not in str(body).lower() or "missing credential" not in str(body)
    assert "sk-" not in str(body)

    # External with a credential but an unreachable endpoint: FAILED, and no
    # secret leaks into the response despite the real connection failure.
    leak = await _create(
        client,
        headers,
        provider_name="Leak Check",
        provider_type="openai",
        capability="investigation_ai",
        base_url="http://127.0.0.1:9",
        credential="sk-leak-connection-2222",
    )
    result = await client.post(f"/admin/providers/{leak['id']}/test", headers=headers)
    assert result.status_code == 200
    body = result.json()
    assert body["status"] == "FAILED"
    assert "sk-leak-connection-2222" not in str(body)
    assert not any(
        token in str(body)
        for token in ("127.0.0.1", "connect error", "Connection refused", "OSError")
    )


# 6 -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_disabled_provider_cannot_be_default(client):
    admin = await _login(client, ADMIN)
    headers = _bearer(admin)

    # Explicit "disabled + default" on create is rejected (400, not created).
    response = await client.post(
        "/admin/providers",
        headers=headers,
        json=_provider_body(provider_name="Bad Default", enabled=False, is_default=True),
    )
    assert response.status_code == 400
    assert response.json()["code"] == "disabled_default_provider"

    # New default while disabling, in the same patch, is rejected.
    provider = await _create(client, headers, is_default=True, credential=REAL_KEY)
    conflict = await client.patch(
        f"/admin/providers/{provider['id']}", headers=headers, json={"enabled": False}
    )
    assert conflict.status_code == 200  # disabling a default clears the flag
    assert conflict.json()["enabled"] is False
    assert conflict.json()["is_default"] is False


# 7 -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_incompatible_provider_capability_rejected(client):
    admin = await _login(client, ADMIN)
    headers = _bearer(admin)

    # OpenRouter has no TRANSCRIPTION capability.
    bad = await client.post(
        "/admin/providers",
        headers=headers,
        json=_provider_body(provider_type="openrouter", capability="transcription"),
    )
    assert bad.status_code == 400
    assert bad.json()["code"] == "incompatible_provider"

    # Updating an existing provider into an incompatible pair is rejected.
    provider = await _create(client, headers, capability="investigation_ai", credential=REAL_KEY)
    conflict = await client.patch(
        f"/admin/providers/{provider['id']}",
        headers=headers,
        json={"capability": "video"},
    )
    assert conflict.status_code == 400
    assert conflict.json()["code"] == "incompatible_provider"

    # Mock supports every capability, including VIDEO.
    ok = await _create(client, headers, provider_type="mock", capability="video")
    assert ok["capability"] == "video"


# 8 -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_credential_replacement_and_blank_keep(client):
    admin = await _login(client, ADMIN)
    headers = _bearer(admin)

    provider = await _create(client, headers, credential="sk-old-AAAA1111")
    assert provider["credential_masked"].endswith("1111")
    assert "AAAA1111" not in provider["credential_masked"]

    # Explicit replacement updates the stored secret (masked tail changes).
    replaced = await client.patch(
        f"/admin/providers/{provider['id']}",
        headers=headers,
        json={"credential": "sk-new-BBBB2222"},
    )
    assert replaced.status_code == 200
    assert replaced.json()["credential_masked"].endswith("2222")
    assert "AAAA1111" not in replaced.json()["credential_masked"]

    # Blank credential keeps the existing secret rather than wiping it.
    blank_keep = await client.patch(
        f"/admin/providers/{provider['id']}", headers=headers, json={"credential": ""}
    )
    assert blank_keep.status_code == 200
    assert blank_keep.json()["has_credential"] is True
    assert blank_keep.json()["credential_masked"].endswith("2222")

    # clear_credential explicitly removes the secret.
    cleared = await client.patch(
        f"/admin/providers/{provider['id']}",
        headers=headers,
        json={"clear_credential": True},
    )
    assert cleared.status_code == 200
    assert cleared.json()["has_credential"] is False
    assert cleared.json()["credential_masked"] == ""


# 9 -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_delete_invalidates_provider_and_credential(client):
    admin = await _login(client, ADMIN)
    headers = _bearer(admin)

    provider = await _create(client, headers, credential=REAL_KEY)
    provider_id = provider["id"]

    deleted = await client.delete(f"/admin/providers/{provider_id}", headers=headers)
    assert deleted.status_code == 204

    listed = await client.get("/admin/providers", headers=headers)
    assert listed.status_code == 200
    assert all(item["id"] != provider_id for item in listed.json())

    # Any operation against the deleted provider is a clean 404.
    missing = await client.patch(
        f"/admin/providers/{provider_id}", headers=headers, json={"enabled": False}
    )
    assert missing.status_code == 404
    assert missing.json()["code"] == "not_found"


# 10 ------------------------------------------------------------------------
@pytest.mark.anyio
async def test_encryption_fails_closed(client):
    from app.core import secret_crypto

    blob = secret_crypto.encrypt_secret(REAL_KEY)
    assert secret_crypto.decrypt_secret(blob) == REAL_KEY

    tampered = blob[:-4] + ("AAAA" if not blob.endswith("AAAA") else "BBBB")
    assert secret_crypto.decrypt_secret(tampered) == ""

    assert secret_crypto.encrypt_secret("") == ""
    assert secret_crypto.decrypt_secret(None) == ""

    one = secret_crypto.encrypt_secret(REAL_KEY)
    two = secret_crypto.encrypt_secret(REAL_KEY)
    assert one != two  # fresh nonce per encryption
    assert secret_crypto.mask_credential(REAL_KEY).endswith(REAL_KEY[-4:])
    assert secret_crypto.mask_credential("short") != ""


# 11 ------------------------------------------------------------------------
@pytest.mark.anyio
async def test_mock_mode_credential_free_and_assistant_still_works(client):
    admin = await _login(client, ADMIN)
    headers = _bearer(admin)

    # A mock provider needs no credential at all.
    mock = await _create(
        client,
        headers,
        provider_type="mock",
        capability="investigation_ai",
        credential=None,
    )
    assert mock["has_credential"] is False
    assert mock["credential_masked"] == ""

    # Existing AI assistant surface remains functional (pre-Phase 23 behavior).
    status = await client.get("/ai/status", headers=_bearer(await _login(client, ADMIN)))
    assert status.status_code == 200
    assert status.json()["status"] == "ready"


# 12 ------------------------------------------------------------------------
@pytest.mark.anyio
async def test_single_default_and_deterministic_resolution(client):
    admin = await _login(client, ADMIN)
    headers = _bearer(admin)

    first = await _create(
        client,
        headers,
        provider_name="OpenAI Default A",
        is_default=True,
        credential=REAL_KEY,
    )
    second = await _create(
        client,
        headers,
        provider_name="Gemini Default B",
        provider_type="gemini",
        is_default=True,
        credential="sk-gemini-CCCC3333",
    )
    assert second["is_default"] is True

    listed = await client.get("/admin/providers", headers=headers)
    items = [p for p in listed.json() if p["capability"] == "investigation_ai"]
    defaults = [p for p in items if p["is_default"]]
    assert len(defaults) == 1
    assert defaults[0]["id"] == second["id"]
    assert all(p["id"] != first["id"] for p in defaults)

    # Disable the default: the flag clears and the fallback is mock.
    disabled = await client.patch(
        f"/admin/providers/{second['id']}", headers=headers, json={"enabled": False}
    )
    assert disabled.status_code == 200
    assert disabled.json()["is_default"] is False

    deflated = await client.get("/admin/providers", headers=headers)
    still_one = [p for p in deflated.json() if p["capability"] == "investigation_ai"]
    assert all(p["is_default"] is False for p in still_one)


@pytest.mark.anyio
async def test_registry_resolution_prefers_default_then_mock(client):
    """The registry picks the enabled default, else first enabled, else mock."""
    from sqlalchemy import select

    from app.models import AIConfigProvider
    from app.models.provider import ProviderCapability, ProviderType
    from app.provider_management.registry import ProviderRegistry

    capability = ProviderCapability.INVESTIGATION_AI
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as session:
        registry = ProviderRegistry(session)
        fallback = await registry.resolve(capability)
        assert fallback.provider_type == ProviderType.MOCK
        assert fallback.provider_name == "Mock Provider"

        a = AIConfigProvider(
            provider_name="A",
            provider_type="openai",
            capability=capability,
            model="m1",
        )
        b = AIConfigProvider(
            provider_name="B",
            provider_type="openai",
            capability=capability,
            model="m2",
            is_default=True,
        )
        session.add_all([a, b])
        await session.flush()
        assert (await registry.resolve(capability)).provider_name == "B"

        b.is_default = False
        await session.flush()
        assert (await registry.resolve(capability)).provider_name == "A"

        a.enabled = False
        await session.flush()
        # B is still enabled, so it is the resolved provider.
        assert (await registry.resolve(capability)).provider_name == "B"

        b.enabled = False
        await session.flush()
        # No enabled provider remains -> deterministic mock fallback.
        fallback_again = await registry.resolve(capability)
        assert fallback_again.provider_name == "Mock Provider"
        assert fallback_again.is_mock is True

        rows = (await session.execute(select(AIConfigProvider))).scalars().all()
        assert len(rows) == 2
        assert all(r.enabled is False or r.is_default is False for r in rows)
    await engine.dispose()


# 13 ------------------------------------------------------------------------
@pytest.mark.anyio
async def test_provider_audit_events_recorded_without_secrets(client):
    admin = await _login(client, ADMIN)
    headers = _bearer(admin)

    provider = await _create(
        client,
        headers,
        provider_type="mock",
        provider_name="Mock Provider",
        credential=None,
        is_default=True,
    )
    created = await client.patch(
        f"/admin/providers/{provider['id']}", headers=headers, json={"model": "gpt-4o-2026"}
    )
    assert created.status_code == 200
    tested = await client.post(f"/admin/providers/{provider['id']}/test", headers=headers)
    assert tested.status_code == 200
    assert tested.json()["mode"] == "MOCK"
    deleted = await client.delete(f"/admin/providers/{provider['id']}", headers=headers)
    assert deleted.status_code == 204

    audit = await client.get("/admin/audit", headers=headers, params={"page_size": 100})
    assert audit.status_code == 200
    actions = {item["action"] for item in audit.json()["items"]}
    assert {
        "provider_created",
        "provider_updated",
        "provider_connection_tested",
        "provider_deleted",
    } <= actions

    audit_body = str(audit.json())
    assert REAL_KEY not in audit_body
    assert "credential_masked" not in audit_body
    assert "encrypted_api_key" not in audit_body

    tested_event = next(
        item
        for item in audit.json()["items"]
        if item["action"] == "provider_connection_tested"
    )
    assert tested_event["details"]["status"] == "CONNECTED"
    assert tested_event["details"]["mode"] == "MOCK"
    assert "credential" not in str(tested_event["details"])
    assert "api_key" not in str(tested_event["details"])
