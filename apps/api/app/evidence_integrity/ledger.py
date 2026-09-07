"""Deterministic evidence custody-chain derivation (Phase 21).

The custody chain (WHO/WHAT/WHEN/HASH over the evidence lifecycle) is DERIVED,
never persisted as a second ledger. Chain events are recomputed on demand from
the evidence record + anchor row, so the chain is always replayable and provably
tied to the evidence. Every event is cryptographically chained to the previous
one (hash of the concatenated canonical fields).

Only one evolution is ever anchored: the ``EVIDENCE_UPLOADED`` head at the
moment of anchoring. The ``BLOCKCHAIN_ANCHORED`` event is appended on top of the
anchored head afterwards, so the persisted anchor's custody_chain_hash always
equals the hash of the anchored state.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.evidence_integrity.digest import (
    INTEGRITY_VERSION,
    custody_event_hash,
    metadata_hash_for,
)


def _iso(dt: datetime | None) -> datetime:
    if dt is None:
        return datetime(1970, 1, 1, tzinfo=UTC)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _hex(value: str | None) -> str:
    return (value or "").strip().lower()


def _trim(value) -> str:
    if value is None:
        return ""
    return str(value).strip()[:200]  # bounded; full refs stay in the DB


def custody_event(
    *,
    sequence: int,
    action: str,
    event_timestamp: datetime | None,
    evidence_checksum: str | None,
    metadata: dict | None,
    previous_event_hash: str | None,
    actor: str,
) -> dict:
    """Build a single chained custody event as a plain dict."""
    metadata = metadata or {}
    event_ts = _iso(event_timestamp)
    metadata_hash = metadata_hash_for(metadata)
    current = custody_event_hash(
        previous_event_hash=previous_event_hash,
        sequence=sequence,
        action=action,
        event_timestamp=event_ts,
        evidence_checksum=_hex(evidence_checksum),
        metadata_hash=metadata_hash,
        actor=actor,
    )
    return {
        "sequence": sequence,
        "action": action,
        "event_timestamp": event_ts.isoformat(),
        "evidence_checksum": _hex(evidence_checksum),
        "metadata_hash": metadata_hash,
        "previous_event_hash": previous_event_hash,
        "current_event_hash": current,
        "actor": actor,
        "metadata": metadata,
    }


def derive_upload_chain(
    *,
    evidence_id,
    investigation_id,
    evidence_checksum,
    created_at,
    source,
    source_type,
    provenance,
    actor: str = "system",
) -> list[dict]:
    """The anchored custody chain for an evidence upload (the head carries the
    hash anchored to the blockchain).

    Event metadata stays OFF-chain and bounded: only reference identifiers and
    structural fields, never raw evidence, payload bytes or PII.
    """
    provenance = provenance or {}
    metadata = {
        "evidence_id": str(evidence_id),
        "investigation_id": str(investigation_id),
        "source": _trim(source),
        "source_id": _trim(provenance.get("source_id")),
        "source_type": _trim(source_type or provenance.get("source_type")),
        "record_identifier": _trim(provenance.get("record_identifier")),
        "event_type": "evidence-uploaded",
    }
    metadata = {k: v for k, v in metadata.items() if v}

    upload = custody_event(
        sequence=1,
        action="EVIDENCE_UPLOADED",
        event_timestamp=created_at,
        evidence_checksum=_hex(evidence_checksum),
        metadata=metadata,
        previous_event_hash=None,
        actor=actor or "system",
    )
    return [upload]


def append_anchor_event(
    *,
    chain: list[dict],
    anchor_event_timestamp: datetime | None,
    evidence_checksum: str,
    actor: str,
    metadata: dict | None,
) -> list[dict]:
    """Append the BLOCKCHAIN_ANCHORED event on top of an existing chain."""
    tail = chain[-1]
    anchor_event = custody_event(
        sequence=tail["sequence"] + 1,
        action="BLOCKCHAIN_ANCHORED",
        event_timestamp=anchor_event_timestamp,
        evidence_checksum=_hex(evidence_checksum),
        metadata=metadata,
        previous_event_hash=tail["current_event_hash"],
        actor=actor,
    )
    return [*chain, anchor_event]


def chain_head_hash(chain: list[dict]) -> str | None:
    return chain[-1]["current_event_hash"] if chain else None


def integrity_version() -> str:
    return INTEGRITY_VERSION
