"""Tests for DataProvenance integration (Phase 17.1).

Verifies that the ingestion pipeline creates proper provenance records,
investigation-scoped isolation holds, checksums are recorded, and the
Operation Meridian seed remains intact.
"""

from uuid import UUID

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.seed import seed_database
from app.models import (
    Base,
    DataProvenance,
    Dataset,
    DatasetStatus,
    Entity,
    IngestionJob,
    Investigation,
    InvestigationEvent,
    InvestigationEvidence,
    ProvenanceSourceType,
)
from app.services.real.ingestion import IngestionPipeline

CDR_CSV = """caller,callee,call_date,duration,location
+919876543210,+919021011345,2026-02-10,120,Chennai
+919876543210,+919811122334,2026-02-11,45,Pune
+919021011345,+919811122334,2026-02-12,300,Mumbai
+919811122334,+919876543210,2026-02-13,60,Chennai
"""


@pytest.fixture
async def db_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    f = async_sessionmaker(engine, expire_on_commit=False)
    async with f() as session:
        await seed_database(session)
        await session.commit()
    yield f
    await engine.dispose()


async def _inv_id(db_factory):
    async with db_factory() as session:
        inv = (
            await session.execute(
                select(Investigation).where(Investigation.title == "Operation Meridian")
            )
        ).scalar_one()
        return inv.id


async def _create_dataset(db_factory, inv_id, name="CDR Test", file_name="cdr_test.csv"):
    async with db_factory() as session:
        ds = Dataset(
            investigation_id=inv_id,
            name=name,
            source_name="CDR Extract",
            format="csv",
            category="structured",
            status=DatasetStatus.VALIDATING,
            file_name=file_name,
            file_size=len(CDR_CSV.encode()),
        )
        session.add(ds)
        await session.flush()
        ds_id = ds.id
        await session.commit()
        return ds_id


# --- 1. Provenance created on successful upload ---


@pytest.mark.anyio
async def test_provenance_created_on_successful_upload(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        result = await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
        )
        await session.commit()

    assert result.provenance_created > 0

    async with db_factory() as session:
        prov = (
            await session.execute(
                select(DataProvenance).where(
                    DataProvenance.investigation_id == inv_id
                )
            )
        ).scalars().all()
        assert len(prov) == result.provenance_created


# --- 2. Provenance tied to correct investigation ---


@pytest.mark.anyio
async def test_provenance_tied_to_correct_investigation(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
        )
        await session.commit()

    async with db_factory() as session:
        prov = (
            await session.execute(
                select(DataProvenance).where(
                    DataProvenance.investigation_id == inv_id
                )
            )
        ).scalars().all()
        assert len(prov) > 0
        assert all(p.investigation_id == inv_id for p in prov)


# --- 3. Provenance tied to correct dataset ---


@pytest.mark.anyio
async def test_provenance_tied_to_correct_dataset(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
        )
        await session.commit()

    async with db_factory() as session:
        prov = (
            await session.execute(
                select(DataProvenance).where(
                    DataProvenance.dataset_id == ds_id
                )
            )
        ).scalars().all()
        assert len(prov) > 0
        assert all(p.dataset_id == ds_id for p in prov)


# --- 4. Provenance does not leak across investigations ---


@pytest.mark.anyio
async def test_provenance_does_not_leak_across_investigations(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    # Create a second investigation
    async with db_factory() as session:
        from app.models import Investigation as Inv

        inv2 = Inv(
            title="Unrelated Investigation",
            status="draft",
            priority="normal",
            lead_investigator="Other Analyst",
        )
        session.add(inv2)
        await session.flush()
        inv2_id = inv2.id
        await session.commit()

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
        )
        await session.commit()

    async with db_factory() as session:
        # Provenance for the original investigation
        prov_inv1 = (
            await session.execute(
                select(DataProvenance).where(
                    DataProvenance.investigation_id == inv_id
                )
            )
        ).scalars().all()
        # Provenance for the unrelated investigation
        prov_inv2 = (
            await session.execute(
                select(DataProvenance).where(
                    DataProvenance.investigation_id == inv2_id
                )
            )
        ).scalars().all()

        assert len(prov_inv1) > 0
        assert len(prov_inv2) == 0  # No provenance leaked


# --- 5. Failed ingestion does not create misleading completed provenance ---


@pytest.mark.anyio
async def test_failed_ingestion_no_misleading_provenance(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        result = await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content="",
            file_name="empty.csv",
        )
        await session.commit()

    assert result.records_processed == 0
    assert result.provenance_created == 0
    assert len(result.warnings) > 0

    # Dataset should be FAILED
    async with db_factory() as session:
        ds = await session.get(Dataset, ds_id)
        assert ds.status == DatasetStatus.FAILED


# --- 6. Repeated upload behavior ---


@pytest.mark.anyio
async def test_repeated_upload_creates_provenance_both_times(db_factory):
    inv_id = await _inv_id(db_factory)

    # First upload
    ds_id1 = await _create_dataset(db_factory, inv_id, name="CDR v1", file_name="cdr_v1.csv")
    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        r1 = await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id1,
            file_content=CDR_CSV,
            file_name="cdr_v1.csv",
        )
        await session.commit()

    # Second upload (same content, different dataset)
    ds_id2 = await _create_dataset(db_factory, inv_id, name="CDR v2", file_name="cdr_v2.csv")
    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        r2 = await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id2,
            file_content=CDR_CSV,
            file_name="cdr_v2.csv",
        )
        await session.commit()

    # Both should have created provenance
    assert r1.provenance_created > 0
    assert r2.provenance_created > 0

    # Both datasets should have provenance
    async with db_factory() as session:
        prov_ds1 = (
            await session.execute(
                select(DataProvenance).where(DataProvenance.dataset_id == ds_id1)
            )
        ).scalars().all()
        prov_ds2 = (
            await session.execute(
                select(DataProvenance).where(DataProvenance.dataset_id == ds_id2)
            )
        ).scalars().all()
        assert len(prov_ds1) > 0
        assert len(prov_ds2) > 0


