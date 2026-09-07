"""Dataset, IngestionJob, and DataProvenance repositories (Phase 14.3 / 17.1)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select

from app.models import DataProvenance, Dataset, DataSource, IngestionJob
from app.repositories.base import BaseRepository


class DataSourceRepository(BaseRepository):
    model = DataSource


class DatasetRepository(BaseRepository[Dataset]):
    model = Dataset

    async def list_for_investigation(
        self, investigation_id: UUID, *, limit: int = 100, offset: int = 0
    ) -> list[Dataset]:
        stmt = (
            select(Dataset)
            .where(Dataset.investigation_id == investigation_id)
            .order_by(Dataset.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_investigation(self, investigation_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(Dataset.id)).where(
                Dataset.investigation_id == investigation_id
            )
        )
        return int(result.scalar_one())


class IngestionJobRepository(BaseRepository[IngestionJob]):
    model = IngestionJob

    async def list_for_investigation(
        self, investigation_id: UUID, *, limit: int = 100, offset: int = 0
    ) -> list[IngestionJob]:
        stmt = (
            select(IngestionJob)
            .where(IngestionJob.investigation_id == investigation_id)
            .order_by(IngestionJob.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_dataset(
        self, dataset_id: UUID, *, limit: int = 100
    ) -> list[IngestionJob]:
        stmt = (
            select(IngestionJob)
            .where(IngestionJob.dataset_id == dataset_id)
            .order_by(IngestionJob.created_at)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_investigation(self, investigation_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(IngestionJob.id)).where(
                IngestionJob.investigation_id == investigation_id
            )
        )
        return int(result.scalar_one())


class DataProvenanceRepository(BaseRepository[DataProvenance]):
    model = DataProvenance

    async def list_for_investigation(
        self, investigation_id: UUID, *, limit: int = 500, offset: int = 0
    ) -> list[DataProvenance]:
        stmt = (
            select(DataProvenance)
            .where(DataProvenance.investigation_id == investigation_id)
            .order_by(DataProvenance.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_dataset(
        self, dataset_id: UUID, *, limit: int = 500
    ) -> list[DataProvenance]:
        stmt = (
            select(DataProvenance)
            .where(DataProvenance.dataset_id == dataset_id)
            .order_by(DataProvenance.created_at)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_entity(
        self, entity_id: UUID, *, limit: int = 100
    ) -> list[DataProvenance]:
        stmt = (
            select(DataProvenance)
            .where(DataProvenance.entity_id == entity_id)
            .order_by(DataProvenance.created_at)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_relationship(
        self, relationship_id: UUID, *, limit: int = 100
    ) -> list[DataProvenance]:
        stmt = (
            select(DataProvenance)
            .where(DataProvenance.relationship_id == relationship_id)
            .order_by(DataProvenance.created_at)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_investigation(self, investigation_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(DataProvenance.id)).where(
                DataProvenance.investigation_id == investigation_id
            )
        )
        return int(result.scalar_one())
