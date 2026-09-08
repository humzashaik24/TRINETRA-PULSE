"""Deterministic, persisted network analytics for one investigation."""

from __future__ import annotations

from collections import deque
from datetime import UTC, datetime
from math import isfinite
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import EntityNotFoundError, InvestigationNotFoundError
from app.models import Entity, NetworkAnalyticsSnapshot, Relationship
from app.repositories.investigation import (
    EntityRepository,
    InvestigationRepository,
    RelationshipRepository,
)
from app.schemas.real.summary import (
    AnalyticsExplanation,
    AnalyticsOverview,
    BridgeSummary,
    CommunitySummary,
    ComponentSummary,
    EdgeSummary,
    EntityAnalytics,
    NetworkGraph,
    NodeSummary,
    ShortestPathResponse,
    TemporalSnapshot,
)

ALGORITHM_VERSION = "19.0.0"
MAX_ENTITIES = 10_000
MAX_RELATIONSHIPS = 20_000


class NetworkService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.investigations = InvestigationRepository(session)
        self.entities = EntityRepository(session)
        self.relationships = RelationshipRepository(session)

    async def _load(self, investigation_id: UUID) -> tuple[list[Entity], list[Relationship]]:
        if await self.investigations.get(investigation_id) is None:
            raise InvestigationNotFoundError(str(investigation_id))
        return (
            await self.entities.list_for_investigation(investigation_id, limit=MAX_ENTITIES),
            await self.relationships.list_for_investigation(
                investigation_id, limit=MAX_RELATIONSHIPS
            ),
        )

    async def graph(self, investigation_id: UUID) -> NetworkGraph:
        entities, relationships = await self._load(investigation_id)
        return NetworkGraph(
            investigation_id=investigation_id,
            nodes=[
                NodeSummary(
                    id=e.id,
                    name=e.name,
                    entity_type=e.entity_type.value,
                    risk_score=e.risk_score,
                    is_verified=e.is_verified,
                    is_flagged=e.is_flagged,
                )
                for e in entities
            ],
            edges=[
                EdgeSummary(
                    id=r.id,
                    source=r.source_entity_id,
                    target=r.target_entity_id,
                    relationship_type=r.relationship_type.value,
                    weight=r.weight,
                )
                for r in relationships
            ],
        )

    async def analytics(self, investigation_id: UUID) -> AnalyticsOverview:
        entities, relationships = await self._load(investigation_id)
        result = _analytics(investigation_id, entities, relationships)
        snapshot = await self._persist(investigation_id, result, len(entities), len(relationships))
        result.snapshot_id = snapshot.id
        result.computed_at = snapshot.computed_at
        return result

    async def shortest_path(
        self, investigation_id: UUID, source_entity_id: UUID, target_entity_id: UUID
    ) -> ShortestPathResponse:
        entities, relationships = await self._load(investigation_id)
        entity_ids = {entity.id for entity in entities}
        if source_entity_id not in entity_ids:
            raise EntityNotFoundError(str(source_entity_id))
        if target_entity_id not in entity_ids:
            raise EntityNotFoundError(str(target_entity_id))
        adjacency, edge_ids = _adjacency(entities, relationships)
        if source_entity_id == target_entity_id:
            return ShortestPathResponse(
                investigation_id=investigation_id,
                source_entity_id=source_entity_id,
                target_entity_id=target_entity_id,
                found=True,
                length=0,
                path=[source_entity_id],
                explanation="The source and target are the same persisted entity.",
            )
        parents: dict[UUID, UUID | None] = {source_entity_id: None}
        queue: deque[UUID] = deque([source_entity_id])
        while queue and target_entity_id not in parents:
            current = queue.popleft()
            for neighbor in sorted(adjacency[current], key=str):
                if neighbor not in parents:
                    parents[neighbor] = current
                    queue.append(neighbor)
        if target_entity_id not in parents:
            return ShortestPathResponse(
                investigation_id=investigation_id,
                source_entity_id=source_entity_id,
                target_entity_id=target_entity_id,
                explanation=(
                    "No path exists in the undirected persisted graph for this investigation."
                ),
            )
        path: list[UUID] = []
        cursor: UUID | None = target_entity_id
        while cursor is not None:
            path.append(cursor)
            cursor = parents[cursor]
        path.reverse()
        path_edges = [
            edge_ids[tuple(sorted((left, right), key=str))]
            for left, right in zip(path, path[1:], strict=False)
        ]
        return ShortestPathResponse(
            investigation_id=investigation_id,
            source_entity_id=source_entity_id,
            target_entity_id=target_entity_id,
            found=True,
            length=len(path) - 1,
            path=path,
            relationship_ids=path_edges,
            explanation="Shortest path over unique, non-self relationships in this investigation.",
        )

    async def _persist(
        self,
        investigation_id: UUID,
        result: AnalyticsOverview,
        entity_count: int,
        relationship_count: int,
    ) -> NetworkAnalyticsSnapshot:
        snapshot = (
            await self.session.execute(
                select(NetworkAnalyticsSnapshot).where(
                    NetworkAnalyticsSnapshot.investigation_id == investigation_id
                )
            )
        ).scalar_one_or_none()
        now = datetime.now(UTC)
        payload = result.model_dump(mode="json", exclude={"snapshot_id", "computed_at"})
        if snapshot is None:
            snapshot = NetworkAnalyticsSnapshot(
                investigation_id=investigation_id,
                algorithm_version=ALGORITHM_VERSION,
                computed_at=now,
                entity_count=entity_count,
                relationship_count=relationship_count,
                payload=payload,
            )
            self.session.add(snapshot)
        else:
            snapshot.algorithm_version = ALGORITHM_VERSION
            snapshot.computed_at = now
            snapshot.entity_count = entity_count
            snapshot.relationship_count = relationship_count
            snapshot.payload = payload
        await self.session.flush()
        return snapshot


