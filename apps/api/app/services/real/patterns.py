"""Investigation-scoped suspicious pattern service."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import InvestigationNotFoundError
from app.intelligence.anomaly_detection import detect_patterns
from app.repositories.investigation import (
    EntityRepository,
    EvidenceRepository,
    InvestigationRepository,
    RelationshipRepository,
)
from app.schemas.real.patterns import PatternDetectionResponse


class PatternDetectionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.investigations = InvestigationRepository(session)
        self.entities = EntityRepository(session)
        self.relationships = RelationshipRepository(session)
        self.evidence = EvidenceRepository(session)

    async def detect(self, investigation_id: UUID) -> PatternDetectionResponse:
        investigation = await self.investigations.get(investigation_id)
        if investigation is None:
            raise InvestigationNotFoundError(str(investigation_id))
        entities = await self.entities.list_for_investigation(investigation_id, limit=1000)
        relationships = await self.relationships.list_for_investigation(
            investigation_id, limit=5000
        )
        evidence = await self.evidence.list_for_investigation(investigation_id, limit=5000)
        return PatternDetectionResponse(
            investigation_id=investigation_id,
            patterns=detect_patterns(
                investigation_id,
                investigation.updated_at,
                entities,
                relationships,
                evidence,
            ),
        )
