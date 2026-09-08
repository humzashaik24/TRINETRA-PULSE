"""Deterministic, grounded Investigation Direction Intelligence (Phase 26).

Directions answer: "what should I investigate next, and why?" They are
computed on request, purely from *already-persisted* investigation records
(entities, relationships, evidence, events, pattern results, candidate
resolutions). The functions here are pure and side-effect free so they are
easy to reason about and test.

Grounding rules enforced across every detector:

* no call to any external AI or search service;
* no fabricated values — every number in ``value`` and every title/summary
  is derived from persisted fields only;
* confidence is *recommendation confidence* — how strongly the recorded data
  supports the suggested next step — never a probability of guilt, criminal
  intent, or any real-world fact;
* everything is READ-ONLY: nothing here reads from or writes to the database
  and no analyst state is implied (all statuses are ``new``);
* deterministic: the same persisted records produce the same directions.
"""

from __future__ import annotations

import hashlib
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.schemas.real.directions import (
    DirectionPriority,
    DirectionStatus,
    DirectionType,
    InvestigationDirectionRead,
    SupportingFact,
    SupportingFactType,
)

MAX_TOTAL_DIRECTIONS = 12
MAX_PER_TYPE = 4
MIN_HUB_DEGREE = 2
UNRESOLVED_PAIR_LIMIT = 5
TIMELINE_GAP_DAYS = 30


def _value(obj: Any, name: str, default: Any = None) -> Any:
    return getattr(obj, name, default)


def _str(value: Any) -> str | None:
    if value is None:
        return None
    return str(getattr(value, "value", value))


def _list(value: Any) -> list[Any]:
    if value is None:
        return []
    return list(value)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _priority_for_confidence(confidence: float) -> DirectionPriority:
    if confidence >= 0.75:
        return DirectionPriority.CRITICAL
    if confidence >= 0.55:
        return DirectionPriority.HIGH
    if confidence >= 0.35:
        return DirectionPriority.MEDIUM
    return DirectionPriority.LOW


def _stable_id(
    direction_type: DirectionType,
    title: str,
    entity_ids: list[UUID],
    relationship_ids: list[UUID],
    evidence_ids: list[UUID],
) -> str:
    payload = "|".join(
        [
            direction_type.value,
            title.lower(),
            *sorted(map(str, entity_ids)),
            *sorted(map(str, relationship_ids)),
            *sorted(map(str, evidence_ids)),
        ]
    )
    return f"dir-{hashlib.sha256(payload.encode('utf-8')).hexdigest()[:20]}"


def _entity_names(entities: list[Any]) -> dict[UUID, str]:
    names: dict[UUID, str] = {}
    for entity in entities:
        name = _value(entity, "name", None)
        canonical = _value(entity, "canonical_name", None)
        names[entity.id] = str(name or canonical or entity.id)
    return names


def _topology(relationships: list[Any]) -> dict[str, Any]:
    """Undirected adjacency over unique, non-self relationships."""
    adjacency: dict[UUID, set[UUID]] = defaultdict(set)
    for relationship in relationships:
        source = _value(relationship, "source_entity_id")
        target = _value(relationship, "target_entity_id")
        if source is None or target is None or source == target:
            continue
        adjacency[source].add(target)
        adjacency[target].add(source)
    return {"adjacency": dict(adjacency)}


def _relation_links(relationships: list[Any], node: UUID) -> list[UUID]:
    return [
        relationship.id
        for relationship in relationships
        if node
        in (_value(relationship, "source_entity_id"), _value(relationship, "target_entity_id"))
    ]


def _art_adjacency(adjacency: dict[UUID, set[UUID]]) -> list[UUID]:
    """Standard DFS low-link articulation points (one entry per node)."""
    index: dict[UUID, int] = {}
    low: dict[UUID, int] = {}
    result: list[UUID] = []
    collected: set[UUID] = set()
    timer = 0

    def visit(node: UUID, parent: UUID | None) -> None:
        nonlocal timer
        index[node] = low[node] = timer
        timer += 1
        children = 0
        for neighbor in adjacency.get(node, set()):
            if neighbor not in index:
                children += 1
                visit(neighbor, node)
                low[node] = min(low[node], low[neighbor])
                is_articulation = (parent is None and children > 1) or (
                    parent is not None and low[neighbor] >= index[node]
                )
                if is_articulation and node not in collected:
                    collected.add(node)
                    result.append(node)
            elif neighbor != parent:
                low[node] = min(low[node], index[neighbor])

    for node in sorted(adjacency, key=str):
        if node not in index:
            visit(node, None)
    return result


