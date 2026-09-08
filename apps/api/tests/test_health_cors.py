"""Health + CORS configuration tests (Phase 14.3 / Render)."""

import json
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings


@pytest.mark.anyio
async def test_health_endpoint_unauthenticated():
    """GET /health returns a safe, unauthenticated healthy response."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "healthy"
    assert "version" in body
    # Never expose secrets in the health payload.
    for secret_key in ("DATABASE_URL", "password", "secret", "token", "api_key"):
        assert secret_key.lower() not in json.dumps(body).lower()


@pytest.mark.anyio
async def test_database_health_returns_service_unavailable_when_database_is_down():
    from app.main import app

    with patch("app.core.health._db_status", new=AsyncMock(return_value="unavailable")):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/v1/health/db")
    assert resp.status_code == 503
    assert resp.json()["database"] == "unavailable"


def test_cors_no_wildcard_by_default():
    settings = Settings(frontend_url="", cors_origins="")
    origins = settings.cors_allow_origins
    assert origins == ["http://localhost:3000", "http://localhost:3001"]
    assert "*" not in origins


def test_cors_from_frontend_url_and_origins():
    settings = Settings(
        frontend_url="https://web.onrender.com",
        cors_origins="https://api.cloudflare.dev, https://second.example",
    )
    origins = settings.cors_allow_origins
    assert "https://web.onrender.com" in origins
    assert "https://api.cloudflare.dev" in origins
    assert "https://second.example" in origins
    assert "*" not in origins


def test_cors_production_appends_no_wildcard():
    settings = Settings(
        app_env="production",
        frontend_url="https://web.onrender.com",
        cors_origins="",
    )
    origins = settings.cors_allow_origins
    # In production the deployed origin is the only allowed origin.
    assert origins == ["https://web.onrender.com"]
    assert "*" not in origins
