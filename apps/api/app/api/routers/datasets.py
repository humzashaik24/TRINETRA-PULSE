"""Real datasets, ingestion jobs & data-source router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, File, Form, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import select as sa_select

from app.api.deps import CanMutateDep, CurrentUserDep, SessionDep
from app.models import Dataset, DatasetStatus, IngestionJob, IngestionJobStatus
from app.repositories.dataset import DataSourceRepository
from app.schemas.real.dataset import (
    DatasetCreate,
    DatasetRead,
    DatasetUpdate,
    DataSourceCreate,
    DataSourceRead,
    IngestionJobCreate,
    IngestionJobRead,
)
from app.services.real.dataset import DatasetService

router = APIRouter()


# ------------------------------------------------------------------
# Data Sources
# ------------------------------------------------------------------


@router.get("/sources", response_model=list[DataSourceRead])
async def list_data_sources(
    session: SessionDep,
    _user: CurrentUserDep,
    category: str | None = Query(None),
) -> list[DataSourceRead]:
    repo = DataSourceRepository(session)
    items = await repo.list(limit=500)
    if category:
        items = [i for i in items if i.category == category]
    return [DataSourceRead.model_validate(i) for i in items]


@router.post("/sources", response_model=DataSourceRead, status_code=201)
async def create_data_source(
    payload: DataSourceCreate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> DataSourceRead:
    from app.models import DataSource

    ds = DataSource(
        name=payload.name,
        description=payload.description,
        category=payload.category,
        format=payload.format,
        icon=payload.icon,
        accepted_extensions=payload.accepted_extensions,
        max_file_size=payload.max_file_size,
        metadata_=payload.metadata_,
    )
    repo = DataSourceRepository(session)
    created = await repo.add(ds)
    return DataSourceRead.model_validate(created)


# ------------------------------------------------------------------
# File Upload & Ingestion
# ------------------------------------------------------------------


class UploadResult(BaseModel):
    dataset: DatasetRead
    job_id: str
    records_processed: int
    entities_created: int
    relationships_created: int
    evidence_created: int
    duplicates_skipped: int
    warnings: list[str] = []


@router.post("/upload", response_model=UploadResult, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    investigation_id: UUID = Form(...),
    name: str | None = Form(None),
    description: str | None = Form(None),
    source_name: str | None = Form(None),
    category: str = Form("structured"),
    session: SessionDep = None,
    user: CanMutateDep = None,
) -> UploadResult:
    """Upload a CSV file and run the ingestion pipeline.

    Accepts multipart/form-data with a CSV file and metadata fields.
    Creates the dataset, parses the CSV, extracts entities and relationships,
    and returns the created dataset with ingestion results. Requires an
    authenticated actor with mutation rights (INVESTIGATOR or higher).
    """
    content = await file.read()
    try:
        file_content = content.decode("utf-8")
    except UnicodeDecodeError:
        file_content = content.decode("latin-1")

    file_name = file.filename or "unknown.csv"
    dataset_name = name or file_name.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

    service = DatasetService(session)
    ds = await service.create_dataset(
        DatasetCreate(
            investigation_id=investigation_id,
            name=dataset_name,
            description=description,
            source_name=source_name or dataset_name,
            format="csv",
            category=category,
            file_name=file_name,
            file_size=len(content),
        )
    )

    from app.services.real.ingestion import IngestionPipeline

    pipeline = IngestionPipeline(session)
    result = await pipeline.run(
        investigation_id=investigation_id,
        dataset_id=ds.id,
        file_content=file_content,
        file_name=file_name,
        created_by=user.id if user else None,
        actor_id=user.id if user else None,
        actor_email=user.email if user else None,
    )

    await session.commit()
    await session.refresh(ds)

    return UploadResult(
        dataset=DatasetRead.model_validate(ds),
        job_id=result.job_id,
        records_processed=result.records_processed,
        entities_created=result.entities_created,
        relationships_created=result.relationships_created,
        evidence_created=result.evidence_created,
        duplicates_skipped=result.duplicates_skipped,
        warnings=result.warnings,
    )


# ------------------------------------------------------------------
# Datasets
# ------------------------------------------------------------------


@router.get("", response_model=list[DatasetRead])
async def list_datasets(
    investigation_id: UUID | None = Query(None),
    session: SessionDep = None,
    _user: CurrentUserDep = None,
) -> list[DatasetRead]:
    service = DatasetService(session)
    if investigation_id:
        items = await service.list_datasets(investigation_id)
    else:
        stmt = sa_select(Dataset).order_by(Dataset.created_at.desc()).limit(500)
        result = await session.execute(stmt)
        items = list(result.scalars().all())
    return [DatasetRead.model_validate(i) for i in items]


@router.get("/{dataset_id}", response_model=DatasetRead)
async def get_dataset(
    dataset_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> DatasetRead:
    service = DatasetService(session)
    ds = await service.get_dataset(dataset_id)
    return DatasetRead.model_validate(ds)


@router.post("", response_model=DatasetRead, status_code=201)
async def create_dataset(
    payload: DatasetCreate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> DatasetRead:
    service = DatasetService(session)
    ds = await service.create_dataset(payload)
    return DatasetRead.model_validate(ds)


@router.patch("/{dataset_id}", response_model=DatasetRead)
async def update_dataset(
    dataset_id: UUID,
    payload: DatasetUpdate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> DatasetRead:
    service = DatasetService(session)
    ds = await service.update_dataset_status(
        dataset_id,
        DatasetStatus(payload.status) if payload.status else DatasetStatus.VALIDATING,
        **payload.model_dump(exclude_none=True, exclude={"status"}),
    )
    return DatasetRead.model_validate(ds)


# ------------------------------------------------------------------
# Ingestion Jobs
# ------------------------------------------------------------------


@router.get("/{dataset_id}/jobs", response_model=list[IngestionJobRead])
async def list_jobs(
    dataset_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> list[IngestionJobRead]:
    service = DatasetService(session)
    items = await service.list_jobs(dataset_id)
    return [IngestionJobRead.model_validate(i) for i in items]


@router.post("/{dataset_id}/jobs", response_model=IngestionJobRead, status_code=201)
async def create_job(
    dataset_id: UUID,
    payload: IngestionJobCreate,
    session: SessionDep,
    _actor: CanMutateDep,
) -> IngestionJobRead:
    service = DatasetService(session)
    payload.dataset_id = dataset_id
    job = await service.create_job(payload)
    return IngestionJobRead.model_validate(job)


@router.get("/jobs/{job_id}", response_model=IngestionJobRead)
async def get_job(
    job_id: UUID,
    session: SessionDep,
    _user: CurrentUserDep,
) -> IngestionJobRead:
    service = DatasetService(session)
    job = await service.get_job(job_id)
    return IngestionJobRead.model_validate(job)


@router.get("/all-jobs", response_model=list[IngestionJobRead])
async def list_all_jobs(
    session: SessionDep = None,
    _user: CurrentUserDep = None,
) -> list[IngestionJobRead]:
    """List all ingestion jobs across all investigations."""
    result = await session.execute(
        sa_select(IngestionJob).order_by(IngestionJob.created_at.desc()).limit(200)
    )
    jobs = list(result.scalars().all())
    return [IngestionJobRead.model_validate(j) for j in jobs]


class CompleteJobBody(BaseModel):
    status: str = "completed"
    records_processed: int = 0
    entities_extracted: int = 0
    candidates_created: int = 0
    matches_found: int = 0
    errors: list[str] | None = None
    warnings: list[str] | None = None


@router.post("/jobs/{job_id}/complete", response_model=IngestionJobRead)
async def complete_job(
    job_id: UUID,
    body: CompleteJobBody,
    session: SessionDep,
    _actor: CanMutateDep,
) -> IngestionJobRead:
    service = DatasetService(session)
    job = await service.complete_job(
        job_id,
        status=IngestionJobStatus(body.status),
        records_processed=body.records_processed,
        entities_extracted=body.entities_extracted,
        candidates_created=body.candidates_created,
        matches_found=body.matches_found,
        errors=body.errors,
        warnings=body.warnings,
    )
    return IngestionJobRead.model_validate(job)


@router.post("/jobs/{job_id}/cancel", response_model=IngestionJobRead)
async def cancel_job(
    job_id: UUID,
    session: SessionDep,
    _actor: CanMutateDep,
) -> IngestionJobRead:
    service = DatasetService(session)
    job = await service.cancel_job(job_id)
    return IngestionJobRead.model_validate(job)