def _component_count_after_removal(
    adjacency: dict[UUID, set[UUID]], removed: UUID
) -> int:
    seen: set[UUID] = set()
    count = 0
    for start in adjacency:
        if start == removed or start in seen:
            continue
        count += 1
        stack = [start]
        seen.add(start)
        while stack:
            current = stack.pop()
            for neighbor in adjacency[current]:
                if neighbor == removed or neighbor in seen:
                    continue
                seen.add(neighbor)
                stack.append(neighbor)
    return count


def _shared_evidence_ids(
    relationships: list[Any], hub: UUID, left: UUID, right: UUID
) -> set[UUID]:
    """Evidence references shared by the hub->left and hub->right edges."""
    refs_by_node: dict[UUID, set[UUID]] = defaultdict(set)
    for relationship in relationships:
        if _value(relationship, "source_entity_id") == hub:
            partner = _value(relationship, "target_entity_id")
        elif _value(relationship, "target_entity_id") == hub:
            partner = _value(relationship, "source_entity_id")
        else:
            continue
        if partner not in (left, right):
            continue
        for raw in _list(relationship.evidence_refs):
            try:
                refs_by_node[partner].add(UUID(str(raw)))
            except (TypeError, ValueError):
                continue
    return refs_by_node.get(left, set()) & refs_by_node.get(right, set())


def _direction(
    *,
    investigation_id: UUID,
    direction_type: DirectionType,
    title: str,
    summary: str,
    confidence: float,
    rationale: str,
    related_entity_ids: list[UUID | None],
    related_relationship_ids: list[UUID | None],
    related_evidence_ids: list[UUID | None],
    supporting_facts: list[SupportingFact],
    created_at: datetime,
) -> InvestigationDirectionRead:
    entity_ids = sorted(
        {item for item in related_entity_ids if item is not None}, key=str
    )
    relationship_ids = sorted(
        {item for item in related_relationship_ids if item is not None}, key=str
    )
    evidence_ids = sorted(
        {item for item in related_evidence_ids if item is not None}, key=str
    )
    confidence = _clamp(confidence)
    return InvestigationDirectionRead(
        id=_stable_id(direction_type, title, entity_ids, relationship_ids, evidence_ids),
        investigation_id=investigation_id,
        direction_type=direction_type,
        title=title,
        summary=summary,
        priority=_priority_for_confidence(confidence),
        confidence=confidence,
        rationale=rationale,
        supporting_facts=supporting_facts,
        related_entity_ids=entity_ids,
        related_relationship_ids=relationship_ids,
        related_evidence_ids=evidence_ids,
        status=DirectionStatus.NEW,
        created_at=created_at,
    )


def _high_connectivity_directions(
    investigation_id: UUID,
    relationships: list[Any],
    entities: list[Any],
    adjacency: dict[UUID, set[UUID]],
    names: dict[UUID, str],
    created_at: datetime,
) -> list[InvestigationDirectionRead]:
    degrees = [
        (len(adjacency.get(entity.id, set())), entity.id) for entity in entities
    ]
    degrees = sorted(degrees, key=lambda pair: (-pair[0], names[pair[1]]))
    max_degree = degrees[0][0] if degrees and degrees[0][0] > 0 else 1
    directions: list[InvestigationDirectionRead] = []
    for degree, node in degrees:
        if degree < MIN_HUB_DEGREE:
            break
        confidence = _clamp(0.3 + 0.5 * (degree / max_degree))
        directions.append(
            _direction(
                investigation_id=investigation_id,
                direction_type=DirectionType.HIGH_CONNECTIVITY_ENTITY,
                title=f"Follow connections around {names[node]}",
                summary=(
                    f"{names[node]} has {degree} recorded relationships, the highest "
                    "connectivity observed in this investigation."
                ),
                confidence=confidence,
                rationale=(
                    f"{names[node]} is connected to {degree} other entities. Its "
                    "neighbors are likely worth reviewing first."
                ),
                related_entity_ids=[node],
                related_relationship_ids=_relation_links(relationships, node),
                related_evidence_ids=[],
                supporting_facts=[
                    SupportingFact(
                        fact_type=SupportingFactType.DEGREE_OBSERVED,
                        description=f"Recorded relationships involving {names[node]}.",
                        entity_id=node,
                        value=degree,
                    )
                ],
                created_at=created_at,
            )
        )
    return directions


