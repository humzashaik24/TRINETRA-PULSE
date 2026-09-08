"""Tests for the CSV ingestion pipeline (Phase 16).

Exercises entity extraction, relationship building, and evidence creation
against an in-memory SQLite database through the seeded Operation Meridian
universe.
"""

from uuid import UUID

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.seed import seed_database
from app.models import (
    Base,
    Dataset,
    DatasetStatus,
    Entity,
    EntityType,
    IngestionJob,
    IngestionJobStatus,
    Investigation,
    InvestigationEvidence,
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


async def _create_dataset(db_factory, inv_id):
    async with db_factory() as session:
        ds = Dataset(
            investigation_id=inv_id,
            name="CDR Test",
            source_name="CDR Extract",
            format="csv",
            category="structured",
            status=DatasetStatus.VALIDATING,
            file_name="cdr_test.csv",
            file_size=len(CDR_CSV.encode()),
        )
        session.add(ds)
        await session.flush()
        ds_id = ds.id
        await session.commit()
        return ds_id


# --- Entity column detection ---


def test_detect_entity_columns_cdr():
    cols = IngestionPipeline._detect_entity_columns(
        ["caller", "callee", "call_date", "duration", "location"]
    )
    assert EntityType.PHONE in cols
    assert EntityType.LOCATION in cols
    assert cols[EntityType.PHONE] == ["caller", "callee"]


def test_detect_entity_columns_financial():
    cols = IngestionPipeline._detect_entity_columns(
        ["txn_id", "amount", "account", "beneficiary_name", "date"]
    )
    assert EntityType.ACCOUNT in cols
    assert EntityType.PERSON in cols
    assert EntityType.TRANSACTION in cols


def test_detect_entity_columns_person():
    cols = IngestionPipeline._detect_entity_columns(["name", "phone", "address"])
    assert EntityType.PERSON in cols
    assert EntityType.PHONE in cols
    assert EntityType.LOCATION in cols


def test_detect_id_column():
    assert IngestionPipeline._detect_id_column(["id", "name"]) == "id"
    assert IngestionPipeline._detect_id_column(["txn_id", "amount"]) == "txn_id"
    assert IngestionPipeline._detect_id_column(["name", "phone"]) == "name"


# --- Normalization ---


def test_normalize_name():
    assert IngestionPipeline._normalize_name("  Rahul Kumar  ") == "rahul kumar"
    assert IngestionPipeline._normalize_name("RAHUL  KUMAR") == "rahul kumar"
    assert IngestionPipeline._normalize_name("+91 98765 43210") == "+91 98765 43210"


# --- Relationship type inference ---


def test_infer_relationship_type():
    from app.models import RelationshipType

    assert (
        IngestionPipeline._infer_relationship_type(EntityType.PERSON, EntityType.PHONE)
        == RelationshipType.ASSOCIATED_WITH
    )

    assert (
        IngestionPipeline._infer_relationship_type(EntityType.PERSON, EntityType.PERSON)
        == RelationshipType.KNOWN_ASSOCIATE
    )

    assert (
        IngestionPipeline._infer_relationship_type(EntityType.PERSON, EntityType.ORGANIZATION)
        == RelationshipType.OTHER
    )

    assert (
        IngestionPipeline._infer_relationship_type(EntityType.PERSON, EntityType.ACCOUNT)
        == RelationshipType.OWNS
    )

    assert (
        IngestionPipeline._infer_relationship_type(EntityType.PERSON, EntityType.TRANSACTION)
        == RelationshipType.TRANSACTION
    )


# --- Evidence type inference ---


def test_infer_evidence_type_communication():
    assert (
        IngestionPipeline._infer_evidence_type(["caller", "callee", "duration"], "structured")
        == "COMMUNICATION"
    )


def test_infer_evidence_type_transaction():
    assert (
        IngestionPipeline._infer_evidence_type(["amount", "account", "txn_id"], "structured")
        == "TRANSACTION"
    )


def test_infer_evidence_type_fir():
    assert (
        IngestionPipeline._infer_evidence_type(["fir_number", "accused", "date"], "document")
        == "FIR"
    )


def test_infer_evidence_type_default():
    assert IngestionPipeline._infer_evidence_type(["col_a", "col_b"], "structured") == "RECORD"


# --- Quality score ---


def test_compute_quality_score():
    assert IngestionPipeline._compute_quality_score(0, 0, 0, 0) == 0.0
    score = IngestionPipeline._compute_quality_score(100, 50, 5, 2)
    assert 0.0 <= score <= 1.0
    assert score > 0.5


def test_compute_quality_score_empty():
    score = IngestionPipeline._compute_quality_score(100, 0, 0, 0)
    assert score < 0.7


# --- Full pipeline integration ---


@pytest.mark.anyio
async def test_pipeline_creates_entities_and_relationships(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        result = await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=CDR_CSV,
            file_name="cdr_test.csv",
            created_by="Test",
        )
        await session.commit()

    assert result.records_processed == 4
    assert result.entities_created >= 3  # at least 3 unique phones + locations
    assert result.relationships_created >= 1
    assert result.evidence_created == 4

    async with db_factory() as session:
        entities = (
            (await session.execute(select(Entity).where(Entity.investigation_id == inv_id)))
            .scalars()
            .all()
        )
        phone_entities = [e for e in entities if e.entity_type == EntityType.PHONE]
        assert len(phone_entities) >= 3


@pytest.mark.anyio
async def test_pipeline_sets_job_completed(db_factory):
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
        assert job.status == IngestionJobStatus.COMPLETED
        assert job.progress == 100
        assert job.records_processed == 4


@pytest.mark.anyio
async def test_pipeline_updates_dataset_status(db_factory):
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
        ds = await session.get(Dataset, ds_id)
        assert ds.status == DatasetStatus.READY
        assert ds.record_count == 4
        assert ds.quality_score > 0


@pytest.mark.anyio
async def test_pipeline_creates_evidence_with_provenance(db_factory):
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
        evidence = (
            (
                await session.execute(
                    select(InvestigationEvidence).where(
                        InvestigationEvidence.investigation_id == inv_id
                    )
                )
            )
            .scalars()
            .all()
        )
        # 4 new from CDR_CSV + 4 seeded (ev-001, ev-004, ev-007, ev-009)
        new_evidence = [e for e in evidence if e.metadata_.get("source") == "csv_ingestion"]
        assert len(new_evidence) == 4
        assert all(e.provenance.get("dataset_id") == str(ds_id) for e in new_evidence)


@pytest.mark.anyio
async def test_pipeline_invalid_csv_marks_failed(db_factory):
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
    assert len(result.warnings) > 0

    async with db_factory() as session:
        ds = await session.get(Dataset, ds_id)
        assert ds.status == DatasetStatus.FAILED


@pytest.mark.anyio
async def test_pipeline_deduplicates_entities(db_factory):
    inv_id = await _inv_id(db_factory)
    ds_id = await _create_dataset(db_factory, inv_id)

    csv_content = """name,phone
Rahul Kumar,+919876543210
Rahul Kumar,+919876543210
rahul kumar,+919876543210
"""

    async with db_factory() as session:
        pipeline = IngestionPipeline(session)
        result = await pipeline.run(
            investigation_id=inv_id,
            dataset_id=ds_id,
            file_content=csv_content,
            file_name="dedup_test.csv",
        )
        await session.commit()

    assert result.records_processed == 3
    assert result.entities_created == 2  # 1 person (deduplicated) + 1 phone

    async with db_factory() as session:
        entities = (
            (
                await session.execute(
                    select(Entity).where(
                        Entity.investigation_id == inv_id,
                        Entity.entity_type == EntityType.PERSON,
                    )
                )
            )
            .scalars()
            .all()
        )
        person_names = {e.canonical_name for e in entities}
        # Should have only 1 person entity (rahul kumar deduplicated)
        assert "rahul kumar" in person_names
        assert len([e for e in entities if e.canonical_name == "rahul kumar"]) == 1