def _analytics(
    investigation_id: UUID, entities: list[Entity], relationships: list[Relationship]
) -> AnalyticsOverview:
    adjacency, edge_ids = _adjacency(entities, relationships)
    directed_out, directed_in = _directed_adjacency(entities, relationships)
    node_ids = sorted(adjacency, key=str)
    degree = {node: len(adjacency[node]) for node in node_ids}
    in_degree = {node: len(directed_in[node]) for node in node_ids}
    out_degree = {node: len(directed_out[node]) for node in node_ids}
    betweenness = _betweenness(adjacency, node_ids)
    closeness = _closeness(adjacency, node_ids)
    pagerank = _pagerank(directed_out, directed_in, node_ids)
    components = _components(adjacency, node_ids, edge_ids)
    communities = _communities(adjacency, node_ids, edge_ids)
    articulation, graph_bridges = _articulation_and_bridges(adjacency, node_ids)
    unique_edge_count = len(edge_ids)
    possible = len(node_ids) * (len(node_ids) - 1) // 2
    avg_degree = sum(degree.values()) / len(node_ids) if node_ids else 0.0
    avg_path, diameter = _path_summary(adjacency, node_ids)
    ranked = sorted(node_ids, key=lambda node: (-degree[node], str(node)))
    rank = {node: index + 1 for index, node in enumerate(ranked)}
    centrality = [
        EntityAnalytics(
            entity_id=node,
            degree=degree[node],
            in_degree=in_degree[node],
            out_degree=out_degree[node],
            normalized_degree=_round(
                degree[node] / (len(node_ids) - 1) if len(node_ids) > 1 else 0.0
            ),
            betweenness=_round(betweenness[node]),
            closeness=_round(closeness[node]),
            pagerank=_round(pagerank[node]),
            rank=rank[node],
        )
        for node in node_ids
    ]
    bridge_rows = [
        BridgeSummary(
            entity_id=node,
            score=_round(betweenness[node]),
            articulation=True,
            degree=degree[node],
            betweenness=_round(betweenness[node]),
            connected_component_ids=[
                component.id
                for component in components
                if node in component.node_ids
            ],
            connected_community_ids=[
                community.id
                for community in communities
                if node in community.node_ids
            ],
            explanation=(
                f"This bridge entity has degree {degree[node]} and lies on "
                f"shortest paths between observed regions of the network."
            ),
        )
        for node in sorted(articulation, key=lambda value: (-betweenness[value], str(value)))
    ]
    bridge_rows.extend(
        BridgeSummary(
            relationship_id=edge_ids[pair],
            source_entity_id=pair[0],
            target_entity_id=pair[1],
            score=_round((betweenness[pair[0]] + betweenness[pair[1]]) / 2),
        )
        for pair in sorted(graph_bridges, key=lambda value: str(value))
    )
    explanations = [
        AnalyticsExplanation(
            code="scope",
            message=(
                "All metrics use only persisted entities and relationships belonging "
                "to this investigation."
            ),
        ),
        AnalyticsExplanation(
            code="semantics",
            message=(
                "Duplicate relationships are collapsed for topology; self-loops are "
                "ignored for degree, paths, density, and components."
            ),
        ),
    ]
    if not node_ids:
        explanations.append(
            AnalyticsExplanation(
                code="empty",
                message="This investigation has no persisted entities to analyze.",
            )
        )
    elif len(components) > 1:
        explanations.append(
            AnalyticsExplanation(
                code="disconnected",
                message=(
                    "The graph contains disconnected components; unreachable pairs "
                    "are excluded from average path length."
                ),
            )
        )
    temporal = _temporal(entities, relationships, node_ids)
    return AnalyticsOverview(
        investigation_id=investigation_id,
        entity_count=len(entities),
        relationship_count=len(relationships),
        connected_components=len(components),
        average_degree=_round(avg_degree),
        flagged_entity_count=sum(1 for entity in entities if entity.is_flagged),
        verified_entity_count=sum(1 for entity in entities if entity.is_verified),
        high_risk_entity_count=sum(1 for entity in entities if entity.risk_score >= 0.8),
        density=_round(unique_edge_count / possible if possible else 0.0),
        possible_relationship_count=possible,
        average_path_length=avg_path,
        diameter=diameter,
        community_count=len(communities),
        bridge_entity_count=len(articulation),
        bridge_relationship_count=len(graph_bridges),
        largest_component_size=max((component.size for component in components), default=0),
        isolated_entity_count=sum(1 for component in components if component.size == 1),
        highest_degree_entity_id=ranked[0] if ranked else None,
        network_influence_leader_id=(
            sorted(node_ids, key=lambda node: (-pagerank[node], str(node)))[0]
            if node_ids
            else None
        ),
        strongest_bridge_entity_id=(
            max(articulation, key=lambda node: (betweenness[node], str(node)))
            if articulation
            else None
        ),
        articulation_entity_ids=sorted(articulation, key=str),
        articulation_points=sorted(articulation, key=str),
        degree={str(node): degree[node] for node in node_ids},
        betweenness={str(node): _round(betweenness[node]) for node in node_ids},
        closeness={str(node): _round(closeness[node]) for node in node_ids},
        pagerank={str(node): _round(pagerank[node]) for node in node_ids},
        centrality=centrality,
        communities=communities,
        components=components,
        bridges=bridge_rows,
        temporal=temporal,
        explanations=explanations,
    )