def _bridge_directions(
    investigation_id: UUID,
    adjacency: dict[UUID, set[UUID]],
    names: dict[UUID, str],
    created_at: datetime,
) -> list[InvestigationDirectionRead]:
    articulation = _art_adjacency(adjacency)
    max_degree = max((len(adjacency[node]) for node in articulation), default=1)
    directions: list[InvestigationDirectionRead] = []
    for node in sorted(articulation, key=str):
        components_after = _component_count_after_removal(adjacency, node)
        degree = len(adjacency[node])
        confidence = _clamp(0.35 + 0.25 * (components_after - 1) + 0.2 * (degree / max_degree))
        label = names.get(node, "?")
        directions.append(
            _direction(
                investigation_id=investigation_id,
                direction_type=DirectionType.BRIDGE_ENTITY,
                title=f"Investigate bridge entity {label}",
                summary=(
                    f"{label} is an articulation point: removing it would split "
                    f"the recorded network into {components_after} components."
                ),
                confidence=confidence,
                rationale=(
                    f"{label} bridges otherwise separate parts of the network "
                    f"(degree {degree}). Activity through it is a high-leverage review point."
                ),
                related_entity_ids=[node],
                related_relationship_ids=[],
                related_evidence_ids=[],
                supporting_facts=[
                    SupportingFact(
                        fact_type=SupportingFactType.ARTICULATION_POINT,
                        description=(
                            f"Removing {names.get(node, '?')} disconnects the recorded graph into "
                            f"{components_after} parts."
                        ),
                        entity_id=node,
                        value=components_after,
                    ),
                    SupportingFact(
                        fact_type=SupportingFactType.DEGREE_OBSERVED,
                        description=f"Recorded degree of {names.get(node, '?')}.",
                        entity_id=node,
                        value=degree,
                    ),
                ],
                created_at=created_at,
            )
        )
    return directions


def _unresolved_connection_directions(
    investigation_id: UUID,
    relationships: list[Any],
    adjacency: dict[UUID, set[UUID]],
    names: dict[UUID, str],
    created_at: datetime,
) -> list[InvestigationDirectionRead]:
    hubs = sorted(adjacency, key=lambda node: (-len(adjacency[node]), str(node)))
    directions: list[InvestigationDirectionRead] = []
    for hub in hubs:
        neighbors = sorted(adjacency[hub], key=str)
        for index in range(len(neighbors)):
            for other in range(index + 1, len(neighbors)):
                left, right = neighbors[index], neighbors[other]
                if right in adjacency.get(left, set()):
                    continue
                shared = _shared_evidence_ids(relationships, hub, left, right)
                confidence = _clamp(
                    0.4 + 0.3 * (len(adjacency[hub]) - 1) / max(len(adjacency[hub]), 1)
                    + (0.15 if shared else 0.0)
                )
                facts: list[SupportingFact] = [
                    SupportingFact(
                        fact_type=SupportingFactType.UNRESOLVED_PAIR,
                        description=(
                            f"No direct relationship is recorded between {names.get(left, '?')} "
                            f"and {names.get(right, '?')}, despite the shared connection to "
                            f"{names.get(hub, '?')}."
                        ),
                        entity_id=left,
                        value=str(right),
                    )
                ]
                facts.extend(
                    SupportingFact(
                        fact_type=SupportingFactType.SHARED_EVIDENCE,
                        description="Both sides are referenced by the same recorded evidence.",
                        evidence_id=evidence_id,
                        value=str(evidence_id),
                    )
                    for evidence_id in sorted(shared, key=str)
                )
                directions.append(
                    _direction(
                        investigation_id=investigation_id,
                        direction_type=DirectionType.UNRESOLVED_CONNECTION,
                        title=(
                            f"Check for a missing link between {names.get(left, '?')} "
                            f"and {names.get(right, '?')}"
                        ),
                        summary=(
                            f"{names.get(left, '?')} and {names.get(right, '?')} are both "
                            f"connected to {names.get(hub, '?')} but no direct relationship "
                            "is recorded between them."
                        ),
                        confidence=confidence,
                        rationale=(
                            "Recorded relationships place these entities in the same "
                            "neighbourhood without a direct edge — an unrecorded "
                            "relationship is plausible and worth checking."
                        ),
                        related_entity_ids=[left, right, hub],
                        related_relationship_ids=[],
                        related_evidence_ids=sorted(shared, key=str),
                        supporting_facts=facts,
                        created_at=created_at,
                    )
                )
                if len(directions) >= UNRESOLVED_PAIR_LIMIT:
                    return directions
    return directions


