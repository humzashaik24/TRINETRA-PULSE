"""Candidate generation with blocking for entity resolution (Phase 20).

Avoids an O(N^2) comparison over every entity pair by using *blocking keys*:
only entity pairs sharing at least one blocking key are compared. Blocking
keys are derived deterministically from normalized attributes (phone, email,
identifier, vehicle registration, account, and stable name tokens).

Complexity: O(P) where P is the number of pairs sharing a blocking key, which
is far smaller than N^2 for realistic N within a single investigation.
"""

from __future__ import annotations

from collections import defaultdict
from uuid import UUID

from app.models import Entity
from app.resolution.normalization import (
    normalize_account,
    normalize_email,
    normalize_identifier,
    normalize_person_name,
    normalize_phone,
    normalize_vehicle,
)

# Maximum blocking keys per entity (keeps key scans bounded).
MAX_KEYS_PER_ENTITY = 12


def _get_attr(attributes: dict, *keys: str) -> str | None:
    for key in keys:
        value = attributes.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def blocking_keys(entity: Entity) -> set[str]:
    """Deterministically derive blocking keys for a single entity."""
    keys: set[str] = set()
    attrs = entity.attributes or {}

    phone = _get_attr(attrs, "phone", "phone_number", "alternate_phone", "mobile")
    if phone:
        n = normalize_phone(phone).normalized_value
        if len(n) >= 10:
            keys.add(f"phone:{n}")
            keys.add(f"phone_suffix:{n[-10:]}")

    email = _get_attr(attrs, "email")
    if email:
        n = normalize_email(email).normalized_value
        if n:
            keys.add(f"email:{n}")

    identifier = _get_attr(
        attrs, "id_number", "identifier", "pan", "aadhaar", "gstin", "passport"
    )
    if identifier:
        n = normalize_identifier(identifier).normalized_value
        if len(n) >= 4:
            keys.add(f"identifier:{n}")

    vehicle = _get_attr(attrs, "vehicle", "vehicle_number", "registration", "reg_number")
    if vehicle:
        n = normalize_vehicle(vehicle).normalized_value
        if len(n) >= 4:
            keys.add(f"vehicle:{n}")

    account = _get_attr(attrs, "account_number", "account")
    if account:
        n = normalize_account(account).normalized_value
        if len(n) >= 4:
            keys.add(f"account:{n}")

    # Name token blocking — full normalized names and 2+ char tokens.
    for key in ("name", "full_name", "legal_name", "canonical_name", "holder", "owner"):
        raw = _get_attr(attrs, key)
        if raw:
            norm = normalize_person_name(raw).normalized_value
            if len(norm) >= 3:
                keys.add(f"name:{norm}")
            tokens = [t for t in norm.split(" ") if len(t) >= 3]
            for tok in tokens:
                keys.add(f"name_token:{tok}")
            break

    # Bound key count for predictable scan behaviour.
    if len(keys) > MAX_KEYS_PER_ENTITY:
        keys = set(sorted(keys)[:MAX_KEYS_PER_ENTITY])
    return keys


def blocking_index(entities: list[Entity]) -> dict[str, list[Entity]]:
    """Build a blocking index keyed by normalized blocking key."""
    index: dict[str, list[Entity]] = defaultdict(list)
    for entity in entities:
        for key in blocking_keys(entity):
            index[key].append(entity)
    return index


def generate_candidates(
    entities: list[Entity],
    *,
    already_resolved: set[tuple[UUID, UUID]] | None = None,
) -> list[tuple[Entity, Entity]]:
    """Generate candidate entity pairs using blocking.

    Only entities sharing at least one blocking key are compared. Pairs are
    returned as (entity_a, entity_b) with deterministic ordering
    (entity_a.id < entity_b.id lexicographically) and deduplicated.
    """
    index = blocking_index(entities)
    seen: set[tuple[UUID, UUID]] = set()
    resolved = already_resolved or set()
    candidates: list[tuple[Entity, Entity]] = []

    for bucket in index.values():
        # Within a bucket every pair shares a blocking key.
        for i in range(len(bucket)):
            for j in range(i + 1, len(bucket)):
                a, b = bucket[i], bucket[j]
                # Deterministic ordering.
                if str(a.id) > str(b.id):
                    a, b = b, a
                pair = (a.id, b.id)
                if pair in seen or pair in resolved:
                    continue
                # Same entity investigation only — resolution is always
                # investigation-scoped.
                if a.investigation_id != b.investigation_id:
                    continue
                if a.id == b.id:
                    continue
                seen.add(pair)
                candidates.append((a, b))

    return candidates
