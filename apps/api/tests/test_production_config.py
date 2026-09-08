"""Production startup guard tests (Phase 15 / Render deployability).

Verifies that ``get_settings``/``enforce_production_defaults`` only blocks
startup when a value the service actually relies on still holds a default
secret, and that a production deploy wired through ``DATABASE_URL`` (as the
Render Blueprint does) boots without requiring irrelevant component passwords.
"""

import pytest

from app.core.config import Settings


def test_production_with_database_url_and_real_secrets_starts():
    """A Render production deploy (DATABASE_URL + real server secrets) boots."""
    settings = Settings(
        app_env="production",
        database_url_override="postgresql+asyncpg://user:pass@host:5432/db",
        app_secret_key="a-real-secret",
        jwt_secret_key="another-real-secret",
        frontend_url="https://web.onrender.com",
        evidence_storage_provider="s3",
        evidence_storage_bucket="evidence-bucket",
        # Phase 23 — provider credential encryption is a production requirement.
        provider_encryption_key="yet-another-real-secret",
        # Component passwords are left at their defaults — irrelevant because
        # DATABASE_URL wins — and must NOT block startup.
        postgres_password="trinetra_dev_password",
        neo4j_password="neo4j_dev_password",
        redis_password="redis_dev_password",
    )
    # Should not raise.
    settings.enforce_production_defaults()


def test_production_requires_provider_encryption_key():
    """Production refuses to boot without PROVIDER_ENCRYPTION_KEY (Phase 23)."""
    valid = dict(
        app_env="production",
        database_url_override="postgresql+asyncpg://u:p@h:5432/d",
        app_secret_key="a-real-secret",
        jwt_secret_key="another-real-secret",
        frontend_url="https://web.onrender.com",
        evidence_storage_provider="s3",
        evidence_storage_bucket="evidence-bucket",
    )
    with pytest.raises(RuntimeError, match="PROVIDER_ENCRYPTION_KEY"):
        Settings(**valid).enforce_production_defaults()


def test_production_without_database_url_guards_postgres_password():
    """Without DATABASE_URL the component Postgres password must be real."""
    settings = Settings(
        app_env="production",
        database_url_override="",
        app_secret_key="a-real-secret",
        jwt_secret_key="another-real-secret",
        frontend_url="https://web.onrender.com",
        evidence_storage_provider="s3",
        evidence_storage_bucket="evidence-bucket",
        postgres_password="trinetra_dev_password",
    )
    with pytest.raises(RuntimeError, match="postgres_password"):
        settings.enforce_production_defaults()


def test_production_guards_app_and_jwt_secrets():
    """Default app/JWT secrets are always rejected in production."""
    settings = Settings(
        app_env="production",
        database_url_override="postgresql+asyncpg://u:p@h:5432/d",
        app_secret_key="change-me-in-production",
        jwt_secret_key="a-real-secret",
        frontend_url="https://web.onrender.com",
        evidence_storage_provider="s3",
        evidence_storage_bucket="evidence-bucket",
    )
    with pytest.raises(RuntimeError, match="app_secret_key"):
        settings.enforce_production_defaults()

    settings = Settings(
        app_env="production",
        database_url_override="postgresql+asyncpg://u:p@h:5432/d",
        app_secret_key="a-real-secret",
        jwt_secret_key="change-me-in-production",
        frontend_url="https://web.onrender.com",
        evidence_storage_provider="s3",
        evidence_storage_bucket="evidence-bucket",
    )
    with pytest.raises(RuntimeError, match="jwt_secret_key"):
        settings.enforce_production_defaults()


def test_production_requires_deployed_frontend_origin():
    settings = Settings(
        app_env="production",
        database_url_override="******h:5432/d",
        app_secret_key="a-real-secret",
        jwt_secret_key="another-real-secret",
    )
    with pytest.raises(RuntimeError, match="FRONTEND_URL"):
        settings.enforce_production_defaults()


def test_production_rejects_localhost_frontend_origin():
    settings = Settings(
        app_env="production",
        database_url_override="******h:5432/d",
        app_secret_key="a-real-secret",
        jwt_secret_key="another-real-secret",
        frontend_url="http://localhost:3000",
    )
    with pytest.raises(RuntimeError, match="localhost"):
        settings.enforce_production_defaults()


def test_development_allows_defaults():
    """Local development is not subject to the production guard."""
    settings = Settings(app_env="development")
    settings.enforce_production_defaults()  # Should not raise.


@pytest.mark.anyio
async def test_production_auth_gate_requires_bearer_token(monkeypatch):
    """Production auth never falls back to client-supplied identity headers.

    Phase 18.1 removed the dev-only ``X-User-Id`` gate entirely: identity comes
    exclusively from a verified ``Authorization: Bearer`` JWT. Missing headers,
    X-User-Id spoofing and garbage tokens all raise ``AuthRequiredError``.
    """
    from app.api.deps import AuthRequiredError, get_current_user
    from app.core import security
    from app.core.config import Settings

    prod = Settings(
        app_env="production",
        database_url_override="postgresql+asyncpg://u:p@h:5432/d",
        app_secret_key="a-real-secret",
        jwt_secret_key="another-real-secret",
    )
    # Force a production environment for the cached settings used by JWT decode.
    monkeypatch.setattr(security, "get_settings", lambda: prod)

    # No header -> rejected.
    with pytest.raises(AuthRequiredError):
        await get_current_user()

    # A non-Bearer scheme and a garbage token are both rejected.
    with pytest.raises(AuthRequiredError):
        await get_current_user(authorization="Basic abc123def")
    with pytest.raises(AuthRequiredError):
        await get_current_user(authorization="Bearer not.a.jwt")


@pytest.mark.anyio
async def test_development_auth_gate_requires_bearer_token(monkeypatch):
    """Even in development there is no anonymous demo fallback.

    The previous behavior (header optional, defaults to the demo inspector) is
    deliberately gone: development runs authenticate the same way as
    production, so no codepath trusts client-supplied identity.
    """
    from app.api.deps import AuthRequiredError, get_current_user
    from app.core import security
    from app.core.config import Settings

    dev = Settings(app_env="development")
    monkeypatch.setattr(security, "get_settings", lambda: dev)

    with pytest.raises(AuthRequiredError):
        await get_current_user()

    # Client-supplied identity is never accepted, not even unnamed headers.
    with pytest.raises(AuthRequiredError):
        await get_current_user(authorization="not-a-bearer-token")
