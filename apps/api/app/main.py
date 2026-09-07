import time

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.ai.router import router as ai_router
from app.analytics.router import router as analytics_router
from app.api.app import create_real_app
from app.cases.router import router as cases_router
from app.core.config import get_settings
from app.core.health import health_response
from app.core.health import router as health_router
from app.entities.router import router as entities_router
from app.entity_intelligence.router import router as entity_intelligence_router
from app.events.router import router as events_router
from app.evidence.router import router as evidence_router
from app.investigation_operations.router import router as investigation_operations_router
from app.networks.router import router as networks_router
from app.patterns.router import router as patterns_router
from app.relationships.router import router as relationships_router
from app.reports.router import router as reports_router
from app.schemas.common import HealthResponse

settings = get_settings()
logger = structlog.get_logger()

app = FastAPI(
    title="Trinetra Pulse API",
    description="Criminal Network Intelligence and Investigation Platform",
    version="0.1.0",
    docs_url="/docs" if settings.app_debug else None,
    redoc_url="/redoc" if settings.app_debug else None,
)

# CORS — origins are environment-driven (see Settings.cors_allow_origins).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=round(duration * 1000, 2),
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Mount routers with /api/v1 prefix
api_v1 = FastAPI(title="Trinetra Pulse API v1")
api_v1.include_router(health_router, tags=["health"])
api_v1.include_router(entities_router, prefix="/entities", tags=["entities"])
api_v1.include_router(relationships_router, prefix="/relationships", tags=["relationships"])
api_v1.include_router(cases_router, prefix="/cases", tags=["cases"])
api_v1.include_router(networks_router, prefix="/networks", tags=["networks"])
api_v1.include_router(evidence_router, prefix="/evidence", tags=["evidence"])
api_v1.include_router(events_router, prefix="/events", tags=["events"])
api_v1.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
api_v1.include_router(patterns_router, prefix="/patterns", tags=["patterns"])
api_v1.include_router(ai_router, prefix="/ai", tags=["ai"])
api_v1.include_router(reports_router, prefix="/reports", tags=["reports"])
api_v1.include_router(
    entity_intelligence_router, prefix="/entity-intelligence", tags=["entity-intelligence"]
)
api_v1.include_router(
    investigation_operations_router,
    prefix="/investigation-operations",
    tags=["investigation-operations"],
)

app.mount("/api/v1", api_v1)


@app.get("/api/v2", include_in_schema=False)
async def real_api_root():
    return {"name": "Trinetra Pulse API v2", "version": "0.2.0"}


# Real (database-backed) application layer on /api/v2
app.mount("/api/v2", create_real_app())


@app.get("/")
async def root():
    return {
        "name": "Trinetra Pulse",
        "version": "0.1.0",
        "docs": "/api/v1/docs" if settings.app_debug else None,
    }


@app.get("/health", response_model=HealthResponse)
async def root_health():
    return health_response()
