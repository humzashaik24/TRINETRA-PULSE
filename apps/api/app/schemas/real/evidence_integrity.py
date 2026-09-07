"""Evidence integrity schemas (real application layer, Phase 21).

Mirror the shapes the frontend consumes for evidence integrity while keeping
UUID identities and additive semantics. Reads never accept actor identity from
the client — the authenticated context supplies it.

Language is deliberately neutral: verification describes the integrity state of
a cryptographic digest, never the truthfulness of evidence content.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.common import SchemaBase


class CustodyEventRead(SchemaBase):
    sequence: int
    action: str
    event_timestamp: datetime | None = None
    evidence_checksum: str | None = None
    metadata_hash: str | None = None
    previous_event_hash: str | None = None
    current_event_hash: str | None = None
    actor: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvidenceIntegrityRead(SchemaBase):
    evidence_id: Any
    investigation_id: Any
    evidence_checksum: str | None = None
    custody_chain_hash: str | None = None
    associated_anchor_digest: str | None = None
    status: str  # COMPLETE | CHECKSUM_UNAVAILABLE | NOT_ANCHORED
    status_detail: str | None = None
    algorithm_version: str
    custody_events: list[CustodyEventRead] = Field(default_factory=list)
    generated_at: datetime


class AnchorViewRead(SchemaBase):
    anchor_id: Any
    evidence_id: Any
    investigation_id: Any
    custody_chain_hash: str
    anchor_digest: str
    network: str
    provider: str
    is_mock: bool
    status: str  # PENDING | ANCHORED | UNAVAILABLE
    transaction_id: str | None = None
    block_number: int | None = None
    contract_address: str | None = None
    anchored_at: datetime | None = None
    verified_at: datetime | None = None
    reason: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvidenceIntegrityProviderView(SchemaBase):
    provider: str
    network: str
    healthy: bool
    is_mock: bool
    detail: str


class EvidenceBlockchainRead(SchemaBase):
    """Full blockchain-anchor view for one evidence item (snake_case wire)."""

    evidence_id: Any
    investigation_id: Any
    integrity: EvidenceIntegrityRead
    anchor: AnchorViewRead | None = None
    provider: EvidenceIntegrityProviderView
    verification_state: str  # NOT_ANCHORED | VERIFIED | MISMATCH | PENDING | UNAVAILABLE
    last_verified_at: datetime | None = None
    message: str | None = None
    generated_at: datetime


class AnchorRequest(SchemaBase):
    """Optional client hints for the anchor action.

    No actor identity, no credentials, no evidence payload are accepted — the
    digest and custody hash are derived server-side only.
    """

    message: str | None = Field(default=None, max_length=200)


class AnchorResponse(SchemaBase):
    evidence_id: Any
    investigation_id: Any
    anchor: AnchorViewRead | None = None
    verification_state: str
    message: str | None = None
    anchored: bool = False
    already_anchored: bool = False


class VerifyResponse(SchemaBase):
    evidence_id: Any
    investigation_id: Any
    verification_state: str  # NOT_ANCHORED | VERIFIED | MISMATCH | PENDING | UNAVAILABLE
    current_custody_chain_hash: str | None = None
    anchored_custody_chain_hash: str | None = None
    on_chain_digest: str | None = None
    detail: str | None = None
    verified_at: datetime | None = None
    anchor: AnchorViewRead | None = None
    message: str | None = None
