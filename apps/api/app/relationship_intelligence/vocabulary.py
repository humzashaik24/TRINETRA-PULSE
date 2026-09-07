"""Shared vocabulary for relationship intelligence (Phase 21).

Defines the semantic policy used across correlation, scoring and statuses:

  - Which relationship types are directed versus symmetric (undirected).
  - The observation predicate used to describe what a source record shows when
    no explicit predicate was recorded. It is a best-effort, display-only label
    derived deterministically from source labels and evidence references; it is
    never used to merge or split relationship groups.
"""

from __future__ import annotations

from app.models import RelationshipType

# Version of the correlation/scoring algorithm. Bump when the semantics change
# so stored results can be distinguished from newly-computed ones.
CORRELATION_VERSION = "relationship-intelligence-v1"

# Stable identifier for the conflict kind raised when the same relationship is
# observed with contradictory source records.
RELATIONSHIP_CONFLICT = "RELATIONSHIP_CONFLICT"

# Directed relationships carry meaning from source -> target (caller -> callee,
# transfer sender -> receiver, owner -> owned, located-at reads as "is at").
DIRECTED_TYPES: set[RelationshipType] = {
    RelationshipType.COMMUNICATES,
    RelationshipType.CONTACTS,
    RelationshipType.TRANSACTION,
    RelationshipType.OWNS,
    RelationshipType.LOCATED_AT,
}

# Symmetric (undirected) relationships mean the same thing in both directions.
SYMMETRIC_TYPES: set[RelationshipType] = {
    RelationshipType.KNOWN_ASSOCIATE,
    RelationshipType.ASSOCIATED_WITH,
    RelationshipType.FAMILY,
    RelationshipType.TRAVELS_WITH,
    RelationshipType.MEMBER_OF,
    RelationshipType.OTHER,
}


def is_directed(relationship_type: RelationshipType) -> bool:
    return relationship_type in DIRECTED_TYPES


def is_symmetric(relationship_type: RelationshipType) -> bool:
    return relationship_type in SYMMETRIC_TYPES


def observation_predicate(source: str | None, evidence_refs: list[str]) -> str:
    """Best-effort display label for what a source record shows.

    Transfer-like tokens -> "transfer"; communication tokens -> "call";
    otherwise the neutral "observation". The result is a pure function of the
    input and is only used for human-readable labels.
    """
    text = " ".join([source or "", *(str(r) for r in evidence_refs or [])]).lower()
    if not text.strip():
        return "observation"
    if any(
        token in text
        for token in ("transfer", " txn", "transaction", "payment", "debit", "credit")
    ):
        return "transfer"
    if any(
        token in text
        for token in ("call", "cdr", "sms", "message", "voice", "ring")
    ):
        return "call"
    return "observation"