def _adjacency(
    entities: list[Entity], relationships: list[Relationship]
) -> tuple[dict[UUID, set[UUID]], dict[tuple[UUID, UUID], UUID]]:
    ids = {entity.id for entity in entities}
    adjacency = {entity_id: set() for entity_id in ids}
    edge_ids: dict[tuple[UUID, UUID], UUID] = {}
    for relationship in sorted(relationships, key=lambda item: str(item.id)):
        source, target = relationship.source_entity_id, relationship.target_entity_id
        if source not in ids or target not in ids or source == target:
            continue
        pair = tuple(sorted((source, target), key=str))
        adjacency[source].add(target)
        adjacency[target].add(source)
        edge_ids.setdefault(pair, relationship.id)
    return adjacency, edge_ids


def _directed_adjacency(
    entities: list[Entity], relationships: list[Relationship]
) -> tuple[dict[UUID, set[UUID]], dict[UUID, set[UUID]]]:
    ids = {entity.id for entity in entities}
    outgoing = {entity_id: set() for entity_id in ids}
    incoming = {entity_id: set() for entity_id in ids}
    for relationship in relationships:
        source, target = relationship.source_entity_id, relationship.target_entity_id
        if source in ids and target in ids and source != target:
            outgoing[source].add(target)
            incoming[target].add(source)
    return outgoing, incoming


