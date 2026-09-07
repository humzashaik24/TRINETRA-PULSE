"""Phase 10 — AI investigation assistant tests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.ai.providers import (
    MockInvestigationAIProvider,
    guard_neutral,
    serialize_context,
)
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Neutrality guard
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "Subject verified as criminal.",
        "He is the mastermind of the group.",
        "The entity is definitely guilty.",
        "A dangerous ringleader was identified.",
    ],
)
def test_guard_neutral_strips_guilt_assertions(text):
    out = guard_neutral(text)
    banned = ("criminal", "mastermind", "guilty", "dangerous", "ringleader")
    assert not any(t in out for t in banned)


def test_guard_neutral_preserves_observational_terms():
    out = guard_neutral("The entity is observed as highly connected.")
    assert out == "The entity is observed as highly connected."


def test_mock_provider_response_is_neutral():
    provider = MockInvestigationAIProvider()
    result = provider.generate(
        query="who is the mastermind here",
        context={
            "entity": {"label": "Rahul", "type": "person", "connections": 12},
            "investigation": None,
        },
    )
    assert not ("mastermind" in result["answer"] or "guilty" in result["answer"])


# ---------------------------------------------------------------------------
# Context DATA separation (prompt-injection defense)
# ---------------------------------------------------------------------------


def test_serialize_context_marks_data_block():
    block = serialize_context(
        {
            "investigation": {"title": "Op Meridian", "status": "active", "entityCount": 4},
            "relationships": [{"label": "A — knows — B", "confidence": "high"}],
            "evidence": [{"label": "Doc 1", "summary": "Recorded observation"}],
        }
    )
    assert block.startswith("[BEGIN CONTEXT DATA")
    assert block.rstrip().endswith("[END CONTEXT DATA]")
    assert "Op Meridian" in block
    # Data never bleeds into instructions as commands.
    assert "ignore previous" not in block.lower()


# ---------------------------------------------------------------------------
# Query endpoint is grounded and read-only
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_query_endpoint_returns_neutral_response(client: AsyncClient):
    response = await client.post(
        "/api/v1/ai/investigation-assistant/query",
        json={
            "text": "Summarize this investigation",
            "scope": {"investigation_id": "inv-001"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "status" in data
    assert not ("guilty" in data["answer"].lower() or "criminal" in data["answer"].lower())


@pytest.mark.anyio
async def test_query_endpoint_rejects_empty_text(client: AsyncClient):
    response = await client.post(
        "/api/v1/ai/investigation-assistant/query",
        json={"text": "   ", "scope": {}},
    )
    assert response.status_code == 400


@pytest.mark.anyio
async def test_providers_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/ai/investigation-assistant/providers")
    assert response.status_code == 200
    data = response.json()
    assert "mock" in data["providers"]
    assert "openai" in data["providers"]
