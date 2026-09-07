"""Network graph and analytics service (real application layer)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import InvestigationNotFoundError
from app.relationship_intelligence import (
    derive_observations_bulk,
    evaluate_relationship,
    is_directed,
)
from app.repositories.investigation import (
    EntityRepository,
    InvestigationRepository,
    RelationshipRepository,
)
from app.schemas.real.summary import (
    AnalyticsOverview,
    EdgeSummary,
    NetworkGraph,
    NodeSummary,
)


class NetworkService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.investigations = InvestigationRepository(session)
        self.entities = EntityRepository(session)
        self.relationships = RelationshipRepository(session)

    async def graph(self, investigation_id: UUID) -> NetworkGraph:
        investigation = await self.investigations.get(investigation_id)
        if not investigation:
            raise InvestigationNotFoundError(str(investigation_id))
        entities = await self.entities.list_for_investigation(
            investigation_id, limit=500
        )
        relationships = await self.relationships.list_for_investigation(
            investigation_id, limit=2000
        )
        observations_by_relationship = await derive_observations_bulk(
            self.session, relationships
        )
        edges = []
        for r in relationships:
            evals = evaluate_relationship(r, observations_by_relationship[r.id])
            edges.append(
                EdgeSummary(
                    id=r.id,
                    source=r.source_entity_id,
                    target=r.target_entity_id,
                    relationship_type=r.relationship_type.value,
                    weight=r.weight,
                    direction=(
                        "directed"
                        if is_directed(r.relationship_type)
                        else "undirected"
                    ),
                    verification_status=(
                        r.verification_status.value
                        if r.verification_status is not None
                        else None
                    ),
                    intelligence_status=evals["intelligence_status"].value,
                    linkage_score=evals["linkage_score"],
                    observation_count=evals["observation_count"],
                    source_count=evals["source_count"],
                    first_observed_at=evals["first_observed_at"],
                    last_observed_at=evals["last_observed_at"],
                )
            )
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
            edges=edges,
        )

    async def analytics(self, investigation_id: UUID) -> AnalyticsOverview:
        investigation = await self.investigations.get(investigation_id)
        if not investigation:
            raise InvestigationNotFoundError(str(investigation_id))
        entities = await self.entities.list_for_investigation(
            investigation_id, limit=1000
        )
        relationships = await self.relationships.list_for_investigation(
            investigation_id, limit=2000
        )

        degree: dict[UUID, int] = {}
        for r in relationships:
            degree[r.source_entity_id] = degree.get(r.source_entity_id, 0) + 1
            degree[r.target_entity_id] = degree.get(r.target_entity_id, 0) + 1

        flagged = sum(1 for e in entities if e.is_flagged)
        verified = sum(1 for e in entities if e.is_verified)
        high_risk = sum(1 for e in entities if e.risk_score >= 0.8)

        connected = _connected_components(entities, relationships)
        avg_degree = (
            sum(degree.values()) / len(entities) if entities else 0.0
        )

        return AnalyticsOverview(
            investigation_id=investigation_id,
            entity_count=len(entities),
            relationship_count=len(relationships),
            connected_components=connected,
            average_degree=round(avg_degree, 3),
            flagged_entity_count=flagged,
            verified_entity_count=verified,
            high_risk_entity_count=high_risk,
        )


def _connected_components(entities, relationships) -> int:
    if not entities:
        return 0
    adj: dict[UUID, set[UUID]] = {e.id: set() for e in entities}
    for r in relationships:
        adj.setdefault(r.source_entity_id, set()).add(r.target_entity_id)
        adj.setdefault(r.target_entity_id, set()).add(r.source_entity_id)
    visited: set[UUID] = set()
    components = 0
    for entity in entities:
        if entity.id in visited:
            continue
        components += 1
        stack = [entity.id]
        while stack:
            current = stack.pop()
            if current in visited:
                continue
            visited.add(current)
            stack.extend(adj.get(current, set()) - visited)
    return components