def _distances(adjacency: dict[UUID, set[UUID]], source: UUID) -> dict[UUID, int]:
    distances = {source: 0}
    queue: deque[UUID] = deque([source])
    while queue:
        current = queue.popleft()
        for neighbor in sorted(adjacency[current], key=str):
            if neighbor not in distances:
                distances[neighbor] = distances[current] + 1
                queue.append(neighbor)
    return distances


def _betweenness(adjacency: dict[UUID, set[UUID]], nodes: list[UUID]) -> dict[UUID, float]:
    scores = {node: 0.0 for node in nodes}
    for source in nodes:
        stack: list[UUID] = []
        predecessors = {node: [] for node in nodes}
        paths = {node: 0.0 for node in nodes}
        distance = {node: -1 for node in nodes}
        paths[source] = 1.0
        distance[source] = 0
        queue: deque[UUID] = deque([source])
        while queue:
            current = queue.popleft()
            stack.append(current)
            for neighbor in sorted(adjacency[current], key=str):
                if distance[neighbor] < 0:
                    distance[neighbor] = distance[current] + 1
                    queue.append(neighbor)
                if distance[neighbor] == distance[current] + 1:
                    paths[neighbor] += paths[current]
                    predecessors[neighbor].append(current)
        dependency = {node: 0.0 for node in nodes}
        while stack:
            current = stack.pop()
            for predecessor in predecessors[current]:
                dependency[predecessor] += (
                    paths[predecessor] / paths[current] * (1.0 + dependency[current])
                )
            if current != source:
                scores[current] += dependency[current]
    denominator = max(1.0, (len(nodes) - 1) * (len(nodes) - 2) / 2)
    return {node: scores[node] / denominator for node in nodes}


def _closeness(adjacency: dict[UUID, set[UUID]], nodes: list[UUID]) -> dict[UUID, float]:
    result: dict[UUID, float] = {}
    for node in nodes:
        distances = _distances(adjacency, node)
        reachable = len(distances) - 1
        total = sum(distance for target, distance in distances.items() if target != node)
        result[node] = (
            reachable / (len(nodes) - 1) * reachable / total
            if reachable and total
            else 0.0
        )
    return result


def _pagerank(
    outgoing: dict[UUID, set[UUID]], incoming: dict[UUID, set[UUID]], nodes: list[UUID]
) -> dict[UUID, float]:
    if not nodes:
        return {}
    damping = 0.85
    ranks = {node: 1.0 / len(nodes) for node in nodes}
    for _ in range(100):
        dangling = sum(ranks[node] for node in nodes if not outgoing[node])
        ranks = {
            node: (1 - damping) / len(nodes)
            + damping * dangling / len(nodes)
            + damping
            * sum(ranks[source] / len(outgoing[source]) for source in incoming[node])
            for node in nodes
        }
    return ranks


def _components(
    adjacency: dict[UUID, set[UUID]], nodes: list[UUID], edge_ids: dict[tuple[UUID, UUID], UUID]
) -> list[ComponentSummary]:
    remaining = set(nodes)
    result: list[ComponentSummary] = []
    while remaining:
        start = min(remaining, key=str)
        members = set(_distances(adjacency, start))
        remaining -= members
        edges = sum(1 for pair in edge_ids if pair[0] in members and pair[1] in members)
        possible = len(members) * (len(members) - 1) // 2
        result.append(
            ComponentSummary(
                id=f"component-{len(result) + 1}",
                node_ids=sorted(members, key=str),
                size=len(members),
                edge_count=edges,
                density=_round(edges / possible if possible else 0.0),
            )
        )
    return result


