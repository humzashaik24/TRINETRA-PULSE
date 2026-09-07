"""Evidence integrity engine (Phase 21 — blockchain evidence integrity anchoring).

Deterministic, documented crypto primitives for the evidence custody chain and
the blockchain anchor digest. Nothing in this module ever hashes raw evidence
content or PII: the anchor digest binds only cryptographic/reference
identifiers (investigation id, evidence id, evidence checksum, custody chain
hash, chain sequence).

Language is deliberately neutral. A blockchain anchor proves that a digest of
these identifiers existed on-chain at a snapshot time; it proves nothing about
whether any underlying evidence content is truthful.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime

# Canonical algorithm version for the anchor digest + custody chain H of H.
INTEGRITY_VERSION = "evidence-integrity-v1"


def sha256_hex(*parts: str) -> str:
    """Lowercase SHA-256 hex digest of the UTF-8 encoding of the joined parts."""
    payload = "".join(parts).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def canonical_json(data: dict) -> str:
    """Deterministic JSON: sorted keys, compact separators, no whitespace."""
    return json.dumps(
        data, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    )


# ---------------------------------------------------------------------------
# Custody chain
# ---------------------------------------------------------------------------

def metadata_hash_for(details: dict) -> str:
    """``metadata_hash`` — SHA-256 of the canonical JSON of the event details."""
    return sha256_hex(canonical_json(details or {}))


def custody_event_hash(
    *,
    previous_event_hash: str | None,
    sequence: int,
    action: str,
    event_timestamp: datetime,
    evidence_checksum: str,
    metadata_hash: str,
    actor: str,
) -> str:
    """``current_event_hash`` for a custody event.

    Canonical field order (documented, stable across runs):
      previous_event_hash ("" when None) + sequence + action +
      event_timestamp.isoformat() + evidence_checksum + metadata_hash + actor
    """
    previous = previous_event_hash or ""
    return sha256_hex(
        previous,
        str(sequence),
        action,
        event_timestamp.isoformat(),
        evidence_checksum,
        metadata_hash,
        actor,
    )


# ---------------------------------------------------------------------------
# Anchor digest
# ---------------------------------------------------------------------------

def anchor_digest(
    *,
    investigation_id: str,
    evidence_id: str,
    evidence_checksum: str,
    custody_chain_hash: str,
    sequence: int,
) -> str:
    """Deterministic over-the-wire anchor digest.

    Canonical string (documented, stable across runs) — UUIDs as lowercase
    un-hyphenated hex, checksums/hashes as lowercase hex, sequence decimal:

      SHA256(
        investigation_id.hex
        + evidence_id.hex
        + evidence_checksum
        + custody_chain_hash
        + str(sequence)
      )

    The digest is the ONLY value ever sent to the blockchain provider.
    """
    return sha256_hex(
        str(investigation_id).replace("-", "").lower(),
        str(evidence_id).replace("-", "").lower(),
        (evidence_checksum or "").lower(),
        (custody_chain_hash or "").lower(),
        str(sequence),
    )
