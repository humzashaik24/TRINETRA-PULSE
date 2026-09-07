"""Phase 10 — AI investigation assistant API router.

Mounted at /api/v1/ai. Exposes grounded, read-only assistant endpoints
(query / explain / summarize). The model provider is abstracted behind
``app.ai.providers.get_provider`` so the API never depends on a vendor.
Retrieved context is bounded and treated as DATA (prompt-injection safe),
and responses are forced to neutral phrasing by the provider guard.
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, HTTPException

from app.ai import providers
from app.ai.schemas import AIQueryRequest, AIResponse

router = APIRouter()


async def _build_context(scope: dict[str, Any]) -> dict[str, Any]:
    """Assemble a MINIMAL, bounded context from the request scope.

    In the current phase the Python API does not yet query investigation
    persistence; it forwards only the ids/labels the request states as
    selected. This keeps the endpoint grounded and read-only. Full data
    retrieval is wired through the web orchestrator.
    """
    context: dict[str, Any] = {}
    if scope.get("investigation_id"):
        context["investigation"] = {
            "sourceId": scope["investigation_id"],
            "label": "Investigation " + scope["investigation_id"][:8],
            "scoped": True,
        }
    return context


def _response_for(query_id: str, result: dict[str, Any], scope: dict[str, Any]) -> AIResponse:
    return AIResponse(
        id=f"ai-{query_id}",
        query_id=query_id,
        status="complete" if result.get("answer") else "not_found",
        answer=result.get("answer", ""),
        key_points=result.get("key_points", []),
        confidence=result.get("confidence", {"answerGrounding": 0.0}),
        limitations=result.get("limitations", []),
        suggested_actions=[],
        sources=result.get("sources", []),
        incomplete=bool(scope.get("truncated")),
    )


@router.get("/status")
async def ai_status():
    return {
        "status": "ready",
        "providers": providers.available_providers(),
        "phase": 10,
    }


@router.post("/investigation-assistant/query", response_model=AIResponse)
async def investigation_assistant_query(req: AIQueryRequest):
    """Grounded answer to a natural-language investigation question."""
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Query text is required.")
    scope = req.scope.model_dump(exclude_none=True)
    context = await _build_context(scope)
    provider = providers.get_provider()
    result = provider.generate(query=text, context=context)
    return _response_for(f"query-{int(time.time() * 1000)}", result, scope)


@router.post("/investigation-assistant/summarize", response_model=AIResponse)
async def investigation_assistant_summarize(req: AIQueryRequest):
    """Neutral summary of the current investigation scope."""
    context = await _build_context(req.scope.model_dump(exclude_none=True))
    provider = providers.get_provider()
    result = provider.generate(query="summarize this investigation", context=context)
    return _response_for(f"sum-{int(time.time() * 1000)}", result, {})


@router.get("/investigation-assistant/providers")
async def investigation_assistant_providers():
    return {"providers": providers.available_providers()}


# ---------------------------------------------------------------------------
# Phase 1 extraction/resolution stubs (preserved for backward compatibility)
# ---------------------------------------------------------------------------


@router.post("/extract-entities")
async def extract_entities():
    return {"entities": [], "message": "AI entity extraction - Phase 1"}


@router.post("/extract-relationships")
async def extract_relationships():
    return {"relationships": [], "message": "AI relationship extraction - Phase 1"}


@router.post("/resolve-entities")
async def resolve_entities():
    return {"resolutions": [], "message": "AI entity resolution - Phase 1"}