def _suspicious_pattern_directions(
    investigation_id: UUID,
    patterns: list[Any],
    created_at: datetime,
) -> list[InvestigationDirectionRead]:
    severity_rank = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}
    ordered = sorted(
        patterns,
        key=lambda pattern: (
            -severity_rank.get(_str(pattern.severity), 0),
            -_clamp(float(getattr(pattern, "confidence", 0.0) or 0.0)),
        ),
    )
    directions: list[InvestigationDirectionRead] = []
    for pattern in ordered:
        confidence = _clamp(float(getattr(pattern, "confidence", 0.0) or 0.0))
        severity = _str(pattern.severity) or "LOW"
        if severity == "LOW" and confidence < 0.5:
            continue
        title = str(getattr(pattern, "title", "Detected pattern"))
        description = str(getattr(pattern, "description", ""))
        directions.append(
            _direction(
                investigation_id=investigation_id,
                direction_type=DirectionType.SUSPICIOUS_PATTERN,
                title=f"Review detected pattern: {title}",
                summary=description,
                confidence=confidence,
                rationale=(
                    "A deterministic anomaly detector matched this pattern against the "
                    "recorded investigation data. It is a review lead, not a judgement."
                ),
                related_entity_ids=list(getattr(pattern, "entity_ids", []) or []),
                related_relationship_ids=list(getattr(pattern, "relationship_ids", []) or []),
                related_evidence_ids=list(getattr(pattern, "evidence_ids", []) or []),
                supporting_facts=[
                    SupportingFact(
                        fact_type=SupportingFactType.PATTERN_DETECTED,
                        description=f"Anomaly detector flagged {severity}.",
                        value={"pattern_type": _str(pattern.pattern_type), "severity": severity},
                    )
                ],
                created_at=created_at,
            )
        )
        if len(directions) >= MAX_PER_TYPE:
            break
    return directions


def _relationship_gap_directions(
    investigation_id: UUID,
    relationships: list[Any],
    names: dict[UUID, str],
    created_at: datetime,
) -> tuple[list[InvestigationDirectionRead], list[InvestigationDirectionRead]]:
    gaps: list[InvestigationDirectionRead] = []
    verifications: list[InvestigationDirectionRead] = []
    for relationship in relationships:
        needs_review = _str(relationship.verification_status) == "needs_review"
        if not needs_review:
            continue
        refs = _list(relationship.evidence_refs)
        source = names.get(_value(relationship, "source_entity_id"), "?")
        target = names.get(_value(relationship, "target_entity_id"), "?")
        relationship_id = relationship.id
        if not refs:
            confidence = _clamp(
                0.55 + 0.15 * max(0.0, 1.0 - float(getattr(relationship, "confidence", 0.0) or 0.0))
            )
            gaps.append(
                _direction(
                    investigation_id=investigation_id,
                    direction_type=DirectionType.EVIDENCE_GAP,
                    title=f"Find evidence for the {source}–{target} relationship",
                    summary=(
                        f"There is no recorded evidence reference behind the "
                        f"{source}–{target} relationship."
                    ),
                    confidence=confidence,
                    rationale=(
                        "The relationship is recorded but carries zero backing evidence; "
                        "locating corroborating material would strengthen the record."
                    ),
                    related_entity_ids=[
                        _value(relationship, "source_entity_id"),
                        _value(relationship, "target_entity_id"),
                    ],
                    related_relationship_ids=[relationship_id],
                    related_evidence_ids=[],
                    supporting_facts=[
                        SupportingFact(
                            fact_type=SupportingFactType.RELATIONSHIP_WITHOUT_EVIDENCE,
                            description="Relationship has no recorded evidence reference.",
                            relationship_id=relationship_id,
                            value=0,
                        )
                    ],
                    created_at=created_at,
                )
            )
        else:
            confidence = _clamp(0.5 + 0.2 * float(getattr(relationship, "confidence", 0.0) or 0.0))
            verifications.append(
                _direction(
                    investigation_id=investigation_id,
                    direction_type=DirectionType.RELATIONSHIP_VERIFICATION,
                    title=f"Verify the {source}–{target} relationship",
                    summary=(
                        f"The {source}–{target} relationship still has verification status "
                        "needs_review despite recorded references."
                    ),
                    confidence=confidence,
                    rationale=(
                        f"{len(refs)} recorded evidence reference(s) have not yet been "
                        "evaluated against this relationship."
                    ),
                    related_entity_ids=[
                        _value(relationship, "source_entity_id"),
                        _value(relationship, "target_entity_id"),
                    ],
                    related_relationship_ids=[relationship_id],
                    related_evidence_ids=[],
                    supporting_facts=[
                        SupportingFact(
                            fact_type=SupportingFactType.VERIFICATION_PENDING,
                            description=(
                                f"Relationship unverified with {len(refs)} evidence reference(s)."
                            ),
                            relationship_id=relationship_id,
                            value=len(refs),
                        )
                    ],
                    created_at=created_at,
                )
            )
    return gaps[:MAX_PER_TYPE], verifications[:MAX_PER_TYPE]


