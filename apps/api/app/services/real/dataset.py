"""Dataset & ingestion domain service (real application layer)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import InvestigationNotFoundError
from app.models import Dataset, DatasetStatus, IngestionJob, IngestionJobStatus
from app.repositories.dataset import DatasetRepository, IngestionJobRepository
from app.repositories.investigation import InvestigationRepository
from app.schemas.real.dataset import DatasetCreate, IngestionJobCreate


class DatasetService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.investigations = InvestigationRepository(session)
        self.datasets = DatasetRepository(session)
        self.jobs = IngestionJobRepository(session)

    async def _require_investigation(self, investigation_id: UUID) -> None:
        inv = await self.investigations.get(investigation_id)
        if not inv:
            raise InvestigationNotFoundError(str(investigation_id))

    async def list_datasets(self, investigation_id: UUID) -> list[Dataset]:
        await self._require_investigation(investigation_id)
        return await self.datasets.list_for_investigation(investigation_id)

    async def get_dataset(self, dataset_id: UUID) -> Dataset:
        ds = await self.datasets.get(dataset_id)
        if not ds:
            from app.api.errors import NotFoundError
            raise NotFoundError("Dataset", str(dataset_id))
        return ds

    async def create_dataset(self, payload: DatasetCreate) -> Dataset:
        await self._require_investigation(payload.investigation_id)
        ds = Dataset(
            investigation_id=payload.investigation_id,
            data_source_id=payload.data_source_id,
            name=payload.name,
            description=payload.description,
            source_name=payload.source_name,
            format=payload.format,
            category=payload.category,
            file_name=payload.file_name,
            file_size=payload.file_size,
            status=DatasetStatus.VALIDATING,
            metadata_=payload.metadata_,
        )
        return await self.datasets.add(ds)

    async def update_dataset_status(
        self, dataset_id: UUID, status: DatasetStatus, **fields: object
    ) -> Dataset:
        ds = await self.get_dataset(dataset_id)
        ds.status = status
        for k, v in fields.items():
            if hasattr(ds, k) and v is not None:
                setattr(ds, k, v)
        await self.session.flush()
        await self.session.refresh(ds)
        return ds

    async def list_jobs(self, dataset_id: UUID) -> list[IngestionJob]:
        return await self.jobs.list_for_dataset(dataset_id)

    async def get_job(self, job_id: UUID) -> IngestionJob:
        job = await self.jobs.get(job_id)
        if not job:
            from app.api.errors import NotFoundError
            raise NotFoundError("IngestionJob", str(job_id))
        return job

    async def create_job(self, payload: IngestionJobCreate) -> IngestionJob:
        await self._require_investigation(payload.investigation_id)
        ds = await self.get_dataset(payload.dataset_id)
        job = IngestionJob(
            investigation_id=payload.investigation_id,
            dataset_id=payload.dataset_id,
            status=IngestionJobStatus.QUEUED,
            created_by=payload.created_by,
            metadata_=payload.metadata_,
        )
        created = await self.jobs.add(job)
        ds.last_ingestion_id = created.id
        await self.session.flush()
        return created

    async def complete_job(
        self,
        job_id: UUID,
        *,
        status: IngestionJobStatus = IngestionJobStatus.COMPLETED,
        records_processed: int = 0,
        entities_extracted: int = 0,
        candidates_created: int = 0,
        matches_found: int = 0,
        errors: list[str] | None = None,
        warnings: list[str] | None = None,
    ) -> IngestionJob:
        from datetime import UTC, datetime

        job = await self.get_job(job_id)
        job.status = status
        job.progress = 100 if status == IngestionJobStatus.COMPLETED else job.progress
        job.records_processed = records_processed
        job.entities_extracted = entities_extracted
        job.candidates_created = candidates_created
        job.matches_found = matches_found
        job.completed_at = datetime.now(UTC).isoformat()
        if errors is not None:
            job.errors_list = errors
        if warnings is not None:
            job.warnings_list = warnings
        await self.session.flush()
        await self.session.refresh(job)
        return job

    async def cancel_job(self, job_id: UUID) -> IngestionJob:
        from datetime import UTC, datetime

        job = await self.get_job(job_id)
        job.status = IngestionJobStatus.CANCELLED
        job.completed_at = datetime.now(UTC).isoformat()
        await self.session.flush()
        await self.session.refresh(job)
        return job
