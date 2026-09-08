"""Deterministic, explainable anomaly detectors over persisted investigation data.

These detectors surface investigative leads only. They never infer guilt or
assign a predictive criminality score.
"""

from __future__ import annotations

import hashlib
import math
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from app.models import Entity, InvestigationEvidence, Relationship
from app.schemas.real.patterns import (
    PatternDetectionResult,
    PatternSeverity,
    PatternType,
)

MAX_CYCLE_LENGTH = 6
MAX_RESULTS = 100


def _value(obj: Any, name: str, default: Any = None) -> Any:
    return getattr(obj, name, default)


def _type(entity: Entity) -> str:
    value = _value(entity, "entity_type", "")
    return getattr(value, "value", str(value)).lower()


def _metadata(record: Any) -> dict[str, Any]:
    value = _value(record, "metadata_", None)
    if value is None:
        value = _value(record, "metadata", {})
    return value if isinstance(value, dict) else {}


def _stable_id(
    pattern_type: PatternType, entity_ids: list[UUID], relationship_ids: list[UUID]
) -> str:
    payload = "|".join(
        [pattern_type.value, *sorted(map(str, entity_ids)), *sorted(map(str, relationship_ids))]
    )
    return f"pat-{hashlib.sha256(payload.encode()).hexdigest()[:20]}"


def _evidence_ids(relationships: list[Relationship], valid_evidence: set[UUID]) -> list[UUID]:
    found: set[UUID] = set()
    for relationship in relationships:
        for raw_id in _value(relationship, "evidence_refs", []) or []:
            try:
                evidence_id = UUID(str(raw_id))
            except (TypeError, ValueError):
                continue
            if evidence_id in valid_evidence:
                found.add(evidence_id)
    return sorted(found, key=str)


def _detected_at(investigation_updated_at: datetime, records: list[Any]) -> datetime:
    dates = [
        date
        for record in records
        for date in (
            _value(record, "start_date"),
            _value(record, "end_date"),
            _value(record, "timestamp"),
        )
        if isinstance(date, datetime)
    ]
    return max(dates, default=investigation_updated_at)


def _result(
    investigation_id: UUID,
    investigation_updated_at: datetime,
    pattern_type: PatternType,
    severity: PatternSeverity,
    confidence: float,
    title: str,
    description: str,
    entities: list[UUID],
    relationships: list[Relationship],
    evidence: set[UUID],
    metadata: dict[str, Any],
) -> PatternDetectionResult:
    entity_ids = sorted(set(entities), key=str)
    relationship_ids = sorted({relationship.id for relationship in relationships}, key=str)
    return PatternDetectionResult(
        id=_stable_id(pattern_type, entity_ids, relationship_ids),
        investigation_id=investigation_id,
        pattern_type=pattern_type,
        severity=severity,
        confidence=max(0.0, min(1.0, confidence)),
        title=title,
        description=description,
        entity_ids=entity_ids,
        relationship_ids=relationship_ids,
        evidence_ids=_evidence_ids(relationships, evidence),
        event_ids=[],
        metadata=metadata,
        detected_at=_detected_at(investigation_updated_at, relationships),
    )