def _entity_resolution_directions(
    investigation_id: UUID,
    resolutions: list[Any],
    created_at: datetime,
) -> list[InvestigationDirectionRead]:
    pending = [
        resolution
        for resolution in resolutions
        if _str(resolution.state) == "needs_review"
    ]
    ordered = sorted(
        pending,
        key=lambda resolution: -float(getattr(resolution, "confidence", 0.0) or 0.0),
    )
    directions: list[InvestigationDirectionRead] = []
    for resolution in ordered:
        matched = _value(resolution, "matched_entity_id")
        entity_type = str(getattr(resolution, "entity_type", "entity") or "entity")
        reason = _str(resolution.resolution_type) or "candidate match"
        rationale_parts = [
            item for item in _list(getattr(resolution, "reasons", None)) if isinstance(item, str)
        ][:3]
        reasons = "; ".join(rationale_parts) if rationale_parts else "candidate scored needs_review"
        confidence = _clamp(float(getattr(resolution, "confidence", 0.0) or 0.0))
        directions.append(
            _direction(
                investigation_id=investigation_id,
                direction_type=DirectionType.ENTITY_RESOLUTION,
                title=f"Review unresolved {entity_type} resolution",
                summary=f"A candidate {entity_type} resolution still needs review ({reason}).",
                confidence=confidence,
                rationale=f"Resolution reasons: {reasons}",
                related_entity_ids=[matched] if matched else [],
                related_relationship_ids=[],
                related_evidence_ids=[],
                supporting_facts=[
                    SupportingFact(
                        fact_type=SupportingFactType.RESOLUTION_PENDING,
                        description="Candidate resolution waiting for an analyst decision.",
                        entity_id=matched if matched else None,
                        value=_str(resolution.id),
                    )
                ],
                created_at=created_at,
            )
        )
        if len(directions) >= MAX_PER_TYPE:
            break
    return directions


def _timeline_gap_directions(
    investigation_id: UUID,
    events: list[Any],
    created_at: datetime,
) -> list[InvestigationDirectionRead]:
    directions: list[InvestigationDirectionRead] = []
    missing = [event for event in events if _value(event, "timestamp", None) is None]
    if missing:
        directions.append(
            _direction(
                investigation_id=investigation_id,
                direction_type=DirectionType.TIMELINE_GAP,
                title=f"{len(missing)} timeline event(s) lack a recorded timestamp",
                summary=(
                    f"{len(missing)} event(s) in this investigation have no timestamp, "
                    "leaving the timeline incomplete."
                ),
                confidence=0.5,
                rationale=(
                    "Timestamps are central to a reliable timeline; events without one "
                    "cannot be ordered against the rest."
                ),
                related_entity_ids=[],
                related_relationship_ids=[],
                related_evidence_ids=[],
                supporting_facts=[
                    SupportingFact(
                        fact_type=SupportingFactType.TIMESTAMP_MISSING,
                        description=f"{len(missing)} event(s) have no timestamp.",
                        value=len(missing),
                    )
                ],
                created_at=created_at,
            )
        )

    dated = sorted(
        [
            (event, event.timestamp)
            for event in events
            if isinstance(_value(event, "timestamp", None), datetime)
        ],
        key=lambda pair: pair[1],
    )
    for index in range(1, len(dated)):
        previous, current = dated[index - 1], dated[index]
        days = (current[1] - previous[1]).days
        if days >= TIMELINE_GAP_DAYS:
            directions.append(
                _direction(
                    investigation_id=investigation_id,
                    direction_type=DirectionType.TIMELINE_GAP,
                    title=f"{days}-day gap in the recorded timeline",
                    summary=(
                        f"No recorded events between {previous[0].event_type} and "
                        f"{current[0].event_type} for {days} days."
                    ),
                    confidence=_clamp(0.45 + 0.3 * min(days / 180.0, 1.0)),
                    rationale=(
                        "A long unrecorded span may simply be uncollected data; it is a "
                        "specific place to check for missing records."
                    ),
                    related_entity_ids=[],
                    related_relationship_ids=[],
                    related_evidence_ids=[],
                    supporting_facts=[
                        SupportingFact(
                            fact_type=SupportingFactType.TIMELINE_GAP,
                            description="Days between two consecutive recorded events.",
                            value=days,
                        )
                    ],
                    created_at=created_at,
                )
            )
    return directions[:MAX_PER_TYPE]


