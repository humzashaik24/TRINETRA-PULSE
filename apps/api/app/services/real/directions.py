"""Investigation Direction Intelligence service (Phase 26).

Read-only orchestration: loads persisted investigation data through existing
repositories, consumes the existing pattern-detection and candidate-resolution
services plus the deterministic direction engine, and returns a grounded,
deterministic ``DirectionsResponse``. Nothing here mutates the database.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import InvestigationNotFoundError
from app.intelligence.directions import generate_directions
from app.repositories.investigation import (
    EntityRepository,
    EventRepository,
    EvidenceRepository,
    InvestigationRepository,
    RelationshipRepository,
)
from app.schemas.real.directions import DirectionsResponse
from app.services.candidate_resolution import CandidateResolutionService
from app.services.real.patterns import PatternDetectionService


class DirectionIntelligenceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.investigations = InvestigationRepository(session)
        self.entities = EntityRepository(session)
        self.relationships = RelationshipRepository(session)
        self.evidence = EvidenceRepository(session)
        self.events = EventRepository(session)

    async def list_directions(self, investigation_id: UUID) -> DirectionsResponse:
        investigation = await self.investigations.get(investigation_id)
        if investigation is None:
            raise InvestigationNotFoundError(str(investigation_id))

        entities = await self.entities.list_for_investigation(investigation_id, limit=2000)
        relationships = await self.relationships.list_for_investigation(
            investigation_id, limit=10000
        )
        evidence = await self.evidence.list_for_investigation(investigation_id, limit=10000)
        events = await self.events.list_for_investigation(investigation_id, limit=10000)

        # Consume the existing pattern + entity-resolution capabilities rather
        # than rebuilding them. Both are deterministic and read-only.
        patterns = await PatternDetectionService(self.session).detect(investigation_id)
        resolutions = await CandidateResolutionService(self.session).list_resolutions(
            investigation_id
        )

        directions = generate_directions(
            investigation_id,
            now=datetime.now(UTC),
            entities=entities,
            relationships=relationships,
            evidence=evidence,
            events=events,
            patterns=patterns.patterns,
            resolutions=resolutions,
        )
        return DirectionsResponse(
            investigation_id=investigation_id,
            computed_at=datetime.now(UTC),
            directions=directions,
        )
