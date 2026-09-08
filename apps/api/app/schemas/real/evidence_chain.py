"""Pydantic schemas for the Phase 18.2 evidence chain-of-custody API.

Mirror the chain model as ``{code, message, details}``-style read shapes, and
expose the verification summary returned by the verifier.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import SchemaBase, UUIDMixin


class EvidenceChainEntryRead(SchemaBase, UUIDMixin):
    """One persisted custody entry (chain link)."""

    evidence_id: UUID
    investigation_id: UUID
    sequence_number: int
    event_timestamp: datetime
    action: str
    payload_hash: str
    metadata_hash: str
    previous_entry_hash: str | None = None
    entry_hash: str
    actor_id: UUID | None = None
    actor_email: str | None = None
    details: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EvidenceChainVerifyRead(SchemaBase):
    """Result of running the custody-chain verifier."""

    status: str
    valid: bool
    entries: int
    verified_events: int = 0
    first_event_at: datetime | None = None
    last_event_at: datetime | None = None
    chain_head_hash: str | None = None
    failures: list[dict[str, Any]] = Field(default_factory=list)
    reason: str | None = None
    verified_at: datetime

    model_config = {"from_attributes": True}