def detect_circular_fund_flow(
    investigation_id: UUID,
    investigation_updated_at: datetime,
    entities: list[Entity],
    relationships: list[Relationship],
    evidence: set[UUID],
) -> list[PatternDetectionResult]:
    """Find unique directed cycles up to MAX_CYCLE_LENGTH.

    Relationship types are intentionally not restricted: persisted transaction
    links differ between ingestion sources, and the explanation states the
    observed path rather than claiming that every edge is a fund transfer.
    """
    entity_ids = {entity.id for entity in entities}
    outgoing: dict[UUID, list[Relationship]] = defaultdict(list)
    for relationship in relationships:
        if (
            relationship.source_entity_id in entity_ids
            and relationship.target_entity_id in entity_ids
        ):
            outgoing[relationship.source_entity_id].append(relationship)
    for edges in outgoing.values():
        edges.sort(key=lambda edge: str(edge.id))

    found: dict[tuple[UUID, ...], list[Relationship]] = {}

    def canonical(nodes: list[UUID]) -> tuple[UUID, ...]:
        rotations = [tuple(nodes[i:] + nodes[:i]) for i in range(len(nodes))]
        return min(rotations, key=lambda item: tuple(map(str, item)))

    def walk(
        start: UUID, current: UUID, path: list[UUID], used: set[UUID], edge_path: list[Relationship]
    ) -> None:
        if len(path) > MAX_CYCLE_LENGTH:
            return
        for edge in outgoing.get(current, []):
            target = edge.target_entity_id
            if target == start and len(path) >= 3:
                key = canonical(path)
                found.setdefault(key, list(edge_path) + [edge])
            elif target not in used and len(path) < MAX_CYCLE_LENGTH:
                walk(start, target, path + [target], used | {target}, edge_path + [edge])

    for start in sorted(entity_ids, key=str):
        walk(start, start, [start], {start}, [])

    results: list[PatternDetectionResult] = []
    for cycle, cycle_edges in sorted(found.items(), key=lambda item: tuple(map(str, item[0]))):
        amounts = [
            _metadata(edge).get(key)
            for edge in cycle_edges
            for key in ("amount", "amount_value", "transaction_amount")
            if isinstance(_metadata(edge).get(key), (int, float))
        ]
        amount = sum(amounts) if amounts else None
        path = " → ".join(map(str, cycle)) + f" → {cycle[0]}"
        amount_note = (
            f" Total observed amount: {amount:g}."
            if amount is not None
            else (" Amount information was not available in the persisted relationships.")
        )
        results.append(
            _result(
                investigation_id,
                investigation_updated_at,
                PatternType.CIRCULAR_FUND_FLOW,
                PatternSeverity.HIGH,
                0.92 if amount is not None else 0.82,
                "Potential circular fund flow",
                f"Potential circular fund flow detected across {len(cycle)} entities. "
                f"The observed relationship path is {path}.{amount_note}",
                list(cycle),
                cycle_edges,
                evidence,
                {
                    "cycle_length": len(cycle),
                    "total_observed_amount": amount,
                    "path": [str(x) for x in cycle],
                },
            )
        )
    return results


def detect_phone_switching(
    investigation_id: UUID,
    investigation_updated_at: datetime,
    entities: list[Entity],
    relationships: list[Relationship],
    evidence: set[UUID],
) -> list[PatternDetectionResult]:
    """Find person-phone multiplicity and shared-phone association signals."""
    by_person: dict[UUID, list[Relationship]] = defaultdict(list)
    by_phone: dict[UUID, list[Relationship]] = defaultdict(list)
    types = {entity.id: _type(entity) for entity in entities}
    for relationship in relationships:
        source_type = types.get(relationship.source_entity_id)
        target_type = types.get(relationship.target_entity_id)
        if source_type == "person" and target_type == "phone":
            by_person[relationship.source_entity_id].append(relationship)
            by_phone[relationship.target_entity_id].append(relationship)
        elif target_type == "person" and source_type == "phone":
            by_person[relationship.target_entity_id].append(relationship)
            by_phone[relationship.source_entity_id].append(relationship)

    results: list[PatternDetectionResult] = []
    for person_id, person_edges in sorted(by_person.items(), key=lambda item: str(item[0])):
        phones = sorted(
            {
                edge.target_entity_id
                if edge.target_entity_id in by_phone
                else edge.source_entity_id
                for edge in person_edges
            },
            key=str,
        )
        shared = [phone for phone in phones if len(by_phone[phone]) > 1]
        if len(phones) < 2 and not shared:
            continue
        dates = sorted(
            date
            for edge in person_edges
            for date in (_value(edge, "start_date"), _value(edge, "end_date"))
            if isinstance(date, datetime)
        )
        rapid = len(dates) >= 2 and dates[-1] - dates[0] <= timedelta(days=30)
        edge_set = person_edges + [
            edge for phone in shared for edge in by_phone[phone] if edge not in person_edges
        ]
        description = (
            "Potential phone switching pattern: one person is associated with "
            f"{len(phones)} phone numbers."
        )
        if shared:
            description += " At least one phone is also associated with multiple entities."
        if rapid:
            description += (
                " The available relationship timestamps place the associations within 30 days."
            )
        elif not dates:
            description += " No relationship timestamps were available to assess switching speed."
        results.append(
            _result(
                investigation_id,
                investigation_updated_at,
                PatternType.BURNER_SIM,
                PatternSeverity.MEDIUM,
                0.9 if rapid else 0.78,
                "Potential phone switching pattern",
                description,
                [person_id, *phones],
                edge_set,
                evidence,
                {
                    "phone_count": len(phones),
                    "shared_phone_ids": [str(phone) for phone in shared],
                    "rapid_switching_supported": rapid,
                },
            )
        )
    return results