# --- 7. Checksum behavior ---


@pytest.mark.anyio
async def test_checksum_recorded_on_provenance(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
        )
        await session.commit()

    async with db_factory() as session:
        prov = (
            await session.execute(
                select(DataProvenance).where(
                    DataProvenance.investigation_id == inv_id
                )
            )
        ).scalars().first()
        assert prov is not None
        assert prov.checksum is not None
        assert len(prov.checksum) == 64  # SHA-256 hex digest


@pytest.mark.anyio
async def test_same_content_same_checksum(db_factory):
    inv_id = await _inv_id(db_factory)

    ds_id1 = await _create_dataset(db_factory, inv_id, name="A", file_name="a.csv")
    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id1,
            file_content=CDR_CSV,
            file_name="a.csv",
        )
        await session.commit()

    ds_id2 = await _create_dataset(db_factory, inv_id, name="B", file_name="b.csv")
    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id2,
            file_content=CDR_CSV,
            file_name="b.csv",
        )
        await session.commit()

    async with db_factory() as session:
        prov1 = (
            await session.execute(
                select(DataProvenance).where(DataProvenance.dataset_id == ds_id1)
            )
        ).scalars().first()
        prov2 = (
            await session.execute(
                select(DataProvenance).where(DataProvenance.dataset_id == ds_id2)
            )
        ).scalars().first()
        assert prov1.checksum == prov2.checksum


# --- 8. Existing Operation Meridian seed remains valid ---


@pytest.mark.anyio
async def test_operation_meridian_seed_intact(db_factory):
    async with db_factory() as session:
        inv = (
            await session.execute(
                select(Investigation).where(Investigation.title == "Operation Meridian")
            )
        ).scalar_one()
        assert inv is not None
        assert inv.id is not None

        # Should have seeded entities
        entities = (
            await session.execute(
                select(Entity).where(Entity.investigation_id == inv.id)
            )
        ).scalars().all()
        assert len(entities) == 6

        # Should have seeded evidence
        evidence = (
            await session.execute(
                select(InvestigationEvidence).where(
                    InvestigationEvidence.investigation_id == inv.id
                )
            )
        ).scalars().all()
        assert len(evidence) == 4

        # Datasets
        datasets = (
            await session.execute(
                select(Dataset).where(Dataset.investigation_id == inv.id)
            )
        ).scalars().all()
        assert len(datasets) == 3


# --- 9. Provenance has correct source_type and extraction_method ---


@pytest.mark.anyio
async def test_provenance_metadata_correct(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
        )
        await session.commit()

    async with db_factory() as session:
        prov = (
            await session.execute(
                select(DataProvenance).where(
                    DataProvenance.investigation_id == inv_id
                )
            )
        ).scalars().all()
        for p in prov:
            assert p.source_type == ProvenanceSourceType.DATABASE
            assert p.extraction_method == "csv_ingestion"
            assert p.timestamp is not None
            assert p.confidence > 0


# --- 10. Investigation events created during ingestion ---


@pytest.mark.anyio
async def test_events_created_during_ingestion(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        result = await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
        )
        await session.commit()

    # Should have 3 events: uploaded, started, completed
    assert result.events_created >= 3

    async with db_factory() as session:
        events = (
            await session.execute(
                select(InvestigationEvent).where(
                    InvestigationEvent.investigation_id == inv_id
                )
            )
        ).scalars().all()
        event_types = {e.event_type for e in events}
        assert "dataset_uploaded" in event_types
        assert "ingestion_started" in event_types
        assert "ingestion_completed" in event_types


@pytest.mark.anyio
async def test_failed_ingestion_creates_failure_event(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content="",
            file_name="empty.csv",
        )
        await session.commit()

    async with db_factory() as session:
        events = (
            await session.execute(
                select(InvestigationEvent).where(
                    InvestigationEvent.investigation_id == inv_id
                )
            )
        ).scalars().all()
        event_types = {e.event_type for e in events}
        assert "dataset_uploaded" in event_types
        assert "ingestion_started" in event_types
        assert "ingestion_failed" in event_types


# --- 11. Ingestion job metadata includes checksum ---


@pytest.mark.anyio
async def test_job_metadata_includes_checksum(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        result = await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
        )
        await session.commit()

    async with db_factory() as session:
        job = await session.get(IngestionJob, UUID(result.job_id))
        assert job is not None
        assert "checksum" in job.metadata_
        assert len(job.metadata_["checksum"]) == 64


# --- 12. Provenance for both entities and relationships ---


@pytest.mark.anyio
async def test_provenance_for_entities_and_relationships(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        result = await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
        )
        await session.commit()

    async with db_factory() as session:
        entity_prov = (
            await session.execute(
                select(DataProvenance).where(
                    DataProvenance.investigation_id == inv_id,
                    DataProvenance.entity_id.isnot(None),
                )
            )
        ).scalars().all()
        rel_prov = (
            await session.execute(
                select(DataProvenance).where(
                    DataProvenance.investigation_id == inv_id,
                    DataProvenance.relationship_id.isnot(None),
                )
            )
        ).scalars().all()

        assert len(entity_prov) > 0
        assert len(rel_prov) > 0
        assert len(entity_prov) + len(rel_prov) == result.provenance_created
