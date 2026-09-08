"""Cryptographic evidence chain-of-custody ledger (Phase 18.2).

This is the tamper-evident hash-chain persisted for every evidence item in the
relational layer. It is deliberately **not** a public blockchain: there is no
distributed ledger, wallet, or external network. Instead it is an
append-only, per-evidence hash chain held in PostgreSQL that gives each
evidence item a durable, cryptographically-linked custody record.

Design
------
Each evidence item owns an ordered sequence of entries (``sequence_number``).
A new entry is appended by computing three SHA-256 digests over deterministic
canonical values:

- ``payload_hash`` — the single authoritative SHA-256 of the evidence itself,
  reusing :func:`app.services.evidence_integrity.compute_checksum` so there is
  exactly one checksum implementation (Phase 18.2.12).
- ``metadata_hash`` — SHA-256 over canonical JSON (``sort_keys``) of the
  entry's own metadata (the action + actor context).
- ``entry_hash`` — SHA-256 over the canonical fields joined with ``\\x1f``
  (unit separator), which includes the previous entry's hash, forming the
  chain link. Recomputing the hash of an entry that was tampered with, or
  changing any predecessor, breaks the chain.

Verification distinguishes:

- TAMPERED — an entry's recomputed hash differs from its stored value.
- BROKEN_CHAIN — the stored previous-hash of an entry does not match the hash
  of its predecessor (a link / sequence violation).
- VALID / MISSING / INVALID_SCOPE.

The action vocabulary is intentionally small (creation + upload are the only
workflows that currently exist; the rest are supported constants so the chain
can grow without a schema change).
"""

from __future__ import annotations

import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class EvidenceChainAction(enum.StrEnum):
    """Vocabulary of custody lifecycle actions recorded on the chain.

    ``EVIDENCE_CREATED`` and ``EVIDENCE_UPLOADED`` are emitted today by the
    evidence creation + ingestion workflows. The remaining constants are
    supported values so a later phase can record access/verification/export
    without a schema migration.
    """

    EVIDENCE_CREATED = "evidence_created"
    EVIDENCE_UPLOADED = "evidence_uploaded"
    EVIDENCE_ACCESSED = "evidence_accessed"
    EVIDENCE_VERIFIED = "evidence_verified"
    EVIDENCE_METADATA_UPDATED = "evidence_metadata_updated"
    EVIDENCE_EXPORTED = "evidence_exported"
    EVIDENCE_TRANSFERRED = "evidence_transferred"
    INTEGRITY_CHECKED = "integrity_checked"


class EvidenceChainEntry(BaseModel):
    """A single tamper-evident entry in an evidence's custody chain.

    Columns are the deterministic digest inputs plus the chain link
    (``previous_entry_hash``) and the sequence. ``entry_hash`` is unique
    across the whole chain-of-custody ledger, and
    ``(evidence_id, sequence_number)`` is unique per chain.
    """

    __tablename__ = "evidence_chain_entries"
    __table_args__ = (
        UniqueConstraint(
            "evidence_id",
            "sequence_number",
            name="uq_evidence_chain_evidence_sequence",
        ),
    )

    evidence_id = Column(
        Uuid,
        ForeignKey("evidence.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Denormalized investigation scope so chain rows can be listed/cleaned with
    # the investigation independently of the DB's cascade enforcement.
    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sequence_number = Column(Integer, nullable=False)
    event_timestamp = Column(DateTime(timezone=True), nullable=False)
    action = Column(
        Enum(EvidenceChainAction, name="evidence_chain_action", native_enum=False, length=32),
        nullable=False,
    )
    payload_hash = Column(String(64), nullable=False)
    metadata_hash = Column(String(64), nullable=False)
    previous_entry_hash = Column(String(64), nullable=True)
    entry_hash = Column(String(64), nullable=False, unique=True, index=True)
    actor_id = Column(Uuid, nullable=True)
    actor_email = Column(String(320), nullable=True)
    details = Column(JSONB, nullable=True)

    evidence = relationship("InvestigationEvidence", back_populates="chain_entries")