def detect_network_hubs(
    investigation_id: UUID,
    investigation_updated_at: datetime,
    entities: list[Entity],
    relationships: list[Relationship],
    evidence: set[UUID],
) -> list[PatternDetectionResult]:
    degree: dict[UUID, int] = {entity.id: 0 for entity in entities}
    incident: dict[UUID, list[Relationship]] = defaultdict(list)
    for relationship in relationships:
        degree[relationship.source_entity_id] = degree.get(relationship.source_entity_id, 0) + 1
        degree[relationship.target_entity_id] = degree.get(relationship.target_entity_id, 0) + 1
        incident[relationship.source_entity_id].append(relationship)
        incident[relationship.target_entity_id].append(relationship)
    values = list(degree.values())
    if not values:
        return []
    average = sum(values) / len(values)
    deviation = math.sqrt(sum((value - average) ** 2 for value in values) / len(values))
    threshold = max(3, math.ceil(average + deviation))
    max_degree = max(values)
    results = []
    for entity_id in sorted(degree, key=str):
        if degree[entity_id] < threshold:
            continue
        results.append(
            _result(
                investigation_id,
                investigation_updated_at,
                PatternType.NETWORK_HUB,
                PatternSeverity.MEDIUM,
                min(0.99, 0.7 + (degree[entity_id] - average) / max(1, len(values))),
                "High-connectivity network hub",
                f"High-connectivity network hub observed with degree {degree[entity_id]}, "
                f"above the investigation average of {average:.1f}. This is an observed "
                "network-structure signal for investigator review.",
                [entity_id],
                incident[entity_id],
                evidence,
                {
                    "degree": degree[entity_id],
                    "normalized_degree": degree[entity_id] / max_degree,
                    "average_degree": round(average, 3),
                    "relationship_types": sorted(
                        {
                            getattr(edge.relationship_type, "value", str(edge.relationship_type))
                            for edge in incident[entity_id]
                        }
                    ),
                },
            )
        )
    return results


def detect_bridge_entities(
    investigation_id: UUID,
    investigation_updated_at: datetime,
    entities: list[Entity],
    relationships: list[Relationship],
    evidence: set[UUID],
) -> list[PatternDetectionResult]:
    adjacency: dict[UUID, set[UUID]] = {entity.id: set() for entity in entities}
    incident: dict[UUID, list[Relationship]] = defaultdict(list)
    for relationship in relationships:
        adjacency.setdefault(relationship.source_entity_id, set()).add(
            relationship.target_entity_id
        )
        adjacency.setdefault(relationship.target_entity_id, set()).add(
            relationship.source_entity_id
        )
        incident[relationship.source_entity_id].append(relationship)
        incident[relationship.target_entity_id].append(relationship)

    discovery: dict[UUID, int] = {}
    low: dict[UUID, int] = {}
    bridges: set[UUID] = set()
    counter = 0

    def visit(node: UUID, parent: UUID | None) -> None:
        nonlocal counter
        counter += 1
        discovery[node] = low[node] = counter
        children = 0
        for neighbor in sorted(adjacency.get(node, set()), key=str):
            if neighbor not in discovery:
                children += 1
                visit(neighbor, node)
                low[node] = min(low[node], low[neighbor])
                if parent is not None and low[neighbor] >= discovery[node]:
                    bridges.add(node)
                if parent is None and children > 1:
                    bridges.add(node)
            elif neighbor != parent:
                low[node] = min(low[node], discovery[neighbor])

    for entity_id in sorted(adjacency, key=str):
        if entity_id not in discovery:
            visit(entity_id, None)

    results = []
    for entity_id in sorted(bridges, key=str):
        neighbors = sorted(adjacency[entity_id], key=str)
        if len(neighbors) < 2:
            continue
        groups: list[list[UUID]] = []
        remaining = set(adjacency) - {entity_id}
        while remaining:
            root = min(remaining, key=str)
            group: list[UUID] = []
            stack = [root]
            remaining.remove(root)
            while stack:
                current = stack.pop()
                group.append(current)
                for neighbor in adjacency.get(current, set()) - {entity_id}:
                    if neighbor in remaining:
                        remaining.remove(neighbor)
                        stack.append(neighbor)
            groups.append(sorted(group, key=str))
        results.append(
            _result(
                investigation_id,
                investigation_updated_at,
                PatternType.BRIDGE_ENTITY,
                PatternSeverity.MEDIUM,
                0.86,
                "Bridge entity between network groups",
                "This entity connects two otherwise weakly connected network groups. "
                "The result describes graph structure and is an investigative lead, "
                "not a conclusion about intent.",
                [entity_id, *neighbors],
                incident[entity_id],
                evidence,
                {
                    "neighbor_count": len(neighbors),
                    "connected_groups": len(groups),
                    "component_entity_ids": [[str(item) for item in group] for group in groups],
                },
            )
        )
    return results