def _communities(
    adjacency: dict[UUID, set[UUID]], nodes: list[UUID], edge_ids: dict[tuple[UUID, UUID], UUID]
) -> list[CommunitySummary]:
    if not nodes:
        return []
    total_weight = float(len(edge_ids))
    if total_weight == 0:
        return [
            CommunitySummary(
                id=f"community-{index + 1}",
                node_ids=[node],
                size=1,
                representative_entity_id=node,
            )
            for index, node in enumerate(nodes)
        ]
    degree = {node: len(adjacency[node]) for node in nodes}
    labels = {node: node for node in nodes}
    for _ in range(40):
        moved = False
        for node in nodes:
            current = labels[node]
            neighbor_weights: dict[UUID, float] = {}
            for neighbor in adjacency[node]:
                label = labels[neighbor]
                neighbor_weights[label] = neighbor_weights.get(label, 0.0) + 1.0
            best = current
            best_delta = 0.0
            for label in sorted(neighbor_weights, key=str):
                if label == current:
                    continue
                community_degree = sum(
                    degree[member] for member in nodes if labels[member] == label
                )
                delta = (
                    neighbor_weights[label] - community_degree * degree[node] / (2 * total_weight)
                ) / total_weight
                if delta > best_delta:
                    best, best_delta = label, delta
            if best != current:
                labels[node] = best
                moved = True
        if not moved:
            break
    buckets: dict[UUID, list[UUID]] = {}
    for node in nodes:
        buckets.setdefault(labels[node], []).append(node)
    communities: list[CommunitySummary] = []
    for members in sorted(buckets.values(), key=lambda group: (str(min(group, key=str)))):
        member_set = set(members)
        internal = sum(
            1 for source, target in edge_ids if source in member_set and target in member_set
        )
        possible = len(members) * (len(members) - 1) // 2
        communities.append(
            CommunitySummary(
                id=f"community-{len(communities) + 1}",
                node_ids=sorted(members, key=str),
                size=len(members),
                internal_edge_count=internal,
                density=_round(internal / possible if possible else 0.0),
                representative_entity_id=min(members, key=str) if members else None,
            )
        )
    return communities


def _articulation_and_bridges(
    adjacency: dict[UUID, set[UUID]], nodes: list[UUID]
) -> tuple[set[UUID], set[tuple[UUID, UUID]]]:
    discovery: dict[UUID, int] = {}
    low: dict[UUID, int] = {}
    articulation: set[UUID] = set()
    bridges: set[tuple[UUID, UUID]] = set()
    clock = 0

    def visit(node: UUID, parent: UUID | None) -> None:
        nonlocal clock
        discovery[node] = low[node] = clock
        clock += 1
        children = 0
        for neighbor in sorted(adjacency[node], key=str):
            if neighbor == parent:
                continue
            if neighbor not in discovery:
                children += 1
                visit(neighbor, node)
                low[node] = min(low[node], low[neighbor])
                if parent is None and children > 1:
                    articulation.add(node)
                if parent is not None and low[neighbor] >= discovery[node]:
                    articulation.add(node)
                if low[neighbor] > discovery[node]:
                    bridges.add(tuple(sorted((node, neighbor), key=str)))
            else:
                low[node] = min(low[node], discovery[neighbor])

    for node in nodes:
        if node not in discovery:
            visit(node, None)
    return articulation, bridges


def _path_summary(
    adjacency: dict[UUID, set[UUID]], nodes: list[UUID]
) -> tuple[float | None, int | None]:
    total = 0
    pairs = 0
    diameter = 0
    for index, source in enumerate(nodes):
        distances = _distances(adjacency, source)
        for target in nodes[index + 1 :]:
            if target in distances:
                total += distances[target]
                pairs += 1
                diameter = max(diameter, distances[target])
    return (_round(total / pairs) if pairs else None, diameter if pairs else None)


