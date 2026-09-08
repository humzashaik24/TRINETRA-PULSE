"""Connection testing for configured providers (Phase 23).

A connection test makes the smallest possible authenticated external call and
normalizes the outcome to a safe status string. Credentials, tokens and raw
upstream error text are intentionally NOT propagated: every failure collapses
to a coarse tag (missing/rejected credential, connectivity, bad endpoint) so a
test can never leak a secret or an internal vendor URL.

The mock provider short-circuits and reports CONNECTED so demo mode keeps
working with zero network access.
"""

from __future__ import annotations

import logging

import httpx

from app.models.provider import ProviderType
from app.provider_management.registry import ProviderBinding

logger = logging.getLogger(__name__)

TEST_TIMEOUT_SECONDS = 8.0

CONNECTED = "CONNECTED"
FAILED = "FAILED"

_GEMINI_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com"


class ConnectionTestError(Exception):
    """Safe, coarse-grained connection test failure."""


def _reject_connection(response: httpx.Response) -> None:
    if response.status_code in (401, 403):
        raise ConnectionTestError("credential rejected")
    if response.status_code >= 400:
        raise ConnectionTestError("endpoint error")


async def _test_openai_compatible(binding: ProviderBinding) -> None:
    """GET {base_url}/models — the cheapest authenticated endpoint."""
    if not binding.api_key:
        raise ConnectionTestError("missing credential")
    base_url = (binding.base_url or "").rstrip("/")
    if not base_url:
        raise ConnectionTestError("missing base_url")
    headers = {"Authorization": f"Bearer {binding.api_key}"}
    if binding.provider_type == ProviderType.OPENROUTER:
        headers["HTTP-Referer"] = "https://trinetra.pulse.local"
        headers["X-Title"] = "Trinetra Pulse"
    async with httpx.AsyncClient(timeout=TEST_TIMEOUT_SECONDS) as client:
        try:
            response = await client.get(f"{base_url}/models", headers=headers)
        except httpx.HTTPError:
            raise ConnectionTestError("connectivity error") from None
    _reject_connection(response)


async def _test_gemini(binding: ProviderBinding) -> None:
    """GET the v1beta models list with an API_KEY query parameter."""
    if not binding.api_key:
        raise ConnectionTestError("missing credential")
    base_url = (binding.base_url or _GEMINI_DEFAULT_BASE_URL).rstrip("/")
    async with httpx.AsyncClient(timeout=TEST_TIMEOUT_SECONDS) as client:
        try:
            response = await client.get(
                f"{base_url}/v1beta/models", params={"key": binding.api_key}
            )
        except httpx.HTTPError:
            raise ConnectionTestError("connectivity error") from None
    _reject_connection(response)


async def test_connection(binding: ProviderBinding) -> str:
    """Return ``CONNECTED`` or ``FAILED`` for a resolved provider binding."""
    if binding.is_mock:
        return CONNECTED
    try:
        if binding.provider_type == ProviderType.GEMINI:
            await _test_gemini(binding)
        else:
            await _test_openai_compatible(binding)
    except ConnectionTestError as exc:
        logger.info(
            "provider_connection_test_failed",
            reason=str(exc),
            provider=binding.provider_type.value,
        )
        return FAILED
    return CONNECTED
