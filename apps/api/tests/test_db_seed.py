"""Integration tests for the relational seed (Phase A — Data Integrity Foundation).

Phase A makes *Operation Trinetra Nexus* the single canonical demonstration
universe in the backend (35 entities / 60 relationships / 3 clusters /
6 findings / 7 evidence / 2 events / 1 note / 7 datasets), deterministically
ported from ``apps/web/src/mock/nexus-dataset.ts``.

These tests exercise the real SQLAlchemy async stack against a throwaway
in-memory SQLite database (portable types make the same models run on
PostgreSQL in production).

Covers:
- full schema creation
- deterministic canonical Nexus seed: exact counts, hub/bridge topology,
  analytics snapshot, evidence chains, dataset inventory
- every foreign-key reference resolves within the seeded universe
- every child row is scoped to the owning investigation (incl. chain rows)
- seeding is idempotent (identical canonical ids -> same rows, no dupes)
- the default seed never creates the legacy Operation Meridian universe
- the legacy Operation Meridian (``inv-006``) fixture still populates via
  ``seed_operation_meridian`` and keeps its historic contract/counts
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.seed import _uuid, seed_database, seed_operation_meridian
from app.models import (
    Base,
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

NEXUS_ENTITY_COUNT = 35
NEXUS_RELATIONSHIP_COUNT = 60
NEXUS_EVIDENCE_COUNT = 7
NEXUS_FINDING_COUNT = 6
NEXUS_EVENT_COUNT = 2
NEXUS_NOTE_COUNT = 1
NEXUS_DATASET_COUNT = 7
NEXUS_JOB_COUNT = 7
NEXUS_CHAIN_ENTRY_COUNT = 14  # two custody actions per evidence item


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


@pytest.fixture
async def meridian_session() -> AsyncSession:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        await seed_operation_meridian(session)
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
        "evidence_chain_entries",
        "network_analytics_snapshots",
        "users",
        "auth_audit_events",
        "candidate_observations",
        "candidate_resolutions",
        "candidate_resolution_audit",
        "ai_config_providers",
        "evidence_understandings",
    }
    assert expected <= table_names
    await engine.dispose()


@pytest.mark.anyio
async def test_seed_populates_canonical_nexus_universe(seeded_session: AsyncSession):
    investigation = (await seeded_session.execute(select(Investigation))).scalar_one()
    assert investigation.title == "Operation Trinetra Nexus"
    assert investigation.status.value == "active"
    assert investigation.priority.value == "high"
    assert investigation.lead_investigator == "Inspector Mehta"
    assert "Analyst Singh" in investigation.assigned_team
    assert investigation.tags == ["fraud", "nexus", "multi-city", "demo"]
    assert investigation.metadata_["network_id"] == "NET-004"
    assert investigation.metadata_["canonical_id"] == "inv-demo-nexus"
    assert investigation.id == _uuid("inv-demo-nexus")

    entities = (await seeded_session.execute(select(Entity))).scalars().all()
    relationships = (await seeded_session.execute(select(Relationship))).scalars().all()
    evidence = (await seeded_session.execute(select(InvestigationEvidence))).scalars().all()
    findings = (await seeded_session.execute(select(InvestigationFinding))).scalars().all()
    events = (await seeded_session.execute(select(InvestigationEvent))).scalars().all()
    notes = (await seeded_session.execute(select(InvestigationNote))).scalars().all()
    datasets = (await seeded_session.execute(select(Dataset))).scalars().all()
    jobs = (await seeded_session.execute(select(IngestionJob))).scalars().all()

    assert len(entities) == NEXUS_ENTITY_COUNT
    assert len(relationships) == NEXUS_RELATIONSHIP_COUNT
    assert len(evidence) == NEXUS_EVIDENCE_COUNT
    assert len(findings) == NEXUS_FINDING_COUNT
    assert len(events) == NEXUS_EVENT_COUNT
    assert len(notes) == NEXUS_NOTE_COUNT
    assert len(datasets) == NEXUS_DATASET_COUNT
    assert len(jobs) == NEXUS_JOB_COUNT

    entity_names = {e.name for e in entities}
    assert "Arjun Kapoor" in entity_names
    assert "Meera Joshi" in entity_names
    assert all(e.metadata_["canonical_id"].startswith("ent-nexus-") for e in entities)
    assert all(r.metadata_["canonical_id"] for r in relationships)

    dataset_names = {d.name for d in datasets}
    assert "FIR Records - Delhi North" in dataset_names
    assert "CDR Extract - Harness Cell" in dataset_names
    assert "Bank SWIFT Trail" in dataset_names
    assert all(d.investigation_id == investigation.id for d in datasets)
    assert all(j.investigation_id == investigation.id for j in jobs)
    assert all(j.status.value == "completed" for j in jobs)


@pytest.mark.anyio
async def test_nexus_hub_and_bridge_topology(seeded_session: AsyncSession):
    """The canonical Nexus graph keeps its hub (Arjun Kapoor, 14 outbound
    links) and its Delhi->Hyderabad bridge (Meera Joshi, 8 outbound links)."""
    hub = _uuid("ent-nexus-person-001")
    bridge = _uuid("ent-nexus-person-005")
    relationships = (await seeded_session.execute(select(Relationship))).scalars().all()
    outbound = {mid: 0 for mid in (hub, bridge)}
    for rel in relationships:
        for mid in (hub, bridge):
            if rel.source_entity_id == mid:
                outbound[mid] += 1
    assert outbound[hub] == 14
    assert outbound[bridge] == 8
    # the bridge also receives one inbound cross-cluster link from the hub
    inbound_to_bridge = sum(
        1 for rel in relationships if rel.target_entity_id == bridge
    )
    assert inbound_to_bridge == 1


@pytest.mark.anyio
async def test_nexus_analytics_snapshot_matches_universe(seeded_session: AsyncSession):
    snapshot = (
        await seeded_session.execute(select(NetworkAnalyticsSnapshot))
    ).scalar_one()
    assert snapshot.investigation_id == _uuid("inv-demo-nexus")
    assert snapshot.entity_count == NEXUS_ENTITY_COUNT
    assert snapshot.relationship_count == NEXUS_RELATIONSHIP_COUNT
    assert snapshot.payload["network_id"] == "NET-004"
    assert snapshot.payload["nodes"] == 35
    assert snapshot.payload["relationships"] == 60
    assert snapshot.payload["connected_components"] == 1
    assert snapshot.payload["community_count"] == 3
    assert snapshot.payload["top_connected_entity"] == "ent-nexus-person-001"
    cluster_ids = {c["id"] for c in snapshot.payload["clusters"]}
    assert cluster_ids == {"cl-nexus-delhi", "cl-nexus-hyd", "cl-nexus-flow"}


@pytest.mark.anyio
async def test_all_relationships_resolve_to_entities(seeded_session: AsyncSession):
    entity_ids = {e.id for e in (await seeded_session.execute(select(Entity))).scalars().all()}
    relationships = (await seeded_session.execute(select(Relationship))).scalars().all()
    assert len(relationships) == NEXUS_RELATIONSHIP_COUNT
    for rel in relationships:
        assert rel.source_entity_id in entity_ids
        assert rel.target_entity_id in entity_ids


@pytest.mark.anyio
async def test_grounded_findings_reference_entities_and_evidence(seeded_session: AsyncSession):
    finding = (
        await seeded_session.execute(
            select(InvestigationFinding).where(
                InvestigationFinding.id == _uuid("inf-nexus-1")
            )
        )
    ).scalar_one()
    assert finding.metadata_["canonical_id"] == "inf-nexus-1"
    assert finding.metadata_["source_type"] == "analysis"
    # entity_refs are the deterministic seeded entity uuids
    assert len(finding.entity_refs) == 1
    assert finding.entity_refs[0] == str(_uuid("ent-nexus-person-001"))
    # edge grounding: hub finding cites the CDR extract evidence
    assert finding.metadata_["evidence_ids"] == [str(_uuid("ev-nexus-002"))]
    assert "hub" in finding.metadata_["tags"]


@pytest.mark.anyio
async def test_nexus_evidence_chains_are_seeded_and_scoped(seeded_session: AsyncSession):
    entries = (await seeded_session.execute(select(EvidenceChainEntry))).scalars().all()
    assert len(entries) == NEXUS_CHAIN_ENTRY_COUNT
    iid = _uuid("inv-demo-nexus")
    for entry in entries:
        assert entry.investigation_id == iid
        assert entry.action.value in {
            "evidence_created",
            "evidence_verified",
            "evidence_uploaded",
            "evidence_accessed",
            "evidence_exported",
            "evidence_metadata_updated",
        }


@pytest.mark.anyio
async def test_all_children_scoped_to_seeded_investigation(seeded_session: AsyncSession):
    investigation = (await seeded_session.execute(select(Investigation))).scalar_one()
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
        EvidenceChainEntry,
        NetworkAnalyticsSnapshot,
    ):
        rows = (await seeded_session.execute(select(model))).scalars().all()
        assert rows, f"{model.__tablename__} is empty"
        for row in rows:
            assert row.investigation_id == iid, f"{model.__tablename__} row escapes scope"


@pytest.mark.anyio
async def test_seed_is_reproducible(seeded_session: AsyncSession):
    texts = [
        e.canonical_name for e in (await seeded_session.execute(select(Entity))).scalars().all()
    ]
    assert "arjun kapoor" in texts
    assert "meera joshi" in texts
    assert "bluesky trading solutions" in texts


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
            (
                await session.execute(
                    select(Investigation).where(
                        Investigation.title == "Operation Trinetra Nexus"
                    )
                )
            )
            .scalar_one()
            .id
        )

    async with factory() as session:
        await seed_database(session)  # second call: idempotent no-op
        await session.commit()
        entities = (await session.execute(select(Entity))).scalars().all()
        datasets = (await session.execute(select(Dataset))).scalars().all()
        jobs = (await session.execute(select(IngestionJob))).scalars().all()
        assert all(e.investigation_id == inv_id for e in entities)
        assert all(d.investigation_id == inv_id for d in datasets)
        assert len(jobs) == NEXUS_JOB_COUNT
        assert len(entities) == NEXUS_ENTITY_COUNT
        # forced re-seed replaces all children under the same investigation
        await seed_database(session, force=True)
        await session.commit()
        entities_after = (await session.execute(select(Entity))).scalars().all()
        datasets_after = (await session.execute(select(Dataset))).scalars().all()
        jobs_after = (await session.execute(select(IngestionJob))).scalars().all()
        assert len(entities_after) == NEXUS_ENTITY_COUNT
        assert len(datasets_after) == NEXUS_DATASET_COUNT
        assert len(jobs_after) == NEXUS_JOB_COUNT
        assert all(e.investigation_id == inv_id for e in entities_after)

    await engine.dispose()


@pytest.mark.anyio
async def test_default_seed_never_creates_meridian(seeded_session: AsyncSession):
    """Operation Meridian (inv-006) is a separate fixture and is not part of the
    canonical presentation seed."""
    meridian = await seeded_session.get(Investigation, _uuid("inv-006"))
    assert meridian is None
    titles = {
        i.title
        for i in (await seeded_session.execute(select(Investigation))).scalars().all()
    }
    assert titles == {"Operation Trinetra Nexus"}


@pytest.mark.anyio
async def test_operation_meridian_fixture_preserves_legacy_contract(
    meridian_session: AsyncSession,
):
    investigation = (
        await meridian_session.execute(
            select(Investigation).where(Investigation.id == _uuid("inv-006"))
        )
    ).scalar_one()
    assert investigation.title == "Operation Meridian"
    assert investigation.status.value == "active"
    assert investigation.priority.value == "high"

    entities = (await meridian_session.execute(select(Entity))).scalars().all()
    relationships = (await meridian_session.execute(select(Relationship))).scalars().all()
    evidence = (
        await meridian_session.execute(select(InvestigationEvidence))
    ).scalars().all()
    findings = (await meridian_session.execute(select(InvestigationFinding))).scalars().all()
    events = (await meridian_session.execute(select(InvestigationEvent))).scalars().all()
    notes = (await meridian_session.execute(select(InvestigationNote))).scalars().all()
    datasets = (await meridian_session.execute(select(Dataset))).scalars().all()
    jobs = (await meridian_session.execute(select(IngestionJob))).scalars().all()

    assert len(entities) == 6
    assert len(relationships) == 4
    assert len(evidence) == 4
    assert len(findings) == 2
    assert len(events) == 3
    assert len(notes) == 1
    assert len(datasets) == 3
    assert len(jobs) == 3

    names = {e.name for e in entities}
    assert names == {
        "Rahul Kumar",
        "Mumbai Trading Corp",
        "Vikram Patel",
        "7731 0029 4567",
        "TXN-2026-0482",
        "+91 98765 43210",
    }
    for row in entities:
        assert row.metadata_["demo_universe"] == "meridian"
        assert row.metadata_["is_fixture"] is True
