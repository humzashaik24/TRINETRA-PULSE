"""Evidence integrity verification (SHA-256).

Phase 17.6 wires evidence integrity into the persisted layer:

    Evidence metadata (PostgreSQL)
        ↓ computes deterministic SHA-256 over the canonical payload
    checksum stored in ``evidence.metadata_["checksum"]``
        ↓ verification recomputes and compares
    VALID | MISMATCH

The checksum is a deterministic digest of the evidence's canonical fields so
no external payload is required to verify metadata integrity. This is
*cryptographic integrity verification* and is the foundation a later
chain-of-custody / blockchain phase builds on — it does not itself implement
a ledger, wallet, or smart contract.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from app.models.investigation import InvestigationEvidence
from app.storage.evidence_storage import (
    MISSING,
    UNAVAILABLE,
    EvidenceStorageError,
)
from app.storage.factory import get_evidence_storage

VALID = "VALID"
MISMATCH = "MISMATCH"


def _canonical_datetime(value: Any) -> str:
    """Stable datetime serialization for integrity hashing.

    Drops timezone offset and microseconds so the digest survives a
    database round-trip (SQLite stores naive datetimes, PostgreSQL keeps the
    offset; both normalize to the same representation here).
    """
    dt = value.replace(tzinfo=None, microsecond=0)
    return dt.isoformat()


def canonical_payload(item: InvestigationEvidence) -> bytes:
    """Serialize the canonical evidence fields deterministically.

    Uses sorted JSON keys so the digest is stable across field ordering.
    None fields are omitted so missing optional values stay canonical.
    """
    payload: dict[str, Any] = {
        "evidence_id": str(item.id),
        "investigation_id": str(item.investigation_id),
        "evidence_type": item.evidence_type,
        "title": item.title,
    }
    if item.description:
        payload["description"] = item.description
    if item.source:
        payload["source"] = item.source
    if item.provenance:
        payload["provenance"] = item.provenance
    if item.collected_at:
        payload["collected_at"] = _canonical_datetime(item.collected_at)
    if item.storage_ref:
        payload["storage_ref"] = item.storage_ref
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return encoded.encode("utf-8")


def compute_checksum(item: InvestigationEvidence) -> str:
    """Return the authoritative checksum for an evidence item.

    Uploaded evidence stores the digest of the raw object in
    ``metadata.payload_checksum``. Metadata-only evidence keeps the historical
    canonical-row digest, preserving Phase 17.6 compatibility.
    """
    payload_checksum = (item.metadata_ or {}).get("payload_checksum")
    if isinstance(payload_checksum, str) and payload_checksum:
        return payload_checksum
    return hashlib.sha256(canonical_payload(item)).hexdigest()


def compute_payload_checksum(data: bytes) -> str:
    """Calculate the sole authoritative SHA-256 for raw evidence bytes."""
    return hashlib.sha256(data).hexdigest()


def attach_payload_checksum(item: InvestigationEvidence, checksum: str) -> str:
    """Persist a server-calculated raw payload checksum on an evidence row."""
    metadata = dict(item.metadata_ or {})
    metadata["checksum"] = checksum
    metadata["payload_checksum"] = checksum
    item.metadata_ = metadata
    return checksum


def attach_checksum(item: InvestigationEvidence) -> str:
    """Compute, store, and return the checksum for an evidence item.

    The checksum is written to ``metadata_["checksum"]`` (the evidence table
    keeps a JSONB metadata column rather than a dedicated hash column today).
    """
    checksum = compute_checksum(item)
    metadata = dict(item.metadata_ or {})
    metadata["checksum"] = checksum
    item.metadata_ = metadata
    return checksum


def verify_integrity(item: InvestigationEvidence) -> str:
    """Return ``VALID`` or ``MISMATCH`` by comparing stored vs recomputed.

    When no checksum has been stored the item cannot be verified; callers
    should surface that as a separate state (see :func:`stored_checksum`).
    """
    stored = stored_checksum(item)
    if stored is None:
        return "MISSING_CHECKSUM"
    return VALID if stored == compute_checksum(item) else MISMATCH


def stored_checksum(item: InvestigationEvidence) -> str | None:
    """The checksum stored in the evidence metadata (if any)."""
    metadata = item.metadata_ or {}
    value = metadata.get("checksum")
    return value if isinstance(value, str) else None


def integrity_status(item: InvestigationEvidence) -> dict[str, Any]:
    """Compact integrity status block for API responses."""
    return {
        "checksum": stored_checksum(item),
        "status": verify_integrity(item),
    }


def storage_status(item: InvestigationEvidence) -> str:
    """Verify the raw object without changing the authoritative checksum."""
    checksum = stored_checksum(item)
    if checksum is None:
        return MISSING
    if not item.storage_ref:
        return MISSING
    try:
        return get_evidence_storage().verify_integrity(
            item.id,
            checksum,
            investigation_id=item.investigation_id,
            storage_ref=item.storage_ref,
        )
    except EvidenceStorageError:
        return UNAVAILABLE
