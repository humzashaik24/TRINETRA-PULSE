"""Real (database-backed) API application factory.

Mounted at ``/api/v2`` next to the legacy in-memory demo surface at ``/api/v1``.
"""

from __future__ import annotations

from fastapi import FastAPI

from app.api.errors import install_error_handlers
from app.api.routers import (
    admin,
    assistant,
    auth,
    candidate_resolution,
    datasets,
    entities,
    events,
    evidence,
    findings,
    investigation_resources,
    investigations,
    network,
    notes,
    patterns,
    providers,
    relationships,
    timeline,
)
from app.core.config import get_settings


def create_real_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Trinetra Pulse API v2 (Relational)",
        description=(
            "Database-backed application surface for Trinetra Pulse: "
            "investigations, entities, relationships, findings, evidence, "
            "events, notes, timelines and network analytics."
        ),
        version="0.2.0",
        docs_url="/docs" if settings.app_debug else None,
        redoc_url="/redoc" if settings.app_debug else None,
    )

    install_error_handlers(app)

    app.include_router(investigations.router, prefix="/investigations", tags=["investigations"])
    app.include_router(
        investigation_resources.router,
        prefix="/investigations",
        tags=["investigation-resources"],
    )
    app.include_router(entities.router, prefix="/entities", tags=["entities"])
    app.include_router(relationships.router, prefix="/relationships", tags=["relationships"])
    app.include_router(findings.router, prefix="/findings", tags=["findings"])
    app.include_router(evidence.router, prefix="/evidence", tags=["evidence"])
    app.include_router(events.router, prefix="/events", tags=["events"])
    app.include_router(notes.router, prefix="/notes", tags=["notes"])
    app.include_router(patterns.router, prefix="/investigations", tags=["patterns"])
    app.include_router(timeline.router, prefix="/timeline", tags=["timeline"])
    app.include_router(network.router, prefix="/networks", tags=["network"])
    app.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
    app.include_router(assistant.router, prefix="/ai", tags=["assistant"])
    # Phase 18.1 — authentication + RBAC. /auth/login is the only public v2
    # surface (health lives on /api/v1 / /health outside this app).
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(admin.router, prefix="/admin", tags=["admin"])
    app.include_router(providers.router, prefix="", tags=["admin-providers"])
    app.include_router(
        candidate_resolution.router,
        prefix="/investigations",
        tags=["candidate-resolution"],
    )

    @app.get("/")
    async def root() -> dict:
        return {"name": "Trinetra Pulse API v2", "version": "0.2.0"}

    return app
