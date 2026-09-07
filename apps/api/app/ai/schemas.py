"""Phase 10 — AI investigation assistant request/response schemas."""

from typing import Any

from pydantic import BaseModel, Field


class InvestigationContextScope(BaseModel):
    investigation_id: str | None = None
    organization_id: str | None = None
    user_id: str | None = None
    network_id: str | None = None
    entity_id: str | None = None
    relationship_id: str | None = None
    tab: str | None = None


class AIQueryRequest(BaseModel):
    text: str
    scope: InvestigationContextScope = Field(default_factory=InvestigationContextScope)
    conversation_id: str | None = None
    history: list[dict[str, str]] = Field(default_factory=list)
    # Client-side bounded, investigation-scoped context assembled by the web
    # orchestrator's real retrieval. Delivered to the provider as DATA only.
    context: dict[str, Any] = Field(default_factory=dict)


class AISourceReference(BaseModel):
    id: str
    source_type: str
    source_id: str
    label: str
    relevance: float = 0.0
    payload: dict[str, Any] | None = None


class AIActionTarget(BaseModel):
    entity_id: str | None = None
    network_id: str | None = None
    investigation_id: str | None = None


class AIAction(BaseModel):
    id: str
    type: str
    label: str
    target: AIActionTarget | None = None
    status: str = "available"


class AIResponse(BaseModel):
    id: str
    query_id: str
    status: str
    answer: str
    key_points: list[str] = Field(default_factory=list)
    confidence: dict[str, float] = Field(default_factory=dict)
    limitations: list[str] = Field(default_factory=list)
    suggested_actions: list[AIAction] = Field(default_factory=list)
    sources: list[AISourceReference] = Field(default_factory=list)
    incomplete: bool = False
