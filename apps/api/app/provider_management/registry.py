"""Provider registry: deterministic resolution of the active provider per capability.

The registry answers "which enabled provider backs INVESTIGATION_AI right now?"
for the rest of the platform. Config rows are managed by admins via
``/api/v2/admin/providers``; the registry only READS them and never exposes
secrets. A resolved entry surfaces as a fortified ``ProviderBinding``
(decrypted credential + endpoint + model) or falls back to the built-in mock
provider whenever nothing is configured or enabled — the pre-Phase 23 behavior.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.secret_crypto import decrypt_secret
from app.models import AIConfigProvider
from app.models.provider import ProviderCapability, ProviderType

_MOCK_PROVIDER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@dataclass(frozen=True)
class ProviderBinding:
    """Runtime binding for one capability, ready for a capability implementation."""

    provider_id: uuid.UUID
    provider_name: str
    provider_type: ProviderType
    capability: ProviderCapability
    model: str
    base_url: str | None
    configuration: dict | None = None
    api_key: str = field(default="", repr=False)  # decrypted; repr=False never logs it

    @property
    def is_mock(self) -> bool:
        return self.provider_type == ProviderType.MOCK


DEFAULT_MOCK_BINDING = ProviderBinding(
    provider_id=_MOCK_PROVIDER_ID,
    provider_name="Mock Provider",
    provider_type=ProviderType.MOCK,
    capability=ProviderCapability.INVESTIGATION_AI,
    model="trinetra-deterministic-local-v0",
    base_url=None,
)


class ProviderRegistry:
    """Read-only resolution layer over stored provider configurations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_capability(
        self, capability: ProviderCapability
    ) -> list[AIConfigProvider]:
        stmt = (
            select(AIConfigProvider)
            .where(AIConfigProvider.capability == capability)
            .order_by(AIConfigProvider.created_at.asc())
        )
        return list((await self._session.execute(stmt)).scalars())

    async def resolve(self, capability: ProviderCapability) -> ProviderBinding:
        """Return the active provider bound for ``capability``.

        Selection rules (deterministic, over the stored entries for the
        capability):

        1. the single enabled ``is_default`` provider, if any;
        2. otherwise the first enabled provider by stable creation order;
        3. otherwise the built-in mock binding (pre-Phase 23 fallback).
        """
        rows = await self.list_for_capability(capability)
        enabled = [p for p in rows if p.enabled]
        chosen = next((p for p in enabled if p.is_default), None) or (
            enabled[0] if enabled else None
        )
        if chosen is None:
            return DEFAULT_MOCK_BINDING
        return binding_from_row(chosen)


def binding_from_row(provider: AIConfigProvider) -> ProviderBinding:
    """Build a runtime binding for a single stored provider row."""
    return ProviderBinding(
        provider_id=provider.id,
        provider_name=provider.provider_name,
        provider_type=provider.provider_type,
        capability=provider.capability,
        model=provider.model,
        base_url=provider.base_url,
        configuration=provider.configuration,
        api_key=decrypt_secret(provider.encrypted_api_key),
    )
