"""Entity resolution repositories (real application layer, Phase 20)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select

from app.models import DataProvenance, EntityResolution
from app.repositories.base import BaseRepository


class EntityResolutionRepository(BaseRepository[EntityResolution]):
    model = EntityResolution

    async def list_for_investigation(
        self,
        investigation_id: UUID,
        *,
        limit: int = 200,
        offset: int = 0,
    ) -> list[EntityResolution]:
        stmt = (
            select(EntityResolution)
            .where(EntityResolution.investigation_id == investigation_id)
            .order_by(EntityResolution.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_entity(
        self, entity_id: UUID, *, limit: int = 100
    ) -> list[EntityResolution]:
        stmt = (
            select(EntityResolution)
            .where(
                (EntityResolution.entity_id_1 == entity_id)
                | (EntityResolution.entity_id_2 == entity_id)
            )
            .order_by(EntityResolution.created_at)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def existing_pair(
        self, entity_id_1: UUID, entity_id_2: UUID
    ) -> EntityResolution | None:
        stmt = select(EntityResolution).where(
            (
                (EntityResolution.entity_id_1 == entity_id_1)
                & (EntityResolution.entity_id_2 == entity_id_2)
            )
            | (
                (EntityResolution.entity_id_1 == entity_id_2)
                & (EntityResolution.entity_id_2 == entity_id_1)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_for_investigation(self, investigation_id: UUID) -> int:
        from sqlalchemy import func

        result = await self.session.execute(
            select(func.count(EntityResolution.id)).where(
                EntityResolution.investigation_id == investigation_id
            )
        )
        return int(result.scalar_one())

    async def pending_review_count(self, investigation_id: UUID) -> int:
        from sqlalchemy import func

        result = await self.session.execute(
            select(func.count(EntityResolution.id)).where(
                EntityResolution.investigation_id == investigation_id,
                EntityResolution.verification_state.in_(
                    ["needs_review", "possible", "auto_resolved"]
                ),
            )
        )
        return int(result.scalar_one())


class ResolutionProvenanceRepository(BaseRepository[DataProvenance]):
    """Reused data-provenance model for resolution provenance records."""

    model = DataProvenance

    async def list_for_entity(self, entity_id: UUID, *, limit: int = 100) -> list[DataProvenance]:
        stmt = (
            select(DataProvenance)
            .where(DataProvenance.entity_id == entity_id)
            .order_by(DataProvenance.created_at)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_resolution(
        self, resolution, *, limit: int = 100
    ) -> list[DataProvenance]:
        from sqlalchemy import or_

        stmt = (
            select(DataProvenance)
            .where(
                or_(
                    DataProvenance.entity_id.in_(
                        [resolution.entity_id_1, resolution.entity_id_2]
                    )
                )
            )
            .order_by(DataProvenance.created_at)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
