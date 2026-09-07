"""Health endpoints.

Exposes a simple, unauthenticated ``/health`` used by Render (and local dev)
to determine liveness. The response only contains safe, non-sensitive status
information — never database credentials, tokens, or internals.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import engine
from app.schemas.common import HealthResponse

router = APIRouter()
settings = get_settings()

APP_VERSION = "0.1.0"


def health_payload() -> dict[str, Any]:
    """Return a safe health payload without any secrets."""
    return {
        "status": "healthy",
        "version": APP_VERSION,
        "environment": settings.app_env,
        "database": "ok",
    }


def health_response() -> HealthResponse:
    """Build a ``HealthResponse`` (synchronous, no DB access)."""
    return HealthResponse(**health_payload())


async def _db_status() -> str:
    """Best-effort database connectivity check. Never leaks credentials."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return "ok"
    except Exception:  # noqa: BLE001 - intentionally coarse for a health check
        return "unavailable"


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return health_response()


@router.get("/health/db", response_model=HealthResponse)
async def health_check_db():
    payload = health_payload()
    payload["database"] = await _db_status()
    return HealthResponse(**payload)
