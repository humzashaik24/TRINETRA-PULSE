"""Deterministic correlation key derivation (Phase 21).

A correlation key groups observations that describe the SAME relationship. It
is a sha256 digest over a canonicalised tuple so that:

  - Re-running evaluation always yields the same key.
  - Symmetric relationships canonicalise endpoint order (A-B equals B-A).
  - Directed relationships preserve direction (A->B differs from B->A).
  - Distinct relationship types are never merged: a "transaction" observation
    and a "communicates" observation between the same endpoints remain separate
    groups (CALL vs TRANSFER stay distinguishable).

The key contains no randomness; it is a pure function of its inputs.
"""

from __future__ import annotations

import hashlib
from typing import Any
from uuid import UUID


def canonical_pair(
    source_entity_id: UUID | str,
    target_entity_id: UUID | str,
    *,
    symmetric: bool,
) -> tuple[str, str]:
    """Order endpoint ids canonically for symmetric (undirected) pairs."""
    a = str(source_entity_id)
    b = str(target_entity_id)
    if symmetric:
        return (a, b) if a <= b else (b, a)
    return (a, b)


def relationship_correlation_key(
    investigation_id: UUID | str,
    source_entity_id: UUID | str,
    target_entity_id: UUID | str,
    relationship_type: Any,
    *,
    direction: str,
) -> str:
    """Deterministic sha256 key identifying a relationship observation group."""
    symmetric = direction == "symmetric"
    source, target = canonical_pair(
        source_entity_id, target_entity_id, symmetric=symmetric
    )
    type_value = (
        relationship_type.value
        if hasattr(relationship_type, "value")
        else str(relationship_type)
    )
    tokens = "|".join(
        [str(investigation_id), source, target, type_value, direction]
    )
    return hashlib.sha256(tokens.encode("utf-8")).hexdigest()