def _temporal(
    entities: list[Entity], relationships: list[Relationship], nodes: list[UUID]
) -> list[TemporalSnapshot]:
    entity_times = {
        entity.id: _normalise_time(entity.created_at)
        for entity in entities
        if entity.created_at is not None and _valid_datetime(entity.created_at)
    }
    relationship_intervals = [
        relationship
        for relationship in relationships
        if (
            relationship.start_date is not None
            or relationship.end_date is not None
            or relationship.created_at is not None
        )
    ]
    times = list(entity_times.values())
    for relationship in relationship_intervals:
        if relationship.start_date is not None:
            times.append(_normalise_time(relationship.start_date))
        if relationship.end_date is not None:
            times.append(_normalise_time(relationship.end_date))
    if not times:
        return []
    start = min(times)
    end = max(times)
    periods = 1 if start == end else min(5, 8)
    snapshots: list[TemporalSnapshot] = []
    previous_nodes: set[UUID] = set()
    previous_edges: set[tuple[UUID, UUID]] = set()
    for period in range(periods):
        period_start = start + (end - start) * period / periods
        period_end = (
            end
            if period == periods - 1
            else start + (end - start) * (period + 1) / periods
        )
        active_nodes = {
            node for node in nodes if node in entity_times and entity_times[node] <= period_end
        }
        active_edges: list[Relationship] = []
        for relationship in relationship_intervals:
            if (
                relationship.source_entity_id not in active_nodes
                or relationship.target_entity_id not in active_nodes
            ):
                continue
            relation_start = (
                _normalise_time(relationship.start_date)
                if relationship.start_date
                else _normalise_time(relationship.created_at)
            )
            relation_end = (
                _normalise_time(relationship.end_date)
                if relationship.end_date
                else relation_start
            )
            if relation_start <= period_end and relation_end >= period_start:
                active_edges.append(relationship)
        active_adjacency, active_edge_ids = _adjacency(
            [entity for entity in entities if entity.id in active_nodes], active_edges
        )
        active_components = _components(
            active_adjacency, sorted(active_nodes, key=str), active_edge_ids
        )
        active_edges_set = set(active_edge_ids)
        metrics = _analytics_metrics(active_adjacency, active_edges, sorted(active_nodes, key=str))
        snapshots.append(
            TemporalSnapshot(
                period_start=period_start,
                period_end=period_end,
                node_count=len(active_nodes),
                relationship_count=len(active_edges_set),
                connected_components=len(active_components),
                community_count=len(active_components),
                average_degree=_round(
                    sum(len(neighbors) for neighbors in active_adjacency.values())
                    / len(active_nodes)
                    if active_nodes
                    else 0.0
                ),
                density=_round(
                    len(active_edges_set) / (len(active_nodes) * (len(active_nodes) - 1) / 2)
                    if len(active_nodes) > 1
                    else 0.0
                ),
                new_nodes=len(active_nodes - previous_nodes),
                new_relationships=len(active_edges_set - previous_edges),
                metrics=metrics,
            )
        )
        previous_nodes = active_nodes
        previous_edges = active_edges_set
    return snapshots


def _analytics_metrics(
    adjacency: dict[UUID, set[UUID]], relationships: list[Relationship], nodes: list[UUID]
) -> dict[str, dict[str, float]]:
    outgoing, incoming = _directed_adjacency(
        [type("_Entity", (), {"id": node})() for node in nodes], relationships
    )
    degree = {node: len(adjacency[node]) for node in nodes}
    return {
        str(node): {
            "degree": _round(degree[node] / max(1, max(degree.values(), default=0))),
            "betweenness": _round(_betweenness(adjacency, nodes)[node]),
            "closeness": _round(_closeness(adjacency, nodes)[node]),
            "pagerank": _round(_pagerank(outgoing, incoming, nodes).get(node, 0.0)),
        }
        for node in nodes
    }


def _valid_datetime(value: datetime) -> bool:
    return value.year > 1 and isfinite(value.timestamp())


def _normalise_time(value: datetime) -> datetime:
    return value.astimezone(UTC).replace(tzinfo=None) if value.tzinfo else value


def _round(value: float) -> float:
    return round(float(value), 6)


def _connected_components(entities: list[Entity], relationships: list[Relationship]) -> int:
    """Backward-compatible component count helper for existing callers."""
    adjacency, edge_ids = _adjacency(entities, relationships)
    return len(_components(adjacency, sorted(adjacency, key=str), edge_ids))
