"""AI/media provider request/response schemas (Phase 23).

Credentials are a write-only channel: the create/update payloads accept a
plaintext ``credential``, but every read response carries only ``has_credential``
plus a masked digest. The plaintext never crosses the API boundary inward
(there is no "fetch my key" endpoint) and never leaves it outward.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.provider import ProviderCapability, ProviderType
from app.schemas.common import SchemaBase


class ProviderCreate(BaseModel):
    """Body for ``POST /admin/providers``."""

    provider_name: str = Field(..., min_length=1, max_length=120)
    provider_type: ProviderType
    capability: ProviderCapability
    model: str = Field(..., min_length=1, max_length=200)
    base_url: str | None = Field(default=None, max_length=500)
    enabled: bool = True
    is_default: bool = False
    configuration: dict | None = None
    # Plaintext API credential (write-only). Empty/None stores no credential.
    credential: str | None = Field(default=None, max_length=4000)


class ProviderUpdate(BaseModel):
    """Body for ``PATCH /admin/providers/{id}``.

    Semantics:

    - a field is left untouched when omitted (``exclude_unset`` is applied by
      the service);
    - ``credential``: a non-empty value replaces the stored secret; an empty /
      ``null`` value KEEPS the existing secret (blank means no change);
    - ``clear_credential=true`` explicitly removes the stored secret.
    """

    provider_name: str | None = Field(default=None, min_length=1, max_length=120)
    provider_type: ProviderType | None = None
    capability: ProviderCapability | None = None
    model: str | None = Field(default=None, min_length=1, max_length=200)
    base_url: str | None = Field(default=None, max_length=500)
    enabled: bool | None = None
    is_default: bool | None = None
    configuration: dict | None = None
    credential: str | None = Field(default=None, max_length=4000)
    clear_credential: bool = False


class ProviderRead(SchemaBase):
    """Safe provider view — never carries plaintext or decrypted credentials."""

    id: UUID
    provider_name: str
    provider_type: ProviderType
    capability: ProviderCapability
    model: str
    base_url: str | None
    enabled: bool
    is_default: bool
    configuration: dict | None
    has_credential: bool
    credential_masked: str
    created_at: datetime
    updated_at: datetime
    created_by: UUID | None
    updated_by: UUID | None


class ProviderTestResult(SchemaBase):
    """Outcome of ``POST /admin/providers/{id}/test``.

    ``mode`` disambiguates the built-in mock (MOCK) from a real external call
    (EXTERNAL). No upstream error text or credentials are ever echoed.
    """

    status: Literal["CONNECTED", "FAILED"]
    provider: str
    capability: ProviderCapability
    mode: Literal["MOCK", "EXTERNAL"]
