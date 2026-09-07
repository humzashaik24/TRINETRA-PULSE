"""Integration tests for the relational seed (Phase 14.2).

These tests exercise the real SQLAlchemy async stack against a throwaway
in-memory SQLite database (portable types make the same models run on
PostgreSQL in production).

Covers:
- full schema creation (16 tables)
- deterministic Operation Meridian seed: investigation + entities +
  relationships + evidence + findings + events + notes + datasets +
  ingestion jobs
- every foreign-key reference resolves within the seeded universe
- seeding is idempotent (identical canonical ids -> same rows, no dupes)
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.seed import seed_database
from app.models import (
    Base,
    Dataset,
    Entity,
    IngestionJob,
    Investigation,
    InvestigationEvent,
    InvestigationEvidence,
    InvestigationFinding,
    InvestigationNote,
    Relationship,
)


@pytest.fixture
async def seeded_session() -> AsyncSession:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        await seed_database(session)
        await session.commit()
        yield session
    await engine.dispose()


@pytest.mark.anyio
async def test_schema_creates_expected_tables():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    table_names = set(Base.metadata.tables.keys())
    expected = {
        "investigations",
        "entities",
        "relationships",
        "findings",
        "evidence",
        "events",
        "investigation_notes",
        "cases",
        "case_evidence",
        "data_provenance",
        "entity_resolutions",
        "evidence_entity_links",
        "incidents",
        "data_sources",
        "datasets",
        "ingestion_jobs",
    }
    assert expected <= table_names
    await engine.dispose()


@pytest.mark.anyio
async def test_seed_populates_operation_meridian(seeded_session: AsyncSession):
    investigation = (
        await seeded_session.execute(select(Investigation))
    ).scalar_one()
    assert investigation.title == "Operation Meridian"
    assert investigation.status.value == "active"
    assert investigation.priority.value == "high"
    assert investigation.lead_investigator == "Inspector Mehta"
    assert "Analyst Singh" in investigation.assigned_team
    assert investigation.tags == ["import", "meridian", "demo"]

    entities = (await seeded_session.execute(select(Entity))).scalars().all()
    relationships = (
        await seeded_session.execute(select(Relationship))
    ).scalars().all()
    evidence = (
        await seeded_session.execute(select(InvestigationEvidence))
    ).scalars().all()
    findings = (
        await seeded_session.execute(select(InvestigationFinding))
    ).scalars().all()
    events = (
        await seeded_session.execute(select(InvestigationEvent))
    ).scalars().all()
    notes = (
        await seeded_session.execute(select(InvestigationNote))
    ).scalars().all()
    datasets = (
        await seeded_session.execute(select(Dataset))
    ).scalars().all()
    jobs = (
        await seeded_session.execute(select(IngestionJob))
    ).scalars().all()

    assert len(entities) == 6
    assert len(relationships) == 4
    assert len(evidence) == 4
    assert len(findings) == 2
    assert len(events) == 3
    assert len(notes) == 1
    assert len(datasets) == 3
    assert len(jobs) == 3

    dataset_names = {d.name for d in datasets}
    assert dataset_names == {
        "FIR Records",
        "CDR Extract - Operation clean",
        "Bank Transaction Log",
    }
    assert all(d.investigation_id == investigation.id for d in datasets)
    assert all(j.dataset_id in {d.id for d in datasets} for j in jobs)
    assert all(j.status.value == "completed" for j in jobs)

    names = {e.name for e in entities}
    assert names == {
        "Rahul Kumar",
        "Mumbai Trading Corp",
        "Vikram Patel",
        "7731 0029 4567",
        "TXN-2026-0482",
        "+91 98765 43210",
    }


@pytest.mark.anyio
async def test_all_relationships_resolve_to_entities(seeded_session: AsyncSession):
    entity_ids = {
        e.id
        for e in (await seeded_session.execute(select(Entity))).scalars().all()
    }
    relationships = (
        await seeded_session.execute(select(Relationship))
    ).scalars().all()
    assert relationships
    for rel in relationships:
        assert rel.source_entity_id in entity_ids
        assert rel.target_entity_id in entity_ids


@pytest.mark.anyio
async def test_all_children_scoped_to_seeded_investigation(
    seeded_session: AsyncSession,
):
    investigation = (
        await seeded_session.execute(select(Investigation))
    ).scalar_one()
    iid = investigation.id
    for model in (
        Entity,
        Relationship,
        InvestigationEvidence,
        InvestigationFinding,
        InvestigationEvent,
        InvestigationNote,
        Dataset,
        IngestionJob,
    ):
        rows = (await seeded_session.execute(select(model))).scalars().all()
        assert rows, f"{model.__tablename__} is empty"
        for row in rows:
            assert row.investigation_id == iid


@pytest.mark.anyio
async def test_seed_is_reproducible(seeded_session: AsyncSession):
    texts = [
        e.canonical_name
        for e in (await seeded_session.execute(select(Entity))).scalars().all()
    ]
    assert "rahul kumar" in texts
    assert "mumbai trading corp" in texts
    assert "vikram patel" in texts


@pytest.mark.anyio
async def test_seed_is_idempotent():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as session:
        await seed_database(session)
        await session.commit()
        inv_id = (
            await session.execute(
                select(Investigation).where(Investigation.title == "Operation Meridian")
            )
        ).scalar_one().id

    async with factory() as session:
        await seed_database(session)  # second call: idempotent no-op
        await session.commit()
        entities = (await session.execute(select(Entity))).scalars().all()
        datasets = (await session.execute(select(Dataset))).scalars().all()
        jobs = (await session.execute(select(IngestionJob))).scalars().all()
        assert all(e.investigation_id == inv_id for e in entities)
        assert all(d.investigation_id == inv_id for d in datasets)
        assert len(jobs) == 3
        # forced re-seed replaces all children under the same investigation
        await seed_database(session, force=True)
        await session.commit()
        entities_after = (await session.execute(select(Entity))).scalars().all()
        assert len(entities_after) == 6
        datasets_after = (await session.execute(select(Dataset))).scalars().all()
        jobs_after = (await session.execute(select(IngestionJob))).scalars().all()
        assert len(datasets_after) == 3
        assert len(jobs_after) == 3

    await engine.dispose()
