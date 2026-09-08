"""AI/media provider configuration model (Phase 23).

Admins configure one provider per capability (INVESTIGATION_AI, VISION, VIDEO,
TRANSCRIPTION). Plaintext API credentials are NEVER stored: ``encrypted_api_key``
carries an AES-256-GCM ciphertext produced by ``app.core.secret_crypto``, and
every read path returns only a masked digest of the secret.

Invariants enforced by the service layer (see ``app.provider_management``):

- the provider type must support the requested capability (explicit matrix)
- at most one enabled provider may be ``is_default`` per capability (a partial
  unique index on ``(capability) WHERE is_default`` backs this in the schema)
- a disabled provider can never be the default
"""

from __future__ import annotations

import enum

from sqlalchemy import (
    Boolean,
    Column,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import text

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class ProviderType(enum.StrEnum):
    """Supported provider families (Phase 23..25).

    ``LOCAL`` (Phase 25) is not a server-side API provider: it records that an
    evidence analysis was produced by in-browser / on-device inference (e.g.
    local Whisper transcription) and is never persisted in the Phase 23 admin
    configuration.
    """

    OPENAI = "openai"
    GEMINI = "gemini"
    OPENROUTER = "openrouter"
    MOCK = "mock"
    LOCAL = "local"


class ProviderCapability(enum.StrEnum):
    """Capabilities a provider configuration can back.

    INVESTIGATION_AI  — grounded investigation assistant (Phase 10).
    VISION            — image / document understanding.
    VIDEO             — video understanding (future capability).
    TRANSCRIPTION     — audio transcription (future capability).
    """

    INVESTIGATION_AI = "investigation_ai"
    VISION = "vision"
    VIDEO = "video"
    TRANSCRIPTION = "transcription"


class AIConfigProvider(BaseModel):
    """Server-side configuration for one AI/media provider + capability pair."""

    __tablename__ = "ai_config_providers"

    provider_name = Column(String(120), nullable=False)
    provider_type = Column(
        Enum(ProviderType, name="provider_type", native_enum=False, length=32),
        nullable=False,
    )
    capability = Column(
        Enum(ProviderCapability, name="provider_capability", native_enum=False, length=32),
        nullable=False,
    )
    model = Column(String(200), nullable=False)
    base_url = Column(String(500), nullable=True)
    enabled = Column(Boolean, nullable=False, default=True, server_default="1")
    is_default = Column(Boolean, nullable=False, default=False, server_default="0")
    configuration = Column(JSONB, nullable=True)
    encrypted_api_key = Column(Text, nullable=True)
    created_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "capability",
            "provider_name",
            name="uq_ai_provider_capability_name",
        ),
        # One default per capability: the partial unique index only covers rows
        # with is_default = true. PostgreSQL and SQLite both support the WHERE
        # clause so tests (SQLite) exercise the same DDL shape as production.
        Index(
            "uq_ai_provider_default_per_capability",
            "capability",
            unique=True,
            postgresql_where=text("is_default"),
            sqlite_where=text("is_default"),
        ),
    )
