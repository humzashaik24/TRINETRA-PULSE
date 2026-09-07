"""Unit/integration tests for DatasetService (Phase 14.3).

Exercises the dataset & ingestion-job domain service against an in-memory
SQLite database through the seeded Operation Meridian universe.
"""

from uuid import UUID

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.errors import NotFoundError
from app.db.seed import seed_database
from app.models import Base, Dataset, Investigation
from app.repositories.dataset import DataSourceRepository
from app.schemas.real.dataset import DatasetCreate, IngestionJobCreate
from app.services.real.dataset import DatasetService


@pytest.fixture
async def factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    f = async_sessionmaker(engine, expire_on_commit=False)
    async with f() as session:
        await seed_database(session)
        await session.commit()
    yield f
    await engine.dispose()


@pytest.fixture
async def service(factory):
    async with factory() as session:
        yield session, DatasetService(session)


async def _inv_id(factory):
    async with factory() as session:
        inv = (
            await session.execute(
                select(Investigation).where(Investigation.title == "Operation Meridian")
            )
        ).scalar_one()
        return inv.id


@pytest.mark.anyio
async def test_list_seeded_datasets(factory, service):
    session, svc = service
    inv_id = await _inv_id(factory)
    items = await svc.list_datasets(inv_id)
    names = {d.name for d in items}
    assert names == {
        "FIR Records",
        "CDR Extract - Operation clean",
        "Bank Transaction Log",
    }
    assert len(items) == 3


@pytest.mark.anyio
async def test_create_and_get_dataset(factory, service):
    session, svc = service
    inv_id = await _inv_id(factory)

    async with factory() as seed_session:
        repo = DataSourceRepository(seed_session)
        from app.models import DataSource

        source = DataSource(
            name="GSTN",
            description="GST Network exports",
            category="financial",
            format="csv",
            accepted_extensions=["csv"],
        )
        source = await repo.add(source)
        source_id = source.id

    payload = DatasetCreate(
        investigation_id=inv_id,
        data_source_id=source_id,
        name="GST Records",
        source_name="GSTN Portal",
        format="csv",
        category="financial",
        file_name="gst_export.csv",
        file_size=2048,
        metadata_={"sheet": "summary"},
    )
    created = await svc.create_dataset(payload)
    assert created.status.value == "validating"
    assert created.name == "GST Records"

    fetched = await svc.get_dataset(created.id)
    assert fetched.id == created.id
    assert fetched.file_name == "gst_export.csv"


@pytest.mark.anyio
async def test_get_dataset_not_found(service):
    session, svc = service

    with pytest.raises(NotFoundError):
        await svc.get_dataset(UUID("00000000-0000-0000-0000-000000000000"))


@pytest.mark.anyio
async def test_list_jobs_filters_by_dataset(factory, service):
    session, svc = service
    async with factory() as seed_session:
        ds = (await seed_session.execute(select(Dataset))).scalars().first()

    jobs = await svc.list_jobs(ds.id)
    assert len(jobs) == 1
    assert jobs[0].dataset_id == ds.id
    assert jobs[0].status.value == "completed"


@pytest.mark.anyio
async def test_create_job_and_complete(factory, service):
    session, svc = service
    inv_id = await _inv_id(factory)
    async with factory() as seed_session:
        ds = (await seed_session.execute(select(Dataset))).scalars().first()

    payload = IngestionJobCreate(
        investigation_id=inv_id,
        dataset_id=ds.id,
        created_by="Analyst Singh",
        metadata_={"run": 2},
    )
    job = await svc.create_job(payload)
    assert job.status.value == "queued"
    assert job.created_by == "Analyst Singh"

    fetched_ds = await svc.get_dataset(ds.id)
    assert fetched_ds.last_ingestion_id == job.id

    completed = await svc.complete_job(
        job.id,
        records_processed=100,
        entities_extracted=12,
        candidates_created=10,
        matches_found=4,
        warnings=["low confidence"],
    )
    assert completed.status.value == "completed"
    assert completed.progress == 100
    assert completed.records_processed == 100
    assert completed.warnings_list == ["low confidence"]
    assert completed.completed_at is not None


@pytest.mark.anyio
async def test_cancel_job(factory, service):
    session, svc = service
    inv_id = await _inv_id(factory)
    async with factory() as seed_session:
        ds = (await seed_session.execute(select(Dataset))).scalars().first()

    payload = IngestionJobCreate(investigation_id=inv_id, dataset_id=ds.id)
    job = await svc.create_job(payload)
    cancelled = await svc.cancel_job(job.id)
    assert cancelled.status.value == "cancelled"
    assert cancelled.completed_at is not None


@pytest.mark.anyio
async def test_data_source_repo_roundtrip(factory):
    async with factory() as session:
        repo = DataSourceRepository(session)
        from app.models import DataSource

        created = DataSource(
            name="Call Records",
            description="Telecom CDR ingestion",
            category="structured",
            format="csv",
            icon="phone",
            accepted_extensions=["csv", "xlsx"],
            max_file_size=5_242_880,
        )
        saved = await repo.add(created)
        assert saved.id is not None

        fetched = await repo.get(saved.id)
        assert fetched is not None
        assert fetched.name == "Call Records"
        assert fetched.accepted_extensions == ["csv", "xlsx"]

        all_sources = await repo.list(limit=100)
        assert any(s.id == saved.id for s in all_sources)
