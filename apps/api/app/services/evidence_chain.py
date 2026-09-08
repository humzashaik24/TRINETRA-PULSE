"""Evidence chain-of-custody service + verification (Phase 18.2).

This module implements the tamper-evident, per-evidence hash chain. It is the
cryptographic "chain-of-custody ledger" that Phase 18.2 introduces — but
deliberately scoped to a PostgreSQL-backed, append-only hash chain per evidence
item. The architecture is isolated so a future phase can swap in a distributed
ledger adapter without touching the model or API contract. This is explicitly
NOT a public blockchain.

Hashing
-------
The canonicalization helpers here are used consistently:

- :func:`canonical_metadata` — sorts keys and compacts JSON so the
  ``metadata_hash`` digest is stable regardless of field ordering.
- :func:`include` helpers build the canonical, ordered field list that is
  joined with ``\\x1f`` (unit separator) before hashing for ``entry_hash``.

The ``payload_hash`` deliberately reuses
``app.services.evidence_integrity.compute_checksum`` so there is exactly one
authoritative evidence checksum implementation (Phase 18.2.12) — we never
duplicate that logic here.
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import EvidenceChainAction, EvidenceChainEntry, InvestigationEvidence
from app.services import evidence_integrity
from app.services.security import get_user_by_id

# Verification outcome statuses (exposed to the API / frontend).
VALID = "VALID"
TAMPERED = "TAMPERED"
BROKEN_CHAIN = "BROKEN_CHAIN"
MISSING = "MISSING"
INVALID_SCOPE = "INVALID_SCOPE"
GENESIS = "GENESIS"

# Unit separator joins the canonical fields of an entry before hashing. It
# cannot appear inside a hex digest or UUID string, so the concatenation is
# unambiguous and deterministic.
_FIELD_SEP = "\x1f"


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def canonical_metadata(metadata: dict[str, Any] | None) -> str:
    """Deterministic SHA-256 over canonical JSON of a metadata block.

    Sorts keys and compacts separators so the digest is stable across key
    ordering and whitespace. ``None`` values are omitted so missing optional
    context stays canonical.
    """
    compact: dict[str, Any] = {
        key: value for key, value in dict(metadata or {}).items() if value is not None
    }
    encoded = json.dumps(compact, sort_keys=True, separators=(",", ":"))
    return _sha256(encoded)


def compute_metadata_hash(action: EvidenceChainAction, details: dict[str, Any] | None) -> str:
    """SHA-256 of the canonical metadata block for a chain entry."""
    return canonical_metadata({"action": action.value, **dict(details or {})})


def compute_entry_hash(
    *,
    evidence_id: str,
    sequence_number: int,
    action: str,
    payload_hash: str,
    metadata_hash: str,
    previous_entry_hash: str | None,
    actor_email: str | None = None,
    actor_id: str | None = None,
    event_timestamp: datetime | str | None = None,
) -> str:
    """SHA-256 over the canonical chain-entry fields joined with ``\\x1f``.

    Field names are embedded alongside values so a swap between two
    equal-length fields is also detected, and ``previous_entry_hash`` is
    included to create the immutable link between consecutive entries. The
    actor email is snapshotted into the digest so silently reassigning a
    custody actor is detected by the verifier.
    """
    fields = [
        f"evidence_id={evidence_id}",
        f"sequence={sequence_number}",
        f"action={action}",
        f"payload={payload_hash}",
        f"meta={metadata_hash}",
        f"prev={previous_entry_hash or GENESIS}",
        f"actor_id={actor_id or ''}",
        f"actor={actor_email or ''}",
        f"timestamp={_canonical_timestamp(event_timestamp)}",
    ]
    return _sha256(_FIELD_SEP.join(fields))


def _canonical_timestamp(value: datetime | str | None) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        normalized = value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
        return normalized.isoformat(timespec="microseconds")
    return str(value)


class EvidenceChainService:
    """Appends verifiable, linked entries to an evidence's custody chain.

    The tail entry is locked with ``FOR UPDATE`` before the next
    ``sequence_number`` is derived, so two concurrent appends cannot assign the
    same sequence. The ``(evidence_id, sequence_number)`` unique constraint
    provides a second line of defense.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_chain(self, evidence_id: UUID) -> list[EvidenceChainEntry]:
        stmt = (
            select(EvidenceChainEntry)
            .where(EvidenceChainEntry.evidence_id == evidence_id)
            .order_by(EvidenceChainEntry.sequence_number)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _lock_tail(self, evidence_id: UUID) -> EvidenceChainEntry | None:
        stmt = (
            select(EvidenceChainEntry)
            .where(EvidenceChainEntry.evidence_id == evidence_id)
            .order_by(EvidenceChainEntry.sequence_number.desc())
            .limit(1)
            .with_for_update()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def append(
        self,
        *,
        evidence: InvestigationEvidence,
        action: EvidenceChainAction,
        actor_id: UUID | None = None,
        actor_email: str | None = None,
        details: dict[str, Any] | None = None,
        event_timestamp: datetime | None = None,
    ) -> EvidenceChainEntry:
        """Compute and persist a new linked entry for an evidence item.

        Deterministic: identical inputs yield an identical ``entry_hash``, and
        the sequence + evidence unique constraint guarantees a caller cannot
        accidentally fork a chain with two genesis entries.
        """
        evidence_id = evidence.id
        payload_hash = evidence_integrity.compute_checksum(evidence)
        metadata_hash = compute_metadata_hash(action, details)

        # Defense in depth: an actor id that matches no users row must never be
        # stored (no dangling FK). Resolution snapshots the email regardless, so
        # chains stay human-readable after a user is removed.
        actor_uid, actor_email = await resolve_actor(self.session, actor_id, actor_email)

        tail = await self._lock_tail(evidence_id)
        sequence_number = (tail.sequence_number + 1) if tail else 1
        previous_entry_hash = tail.entry_hash if tail else GENESIS
        event_timestamp = event_timestamp or evidence.collected_at or datetime.now(UTC)

        entry_hash = compute_entry_hash(
            evidence_id=str(evidence_id),
            sequence_number=sequence_number,
            action=action.value,
            payload_hash=payload_hash,
            metadata_hash=metadata_hash,
            previous_entry_hash=previous_entry_hash,
            actor_email=actor_email,
            actor_id=str(actor_uid) if actor_uid else None,
            event_timestamp=event_timestamp,
        )

        entry = EvidenceChainEntry(
            evidence_id=evidence_id,
            investigation_id=evidence.investigation_id,
            sequence_number=sequence_number,
            event_timestamp=event_timestamp,
            action=action,
            payload_hash=payload_hash,
            metadata_hash=metadata_hash,
            previous_entry_hash=previous_entry_hash,
            entry_hash=entry_hash,
            actor_id=actor_uid,
            actor_email=actor_email,
            details=details,
        )
        self.session.add(entry)
        await self.session.flush()
        return entry


class EvidenceChainVerifier:
    """Verifies an evidence custody chain end to end.

    Each entry's ``entry_hash`` is recomputed from its canonical fields, then
    each entry's stored ``previous_entry_hash`` is checked against the recomputed
    hash of its predecessor. Precedence: TAMPERED (a hash mismatch) takes
    priority over BROKEN_CHAIN (a link / chain-continuity violation).
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.service = EvidenceChainService(session)

    def verify_entries(
        self, entries: list[EvidenceChainEntry], expected_payload_hash: str | None = None
    ) -> dict[str, Any]:
        """Return a status summary for an ordered list of chain entries.

        When ``expected_payload_hash`` is supplied (the live checksum of the
        evidence row), any entry whose ``payload_hash`` no longer matches it is
        reported as TAMPERED — the evidence body was modified after it was
        chained.
        """
        if not entries:
            return {
                "status": MISSING,
                "valid": False,
                "entries": 0,
                "verified_events": 0,
                "failures": [{"reason": "no custody events found"}],
            }

        failures: list[dict[str, Any]] = []
        if expected_payload_hash is not None:
            for entry in entries:
                if entry.payload_hash != expected_payload_hash:
                    failures.append(
                        {
                            "event_id": str(entry.id),
                            "reason": "evidence hash mismatch",
                            "expected": expected_payload_hash,
                            "actual": entry.payload_hash,
                        }
                    )

        previous_entry_hash: str | None = GENESIS
        verified_events = 0

        for expected_sequence, entry in enumerate(entries, start=1):
            event_failed = False
            if entry.sequence_number != expected_sequence:
                event_failed = True
                failures.append(
                    {
                        "event_id": str(entry.id),
                        "reason": "sequence gap or duplicate",
                        "expected": expected_sequence,
                        "actual": entry.sequence_number,
                    }
                )
            recomputed = compute_entry_hash(
                evidence_id=str(entry.evidence_id),
                sequence_number=entry.sequence_number,
                action=entry.action.value,
                payload_hash=entry.payload_hash,
                metadata_hash=entry.metadata_hash,
                previous_entry_hash=entry.previous_entry_hash,
                actor_email=entry.actor_email,
                actor_id=str(entry.actor_id) if entry.actor_id else None,
                event_timestamp=entry.event_timestamp,
            )
            if recomputed != entry.entry_hash:
                event_failed = True
                failures.append(
                    {
                        "event_id": str(entry.id),
                        "reason": "event hash mismatch",
                        "expected": recomputed,
                        "actual": entry.entry_hash,
                    }
                )
            expected_metadata = compute_metadata_hash(entry.action, entry.details)
            if expected_metadata != entry.metadata_hash:
                event_failed = True
                failures.append(
                    {
                        "event_id": str(entry.id),
                        "reason": "metadata hash mismatch",
                        "expected": expected_metadata,
                        "actual": entry.metadata_hash,
                    }
                )
            if entry.previous_entry_hash != previous_entry_hash:
                event_failed = True
                failures.append(
                    {
                        "event_id": str(entry.id),
                        "reason": "previous hash link broken",
                        "expected": previous_entry_hash,
                        "actual": entry.previous_entry_hash,
                    }
                )
            previous_entry_hash = entry.entry_hash
            if not event_failed:
                verified_events += 1

        first_event_at = entries[0].event_timestamp
        last_event_at = entries[-1].event_timestamp
        status = (
            TAMPERED
            if any("hash mismatch" in failure["reason"] for failure in failures)
            else BROKEN_CHAIN
            if failures
            else VALID
        )
        return {
            "status": status,
            "valid": not failures,
            "entries": len(entries),
            "verified_events": verified_events,
            "first_event_at": first_event_at,
            "last_event_at": last_event_at,
            "chain_head_hash": entries[-1].entry_hash,
            "failures": failures,
            "reason": failures[0]["reason"] if failures else None,
        }

    async def verify(self, evidence: InvestigationEvidence) -> dict[str, Any]:
        """Verify the full chain for an evidence item against its own rows."""
        entries = await self.service.list_chain(evidence.id)
        expected_payload_hash = evidence_integrity.compute_checksum(evidence)
        return self.verify_entries(entries, expected_payload_hash=expected_payload_hash)


async def resolve_actor(
    session: AsyncSession,
    actor_id: str | UUID | None,
    actor_email: str | None = None,
) -> tuple[UUID | None, str | None]:
    """Resolve the custody actor for a chain entry.

    Returns ``(actor_id, actor_email)`` where ``actor_id`` is only attached when
    it references a real ``users`` row (no dangling foreign key). The email is
    always snapshotted — even for the seed / test-stub actors whose id is not in
    ``users`` — so the chain stays human-readable after a user is removed.
    """
    if actor_id is None:
        return None, actor_email
    try:
        uid = UUID(str(actor_id))
    except (ValueError, TypeError):
        return None, actor_email
    user = await get_user_by_id(session, uid)
    if user is None:
        return None, actor_email
    return user.id, user.email
