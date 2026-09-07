"""Evidence integrity persistence (Phase 21 — blockchain evidence integrity).

Only the blockchain anchor is a persisted ledger of record. The custody chain
itself is derived deterministically from the evidence record (``chain_for`` in
the service) so it is always replayable and provably tied to the evidence — no
second custody ledger, no duplicated metadata.

The anchor table stores ONLY cryptographic/reference information: the anchor
digest (SHA-256 over investigation_id + evidence_id + evidence_checksum +
custody_chain_hash + sequence), the custody chain hash it anchors, provider
receipt identifiers and status. Raw evidence and PII are never stored here and
never leave the application.
"""

from __future__ import annotations

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, String, UniqueConstraint

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class EvidenceBlockchainAnchor(BaseModel):
    """A persisted blockchain anchor for one evidence custody state.

    Table ``evidence_blockchain_anchors``.
    """

    __tablename__ = "evidence_blockchain_anchors"
    __table_args__ = (
        UniqueConstraint("evidence_id", "anchor_digest", name="uq_anchor_evidence_digest"),
    )

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_id = Column(
        Uuid,
        ForeignKey("evidence.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Hash of the custody chain head at the moment of anchoring.
    custody_chain_hash = Column(String(64), nullable=False)
    # Deterministic over-the-wire anchor digest (see evidence_integrity.digest).
    anchor_digest = Column(String(64), nullable=False, unique=True)
    network = Column(String(200), nullable=False)
    transaction_id = Column(String(100), nullable=True)
    block_number = Column(BigInteger, nullable=True)
    contract_address = Column(String(100), nullable=True)
    # Lifecycle status: PENDING | ANCHORED | UNAVAILABLE.
    status = Column(String(50), nullable=False, server_default="PENDING")
    provider = Column(String(50), nullable=False)
    is_mock = Column(Boolean, nullable=False, server_default="false")
    reason = Column(String(500), nullable=True)
    anchored_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)
