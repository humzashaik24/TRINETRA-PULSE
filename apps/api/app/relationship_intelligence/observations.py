"""Observation derivation for relationships (Phase 21).

An observation is a single, individually-preserved source record that supports
a relationship. The authoritative source is the ``data_provenance`` table: rows
that link a ``relationship_id`` carry the exact dataset, extraction method,
confidence, timestamp and evidence references that an ingest produced.

When a relationship has no provenance rows (e.g. legacy seeded rows), we derive
observations deterministically by un-flattening ``evidence_refs`` — one
observation per distinct reference — using the relationship row itself as the
source dataset. This is an explicit, documented fallback; timestamps are left
``None`` and rendered as "Unavailable" rather than invented.

Nothing here invents evidence: deriving observations from existing references
never fabricates new facts, and absence of an observation is simply reported as
zero observation count.
"""

from __future__ import annotations

import uuid as _uuid
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DataProvenance, Relationship


def _stable_observation_id(relationship_id: UUID, salt: str) -> UUID:
    return _uuid.uuid5(
        _uuid.NAMESPACE_DNS,
        f"trinetra::relationship-intelligence::observation::{relationship_id}::{salt}",
    )


async def derive_observations(
    session: AsyncSession, relationship: Relationship
) -> list[dict[str, Any]]:
    """Return deterministic, individually-preserved observations for one
    relationship. Equivalent to ``derive_observations_bulk`` for a single row
    and safe to call from hot read paths that do not want bulk loading."""
    return (await derive_observations_bulk(session, [relationship])).get(
        relationship.id, []
    )


async def derive_observations_bulk(
    session: AsyncSession, relationships: list[Relationship]
) -> dict[UUID, list[dict[str, Any]]]:
    """Return observations for many relationships with a single provenance
    query. Provenance rows take priority; the fallback derives one observation
    per distinct evidence reference. Items are sorted by
    ``(observed_at or '', source_dataset, source_record)`` so results are
    stable across runs."""
    if not relationships:
        return {}

    ids = [rel.id for rel in relationships]
    result = await session.execute(
        select(DataProvenance).where(DataProvenance.relationship_id.in_(ids))
    )
    provenance_by_relationship: dict[UUID, list[DataProvenance]] = {}
    for prov in result.scalars().all():
        if prov.relationship_id is not None:
            provenance_by_relationship.setdefault(prov.relationship_id, []).append(prov)

    out: dict[UUID, list[dict[str, Any]]] = {}
    for relationship in relationships:
        prov_rows = provenance_by_relationship.get(relationship.id, [])
        if prov_rows:
            observations = [_row_from_provenance(relationship, prov) for prov in prov_rows]
        else:
            observations = _derive_from_evidence_refs(relationship)
        observations.sort(
            key=lambda o: (
                o.get("observed_at") or "",
                o.get("source_dataset") or "",
                o.get("source_record") or "",
            )
        )
        out[relationship.id] = observations
    return out


def _row_from_provenance(
    relationship: Relationship, prov: DataProvenance
) -> dict[str, Any]:
    refs = list(prov.evidence_refs or [])
    return {
        "id": str(prov.id),
        "relationship_id": str(relationship.id),
        "source_dataset": prov.source_name or "",
        "source_type": (
            prov.source_type.value
            if hasattr(prov.source_type, "value")
            else str(prov.source_type)
        ),
        "source_record": refs[0] if refs else None,
        "extraction_method": prov.extraction_method,
        "observed_at": prov.timestamp,
        "confidence": prov.confidence,
        "evidence_refs": refs,
        "provenance": True,
    }


def _derive_from_evidence_refs(relationship: Relationship) -> list[dict[str, Any]]:
    refs = _ordered_unique(relationship.evidence_refs or [])
    if not refs:
        return []
    extraction_method = (
        relationship.extraction_method.value
        if hasattr(relationship.extraction_method, "value")
        else "unknown"
    )
    observations: list[dict[str, Any]] = []
    for ref in refs:
        observations.append(
            {
                "id": str(_stable_observation_id(relationship.id, str(ref))),
                "relationship_id": str(relationship.id),
                "source_dataset": relationship.source or "",
                "source_type": None,
                "source_record": str(ref),
                "extraction_method": extraction_method,
                "observed_at": None,
                "confidence": None,
                "evidence_refs": [str(ref)],
                "provenance": False,
            }
        )
    return observations


def _ordered_unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out
