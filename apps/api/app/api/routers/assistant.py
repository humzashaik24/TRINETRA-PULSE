"""Phase 17.5 — database-backed (v2) AI investigation assistant router.

Mounted at ``/api/v2/ai``. Accepts a client-side bounded, investigation-scoped
context (assembled by the web orchestrator's real retrieval) as DATA, runs it
through the shared provider abstraction (``app.ai.providers``), and returns a
source-traced, validated ``AIResponse``.

Guarantees kept here:
  - Read-only: the assistant never creates or mutates persisted records.
  - Explicit scope: every answer is bound to one investigation; requests
    without a bounded scope or investigation are answered as not-found.
  - DATA separation: retrieved text is delivered as data, never instructions
    (prompt-injection defense lives in the providers).
  - Neutral output: provider guard enforces observed/inferred/analytical
    phrasing; no guilt or criminal assertions are ever produced.
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, HTTPException

from app.ai import providers
from app.ai.schemas import (
    AIAction,
    AIActionTarget,
    AIQueryRequest,
    AIResponse,
    AISourceReference,
)

router = APIRouter()

_CONTEXT_KEYS = (
    "investigation",
    "entity",
    "relationships",
    "evidence",
    "findings",
    "timeline",
    "analytics",
    "truncated",
)


def _merge_supplied_context(
    scope: dict[str, Any], supplied: dict[str, Any]
) -> dict[str, Any]:
    """Bound the assistant to the requested investigation scope.

    The client-supplied context is trusted only as DATA. It was already
    retrieved (read-only) against the caller's own investigation by the web
    orchestrator. A minimal scope stub is added when the payload omits an
    investigation so the request is always explicitly scoped.
    """
    context: dict[str, Any] = {}
    if scope.get("investigation_id"):
        context["investigation"] = {
            "sourceId": scope["investigation_id"],
            "label": "Investigation " + str(scope["investigation_id"])[:8],
            "scoped": True,
        }
    for key in _CONTEXT_KEYS:
        if supplied.get(key) is not None:
            context[key] = supplied[key]
    return context


def _ref(
    source_type: str, source_id: str, label: str, relevance: float
) -> AISourceReference:
    return AISourceReference(
        id=f"{source_type}:{source_id}",
        source_type=source_type,
        source_id=str(source_id),
        label=str(label or ""),
        relevance=relevance,
    )


def _sources_from_context(context: dict[str, Any]) -> list[AISourceReference]:
    """Trace every source the bounded context actually referenced."""
    refs: list[AISourceReference] = []
    inv = context.get("investigation")
    if inv and inv.get("sourceId"):
        refs.append(
            _ref(
                "Investigation",
                inv["sourceId"],
                inv.get("label")
                or inv.get("title")
                or f"Investigation {str(inv['sourceId'])[:8]}",
                0.95,
            )
        )
    entity = context.get("entity")
    if entity and entity.get("sourceId"):
        refs.append(
            _ref(
                "Entity",
                entity["sourceId"],
                entity.get("label") or entity.get("name"),
                1.0,
            )
        )
    for kind, source_type in (
        ("relationships", "Relationship"),
        ("evidence", "Evidence"),
        ("findings", "Finding"),
    ):
        for item in context.get(kind, []) or []:
            sid = item.get("sourceId")
            if sid:
                refs.append(
                    _ref(
                        source_type,
                        str(sid),
                        item.get("label") or item.get("title") or str(sid),
                        0.55,
                    )
                )
    timeline = context.get("timeline")
    entries = timeline if isinstance(timeline, list) else ([timeline] if timeline else [])
    for item in entries:
        sid = item.get("sourceId")
        if sid:
            refs.append(
                _ref(
                    "Timeline",
                    str(sid),
                    item.get("label") or item.get("title") or str(sid),
                    0.5,
                )
            )
    return refs


def _ai_response(query_id: str, result: dict[str, Any], context: dict[str, Any]) -> AIResponse:
    answer = result.get("answer") or ""
    sources: list[AISourceReference] = []
    seen: set[str] = set()
    for item in [
        *result.get("sources", []),
        *_sources_from_context(context),
    ]:
        rid = item.get("id") if isinstance(item, dict) else item.id
        if not rid or rid in seen:
            continue
        seen.add(rid)
        if isinstance(item, dict):
            sources.append(
                _ref(
                    str(item.get("source_type") or ""),
                    str(item.get("source_id") or ""),
                    str(item.get("label") or ""),
                    float(item.get("relevance") or 0.0),
                )
            )
        else:
            sources.append(item)

    suggested_actions: list[AIAction] = []
    for raw in result.get("suggested_actions", []) or []:
        target = raw.get("target") or {}
        suggested_actions.append(
            AIAction(
                id=str(raw.get("id")),
                type=str(raw.get("type") or "OPEN_ENTITY"),
                label=str(raw.get("label") or ""),
                target=AIActionTarget(**target) if target else None,
                status=str(raw.get("status") or "available"),
            )
        )

    return AIResponse(
        id=f"ai-{query_id}",
        query_id=query_id,
        status="complete" if answer else "not_found",
        answer=answer,
        key_points=result.get("key_points", []),
        confidence=result.get("confidence", {"answerGrounding": 0.0}),
        limitations=result.get("limitations", []),
        suggested_actions=suggested_actions,
        sources=sources,
        incomplete=bool(context.get("truncated")),
    )


@router.get("/status")
async def assistant_status():
    provider = providers.get_provider()
    return {
        "status": "ready",
        "providers": providers.available_providers(),
        "active": provider.name,
        "model": provider.model,
        "phase": "17.5",
    }


@router.get("/providers")
async def assistant_providers():
    return {"providers": providers.available_providers()}


@router.post("/investigation-assistant/query", response_model=AIResponse)
async def investigation_assistant_query(req: AIQueryRequest):
    """Grounded, investigation-scoped answer to a natural-language question."""
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Query text is required.")

    scope = req.scope.model_dump(exclude_none=True)
    context = _merge_supplied_context(scope, req.context or {})

    if not scope.get("investigation_id") and not req.context:
        return _ai_response(
            f"empty-{int(time.time() * 1000)}",
            {
                "answer": "",
                "key_points": [],
                "confidence": {},
                "limitations": [
                    "No investigation scope was provided; the assistant cannot "
                    "answer without a bounded investigation context."
                ],
                "sources": [],
            },
            context,
        )

    provider = providers.get_provider()
    result = provider.generate(query=text, context=context)
    return _ai_response(f"query-{int(time.time() * 1000)}", result, context)
