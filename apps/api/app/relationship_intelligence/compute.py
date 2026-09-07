"""Shared relationship evaluation computation (Phase 21).

``evaluate_relationship`` is the single deterministic function that turns a
relationship and its observations into the aggregate intelligence summary
(status, linkage score, correlation key, counts, temporal bounds, predicate).

It is used by the intelligence service (persistence) and by graph edge
enrichment so that list, single-read and network surfaces always agree.
"""

from __future__ import annotations

from typing import Any

from app.models import IntelligenceStatus
from app.relationship_intelligence.correlation import relationship_correlation_key
from app.relationship_intelligence.scoring import (
    confidence_label,
    detect_conflicts,
    linkage_score,
)
from app.relationship_intelligence.states import recommended_intelligence_status
from app.relationship_intelligence.vocabulary import (
    CORRELATION_VERSION,
    is_directed,
    observation_predicate,
)


def evaluate_relationship(
    relationship: Any,
    observations: list[dict[str, Any]],
    *,
    conflict_flags: list[dict[str, Any]] | None = None,
    current_status: IntelligenceStatus | None = None,
) -> dict[str, Any]:
    """Compute the aggregate intelligence summary for a relationship.

    ``current_status`` defaults to the relationship's own stored
    ``intelligence_status``, so investigator decisions (confirmed/rejected) are
    preserved. ``conflict_flags`` defaults to detection over the supplied
    observations.
    """
    if conflict_flags is None:
        conflict_flags = detect_conflicts(observations=observations)
    if current_status is None:
        current_status = _status_of(relationship)

    distinct_sources = {o.get("source_dataset") or "" for o in observations}
    source_count = len(distinct_sources) if distinct_sources else (1 if observations else 0)
    observation_count = len(observations)
    conflict_count = len(conflict_flags)

    score = linkage_score(
        base_confidence=_confidence_of(relationship),
        source_count=source_count,
        observation_count=observation_count,
        conflict_count=conflict_count,
    )
    label = confidence_label(score)
    direction = "directed" if is_directed(_type_of(relationship)) else "undirected"
    correlation_key = relationship_correlation_key(
        relationship.investigation_id,
        relationship.source_entity_id,
        relationship.target_entity_id,
        _type_of(relationship),
        direction=direction,
    )
    timestamps = [
        o["observed_at"] for o in observations if o.get("observed_at") is not None
    ]
    status = recommended_intelligence_status(
        source_count=source_count,
        conflict_count=conflict_count,
        current=current_status,
    )
    predicate = observation_predicate(
        relationship.source, relationship.evidence_refs or []
    )

    return {
        "intelligence_status": status,
        "linkage_score": score,
        "confidence_label": label,
        "correlation_version": CORRELATION_VERSION,
        "correlation_key": correlation_key,
        "observation_count": observation_count,
        "source_count": source_count,
        "first_observed_at": min(timestamps) if timestamps else None,
        "last_observed_at": max(timestamps) if timestamps else None,
        "observation_predicate": predicate,
        "conflict_flags": conflict_flags,
    }


def _status_of(relationship: Any) -> IntelligenceStatus:
    value = getattr(relationship, "intelligence_status", None) or IntelligenceStatus.OBSERVED
    if isinstance(value, IntelligenceStatus):
        return value
    if hasattr(value, "value"):
        try:
            return IntelligenceStatus(value.value)
        except ValueError:
            return IntelligenceStatus.OBSERVED
    try:
        return IntelligenceStatus(str(value))
    except ValueError:
        return IntelligenceStatus.OBSERVED


def _type_of(relationship: Any):
    value = relationship.relationship_type
    return value.value if hasattr(value, "value") else value


def _confidence_of(relationship: Any) -> float:
    return float(relationship.confidence or 0.0)