def _follow_up_evidence_directions(
    investigation_id: UUID,
    relationships: list[Any],
    evidence: list[Any],
    created_at: datetime,
) -> list[InvestigationDirectionRead]:
    known = {getattr(item, "id", None) for item in evidence}
    dangling: dict[str, list[UUID]] = defaultdict(list)
    for relationship in relationships:
        for raw in _list(relationship.evidence_refs):
            try:
                reference = UUID(str(raw))
            except (TypeError, ValueError):
                continue
            if reference not in known:
                dangling[str(reference)].append(relationship.id)
    if not dangling:
        return []
    confidence = _clamp(0.55 + 0.05 * min(len(dangling), 3))
    facts: list[SupportingFact] = []
    referenced_relationships: list[UUID] = []
    for reference in sorted(dangling):
        facts.append(
            SupportingFact(
                fact_type=SupportingFactType.DANGLING_EVIDENCE_REFERENCE,
                description=(
                    "Evidence referenced by recorded relationships but absent from the "
                    "investigation evidence register."
                ),
                value=reference,
            )
        )
        referenced_relationships.extend(dangling[reference])
    return [
        _direction(
            investigation_id=investigation_id,
            direction_type=DirectionType.FOLLOW_UP_EVIDENCE,
            title=f"{len(dangling)} referenced evidence item(s) are not in the register",
            summary=(
                f"{len(dangling)} evidence id(s) referenced by relationships are missing "
                "from this investigation's evidence."
            ),
            confidence=confidence,
            rationale=(
                "Referenced but absent evidence is either uncollected, unimported, or a "
                "broken reference — obtaining and attaching it closes the gap."
            ),
            related_entity_ids=[],
            related_relationship_ids=sorted(set(referenced_relationships), key=str),
            related_evidence_ids=[],
            supporting_facts=facts,
            created_at=created_at,
        )
    ]


def generate_directions(
    investigation_id: UUID,
    *,
    now: datetime | None = None,
    entities: list[Any],
    relationships: list[Any],
    evidence: list[Any],
    events: list[Any],
    patterns: list[Any],
    resolutions: list[Any],
) -> list[InvestigationDirectionRead]:
    """Generate grounded directions from persisted records (pure function).

    Only persisted records are ever referenced; nothing is invented and
    nothing is written anywhere.
    """
    created_at = now or datetime.now(UTC)
    names = _entity_names(entities)
    adjacency: dict[UUID, set[UUID]] = _topology(relationships)["adjacency"]

    directions: list[InvestigationDirectionRead] = []
    directions.extend(
        _high_connectivity_directions(
            investigation_id, relationships, entities, adjacency, names, created_at
        )
    )
    directions.extend(_bridge_directions(investigation_id, adjacency, names, created_at))
    directions.extend(
        _unresolved_connection_directions(
            investigation_id, relationships, adjacency, names, created_at
        )
    )
    directions.extend(_suspicious_pattern_directions(investigation_id, patterns, created_at))
    gaps, verifications = _relationship_gap_directions(
        investigation_id, relationships, names, created_at
    )
    directions.extend(gaps)
    directions.extend(verifications)
    directions.extend(_entity_resolution_directions(investigation_id, resolutions, created_at))
    directions.extend(_timeline_gap_directions(investigation_id, events, created_at))
    directions.extend(
        _follow_up_evidence_directions(
            investigation_id, relationships, evidence, created_at
        )
    )

    order_rank = {"critical": 3, "high": 2, "medium": 1, "low": 0}
    return sorted(
        directions,
        key=lambda direction: (
            -order_rank.get(_str(direction.priority) or "low", 0),
            -direction.confidence,
        ),
    )[:MAX_TOTAL_DIRECTIONS]