def detect_relationship_expansion(
    investigation_id: UUID,
    investigation_updated_at: datetime,
    entities: list[Entity],
    relationships: list[Relationship],
    evidence: set[UUID],
) -> list[PatternDetectionResult]:
    dated = [
        relationship
        for relationship in relationships
        if isinstance(_value(relationship, "start_date"), datetime)
        or isinstance(_value(relationship, "end_date"), datetime)
    ]
    if len(dated) < 3:
        return []
    all_dates = sorted(
        date
        for relationship in dated
        for date in (_value(relationship, "start_date"), _value(relationship, "end_date"))
        if isinstance(date, datetime)
    )
    earliest, latest = all_dates[0], all_dates[-1]
    if latest <= earliest:
        return []
    midpoint = earliest + (latest - earliest) / 2
    previous: dict[UUID, list[Relationship]] = defaultdict(list)
    current: dict[UUID, list[Relationship]] = defaultdict(list)
    for relationship in dated:
        date = _value(relationship, "start_date") or _value(relationship, "end_date")
        bucket = current if date > midpoint else previous
        bucket[relationship.source_entity_id].append(relationship)
        bucket[relationship.target_entity_id].append(relationship)
    results = []
    for entity_id in sorted(set(previous) | set(current), key=str):
        before, after = len(previous[entity_id]), len(current[entity_id])
        if before and after >= 2 * before and after - before >= 2:
            supporting = previous[entity_id] + current[entity_id]
            results.append(
                _result(
                    investigation_id,
                    investigation_updated_at,
                    PatternType.RAPID_RELATIONSHIP_EXPANSION,
                    PatternSeverity.MEDIUM,
                    0.84,
                    "Rapid relationship expansion",
                    f"Observed relationship count increased from {before} to {after} "
                    "across the available time window "
                    f"({earliest.isoformat()} to {latest.isoformat()}).",
                    [entity_id],
                    supporting,
                    evidence,
                    {
                        "previous_relationship_count": before,
                        "current_relationship_count": after,
                        "window": {"from": earliest.isoformat(), "to": latest.isoformat()},
                    },
                )
            )
    return results


def detect_patterns(
    investigation_id: UUID,
    investigation_updated_at: datetime,
    entities: list[Entity],
    relationships: list[Relationship],
    evidence_records: list[InvestigationEvidence],
) -> list[PatternDetectionResult]:
    evidence = {record.id for record in evidence_records}
    results = [
        *detect_circular_fund_flow(
            investigation_id, investigation_updated_at, entities, relationships, evidence
        ),
        *detect_phone_switching(
            investigation_id, investigation_updated_at, entities, relationships, evidence
        ),
        *detect_network_hubs(
            investigation_id, investigation_updated_at, entities, relationships, evidence
        ),
        *detect_bridge_entities(
            investigation_id, investigation_updated_at, entities, relationships, evidence
        ),
        *detect_relationship_expansion(
            investigation_id, investigation_updated_at, entities, relationships, evidence
        ),
    ]
    return sorted(results, key=lambda result: (result.pattern_type.value, result.id))[:MAX_RESULTS]
