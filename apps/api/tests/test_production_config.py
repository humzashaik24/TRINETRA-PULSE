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
        # Component passwords are left at their defaults — irrelevant because
        # DATABASE_URL wins — and must NOT block startup.
        postgres_password="trinetra_dev_password",
        neo4j_password="neo4j_dev_password",
        redis_password="redis_dev_password",
    )
    # Should not raise.
    settings.enforce_production_defaults()


def test_production_without_database_url_guards_postgres_password():
    """Without DATABASE_URL the component Postgres password must be real."""
    settings = Settings(
        app_env="production",
        database_url_override="",
        app_secret_key="a-real-secret",
        jwt_secret_key="another-real-secret",
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
    )
    with pytest.raises(RuntimeError, match="app_secret_key"):
        settings.enforce_production_defaults()

    settings = Settings(
        app_env="production",
        database_url_override="postgresql+asyncpg://u:p@h:5432/d",
        app_secret_key="a-real-secret",
        jwt_secret_key="change-me-in-production",
    )
    with pytest.raises(RuntimeError, match="jwt_secret_key"):
        settings.enforce_production_defaults()


def test_development_allows_defaults():
    """Local development is not subject to the production guard."""
    settings = Settings(app_env="development")
    settings.enforce_production_defaults()  # Should not raise.


@pytest.mark.anyio
async def test_production_auth_gate_requires_x_user_id(monkeypatch):
    """In production the real layer demands an identity header (else 401)."""
    from app.api import deps
    from app.api.deps import AuthRequiredError, get_current_user
    from app.core.config import Settings

    prod = Settings(
        app_env="production",
        database_url_override="postgresql+asyncpg://u:p@h:5432/d",
        app_secret_key="a-real-secret",
        jwt_secret_key="another-real-secret",
    )
    # Force a production environment for the cached settings the deps read.
    monkeypatch.setattr(deps, "get_settings", lambda: prod)

    # No header -> rejected.
    with pytest.raises(AuthRequiredError):
        await get_current_user()

    # With the demonstration identity header -> accepted (default inspector).
    user = await get_current_user(x_user_id="inspector.mehta@trinetra.local")
    assert user.id == "inspector.mehta@trinetra.local"

    # Phase 22: a spoofed X-User-Id must NOT be trusted as a different identity.
    with pytest.raises(AuthRequiredError):
        await get_current_user(x_user_id="intruder@evil.local")


@pytest.mark.anyio
async def test_development_auth_gate_defaults_to_demo_user(monkeypatch):
    """In development the header is optional and falls back to the demo identity."""
    from app.api import deps
    from app.api.deps import get_current_user
    from app.core.config import Settings

    dev = Settings(app_env="development")
    monkeypatch.setattr(deps, "get_settings", lambda: dev)

    user = await get_current_user()
    assert user.id == "inspector.mehta@trinetra.local"
