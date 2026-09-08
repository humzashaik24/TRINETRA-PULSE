"""Investigation-family repositories (real application layer)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, func, select

from app.models import (
    Dataset,
    Entity,
    EvidenceChainEntry,
    IngestionJob,
    Investigation,
    InvestigationEvent,
    InvestigationEvidence,
    InvestigationFinding,
    InvestigationNote,
    NetworkAnalyticsSnapshot,
    Relationship,
)
from app.repositories.base import BaseRepository


class InvestigationRepository(BaseRepository[Investigation]):
    model = Investigation

    async def count_by_status(self) -> dict[str, int]:
        result = await self.session.execute(
            select(Investigation.status, func.count(Investigation.id)).group_by(
                Investigation.status
            )
        )
        return {row[0]: row[1] for row in result.all()}


class EntityRepository(BaseRepository[Entity]):
    model = Entity

    async def list_for_investigation(
        self, investigation_id: UUID, *, limit: int = 100, offset: int = 0
    ) -> list[Entity]:
        stmt = (
            select(Entity)
            .where(Entity.investigation_id == investigation_id)
            .order_by(Entity.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_investigation(self, investigation_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(Entity.id)).where(Entity.investigation_id == investigation_id)
        )
        return int(result.scalar_one())


class RelationshipRepository(BaseRepository[Relationship]):
    model = Relationship

    async def list_for_investigation(
        self, investigation_id: UUID, *, limit: int = 500, offset: int = 0
    ) -> list[Relationship]:
        stmt = (
            select(Relationship)
            .where(Relationship.investigation_id == investigation_id)
            .order_by(Relationship.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_investigation(self, investigation_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(Relationship.id)).where(
                Relationship.investigation_id == investigation_id
            )
        )
        return int(result.scalar_one())


class FindingRepository(BaseRepository[InvestigationFinding]):
    model = InvestigationFinding

    async def list_for_investigation(
        self, investigation_id: UUID, *, limit: int = 100, offset: int = 0
    ) -> list[InvestigationFinding]:
        stmt = (
            select(InvestigationFinding)
            .where(InvestigationFinding.investigation_id == investigation_id)
            .order_by(InvestigationFinding.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_investigation(self, investigation_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(InvestigationFinding.id)).where(
                InvestigationFinding.investigation_id == investigation_id
            )
        )
        return int(result.scalar_one())


class EvidenceRepository(BaseRepository[InvestigationEvidence]):
    model = InvestigationEvidence

    async def list_for_investigation(
        self, investigation_id: UUID, *, limit: int = 100, offset: int = 0
    ) -> list[InvestigationEvidence]:
        stmt = (
            select(InvestigationEvidence)
            .where(InvestigationEvidence.investigation_id == investigation_id)
            .order_by(InvestigationEvidence.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_investigation(self, investigation_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(InvestigationEvidence.id)).where(
                InvestigationEvidence.investigation_id == investigation_id
            )
        )
        return int(result.scalar_one())


class EventRepository(BaseRepository[InvestigationEvent]):
    model = InvestigationEvent

    async def list_for_investigation(
        self, investigation_id: UUID, *, limit: int = 100, offset: int = 0
    ) -> list[InvestigationEvent]:
        stmt = (
            select(InvestigationEvent)
            .where(InvestigationEvent.investigation_id == investigation_id)
            .order_by(InvestigationEvent.timestamp)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_investigation(self, investigation_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(InvestigationEvent.id)).where(
                InvestigationEvent.investigation_id == investigation_id
            )
        )
        return int(result.scalar_one())


class NoteRepository(BaseRepository[InvestigationNote]):
    model = InvestigationNote

    async def list_for_investigation(
        self, investigation_id: UUID, *, limit: int = 100, offset: int = 0
    ) -> list[InvestigationNote]:
        stmt = (
            select(InvestigationNote)
            .where(InvestigationNote.investigation_id == investigation_id)
            .order_by(InvestigationNote.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_investigation(self, investigation_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(InvestigationNote.id)).where(
                InvestigationNote.investigation_id == investigation_id
            )
        )
        return int(result.scalar_one())


async def cleanup_investigation(session, investigation_id: UUID) -> None:
    """Remove all children of an investigation (used when deleting)."""
    for model in (
        IngestionJob,
        Dataset,
        Entity,
        Relationship,
        InvestigationEvidence,
        InvestigationFinding,
        InvestigationEvent,
        InvestigationNote,
        EvidenceChainEntry,
        NetworkAnalyticsSnapshot,
    ):
        await session.execute(delete(model).where(model.investigation_id == investigation_id))
