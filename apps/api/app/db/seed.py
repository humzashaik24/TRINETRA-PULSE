"""Deterministic seed data for the Trinetra Pulse relational database.

Phase 14.2 converts the Operation Meridian demo universe (inv-006) into real
database rows. We reuse the existing deterministic mock data as the source of
truth so the operation meridian journey stays faithful to the demo:

- one investigation (Operation Meridian)
- entities, relationships, findings, evidence, events and a note

Every foreign-key reference resolves correctly within the seeded dataset.

IDs are deterministic ``uuid5`` values derived from the canonical demo ids
(e.g. ``inv-006``), so re-seeding is stable and reproducible.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Dataset,
    DatasetStatus,
    Entity,
    EntityType,
    FindingConfidence,
    FindingSeverity,
    FindingStatus,
    IngestionJob,
    IngestionJobStatus,
    Investigation,
    InvestigationEvent,
    InvestigationEvidence,
    InvestigationFinding,
    InvestigationNote,
    InvestigationPriority,
    InvestigationStatus,
    Relationship,
    RelationshipType,
    VerificationStatus,
)


def _uuid(canonical_id: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"trinetra::{canonical_id}")


def _utc(iso_str: str) -> datetime:
    return datetime.fromisoformat(iso_str.replace("Z", "+00:00"))


def _seed_investigation(
    session: AsyncSession,
) -> Investigation:
    investigation = Investigation(
        id=_uuid("inv-006"),
        title="Operation Meridian",
        description=(
            "Documented import coordination probe linking the flagged firm "
            "Meridian Freight to the canonical import network. Demonstration "
            "dataset — deterministic demo data."
        ),
        status=InvestigationStatus.ACTIVE,
        priority=InvestigationPriority.HIGH,
        lead_investigator="Inspector Mehta",
        assigned_team=["Inspector Mehta", "Analyst Singh"],
        tags=["import", "meridian", "demo"],
        started_at=_utc("2026-08-18T09:00:00Z"),
        closed_at=None,
        metadata_={"canonical_id": "inv-006", "is_demo": True},
    )
    session.add(investigation)
    return investigation


def _seed_entities(
    session: AsyncSession, investigation_id: uuid.UUID
) -> dict[str, Entity]:
    """Seed the canonical entities referenced by inv-006, keyed by canonical id."""

    def ent(
        cid: str,
        etype: EntityType,
        name: str,
        canonical_name: str,
        description: str,
        confidence: float,
        attributes: dict,
        verified: bool,
        flagged: bool,
    ) -> Entity:
        e = Entity(
            id=_uuid(cid),
            investigation_id=investigation_id,
            entity_type=etype,
            canonical_name=canonical_name,
            name=name,
            description=description,
            attributes=attributes,
            confidence=confidence,
            is_verified=verified,
            is_flagged=flagged,
            metadata_={"canonical_id": cid, "is_demo": True},
        )
        session.add(e)
        return e

    entities = {
        "ent-person-001": ent(
            "ent-person-001",
            EntityType.PERSON,
            "Rahul Kumar",
            "rahul kumar",
            "Individual connected to FIR-2026-001; flagged for financial impropriety review.",
            0.95,
            {
                "full_name": "Rahul Kumar",
                "phone": "+91 98765 43210",
                "alternate_phone": "+91 99212 55667",
                "email": "rahul.kumar@example.net",
                "date_of_birth": "1988-04-12",
                "address": "42, Nungambakkam High Rd, Chennai",
                "location": "Chennai",
                "id_number": "PAN AAKPK6612M",
            },
            verified=True,
            flagged=True,
        ),
        "ent-org-001": ent(
            "ent-org-001",
            EntityType.ORGANIZATION,
            "Mumbai Trading Corp",
            "mumbai trading corp",
            "Trading firm at center of transaction analysis.",
            0.91,
            {
                "legal_name": "Mumbai Trading Corporation Pvt Ltd",
                "gstin": "27AAACM1234F1Z5",
                "address": "118 Nariman Point, Mumbai",
                "location": "Mumbai",
            },
            verified=True,
            flagged=True,
        ),
        "ent-person-003": ent(
            "ent-person-003",
            EntityType.PERSON,
            "Vikram Patel",
            "vikram patel",
            "Associate linked to vehicle tracking records and communication spikes.",
            0.84,
            {
                "full_name": "Vikram Patel",
                "phone": "+91 98111 22334",
                "address": "Old Poona Rd, Pune",
                "location": "Pune",
                "organization": "Global Imports Ltd",
            },
            verified=False,
            flagged=True,
        ),
        "ent-account-001": ent(
            "ent-account-001",
            EntityType.ACCOUNT,
            "7731 0029 4567",
            "773100294567",
            "HDFC account linked to transaction analysis.",
            0.96,
            {
                "account_number": "773100294567",
                "bank": "HDFC Bank",
                "ifsc": "HDFC0001122",
                "holder": "Rahul Kumar",
            },
            verified=True,
            flagged=False,
        ),
        "ent-txn-001": ent(
            "ent-txn-001",
            EntityType.TRANSACTION,
            "TXN-2026-0482",
            "TXN-2026-0482",
            "Suspicious transfer from account 7731 to corporate account.",
            0.97,
            {
                "transaction_id": "TXN-2026-0482",
                "amount": "₹4,80,000",
                "date": "2026-02-14",
                "from_account": "773100294567",
                "to_account": "884511900221",
                "location": "Pune",
            },
            verified=True,
            flagged=False,
        ),
        "ent-phone-001": ent(
            "ent-phone-001",
            EntityType.PHONE,
            "+91 98765 43210",
            "919876543210",
            "Primary device linked to Rahul Kumar in CDR extracts.",
            0.98,
            {
                "phone_number": "+91 98765 43210",
                "carrier": "Airtel",
                "holder": "Rahul Kumar",
                "imei": "351234567890123",
            },
            verified=True,
            flagged=False,
        ),
    }
    return entities


def _seed_relationships(
    session: AsyncSession,
    investigation_id: uuid.UUID,
    entities: dict[str, Entity],
) -> list[Relationship]:
    rels = [
        Relationship(
            id=_uuid("rel-001"),
            investigation_id=investigation_id,
            source_entity_id=entities["ent-person-001"].id,
            target_entity_id=entities["ent-phone-001"].id,
            relationship_type=RelationshipType.ASSOCIATED_WITH,
            confidence=0.98,
            source="CDR Extract - Operation clean",
            evidence_refs=["cdr_extract.csv #2241", "Bank Transaction Log"],
            verification_status=VerificationStatus.CONFIRMED,
            description="Subscriber link between person of interest and primary device.",
        ),
        Relationship(
            id=_uuid("rel-003"),
            investigation_id=investigation_id,
            source_entity_id=entities["ent-person-001"].id,
            target_entity_id=entities["ent-person-003"].id,
            relationship_type=RelationshipType.KNOWN_ASSOCIATE,
            confidence=0.74,
            source="CDR Extract - Operation clean",
            evidence_refs=["cdr_extract.csv frequency cluster 7"],
            verification_status=VerificationStatus.PROBABLE,
            description="KNOWS link based on a single source record.",
        ),
        Relationship(
            id=_uuid("rel-005"),
            investigation_id=investigation_id,
            source_entity_id=entities["ent-person-001"].id,
            target_entity_id=entities["ent-org-001"].id,
            relationship_type=RelationshipType.OTHER,
            confidence=0.93,
            source="FIR Records - Pune District",
            evidence_refs=["FIR-2026-001 / R2"],
            verification_status=VerificationStatus.CONFIRMED,
            description="Company association (WORKS_FOR).",
        ),
        Relationship(
            id=_uuid("rel-008"),
            investigation_id=investigation_id,
            source_entity_id=entities["ent-person-001"].id,
            target_entity_id=entities["ent-txn-001"].id,
            relationship_type=RelationshipType.TRANSACTION,
            confidence=0.99,
            source="Bank Transaction Log",
            evidence_refs=["transactions_flagged_aug2026.xlsx row 132"],
            verification_status=VerificationStatus.CONFIRMED,
            description="SENT_TRANSACTION flagged transfer.",
        ),
    ]
    for r in rels:
        r.metadata_ = {"is_demo": True}
        session.add(r)
    return rels


def _seed_evidence(
    session: AsyncSession, investigation_id: uuid.UUID
) -> list[InvestigationEvidence]:
    items = [
        InvestigationEvidence(
            id=_uuid("ev-001"),
            investigation_id=investigation_id,
            evidence_type="FIR",
            title="FIR record — named accused",
            description=(
                "FIR-2026-001 names Rahul Kumar in connection with the offense. "
                "Foundational document for Operation Meridian."
            ),
            source="FIR Records - Pune District",
            provenance={
                "source": "FIR Records - Pune District",
                "source_id": "FIR-2026-001 / R2",
                "document_id": "ent-doc-001",
                "confidence": 0.97,
            },
            collected_at=_utc("2026-08-18T09:15:00Z"),
            storage_ref=None,
            metadata_={
                "canonical_id": "ev-001",
                "dataset_id": "ds-001",
                "record_identifier": "FIR-2026-001",
                "is_demo": True,
            },
        ),
        InvestigationEvidence(
            id=_uuid("ev-004"),
            investigation_id=investigation_id,
            evidence_type="COMMUNICATION",
            title="CDR subscriber records",
            description="Subscriber details align with Rahul Kumar across extracts.",
            source="CDR Extract - Operation clean",
            provenance={
                "source": "CDR Extract - Operation clean",
                "source_id": "cdr_extract.csv #2241",
                "confidence": 0.95,
            },
            collected_at=_utc("2026-08-19T09:20:00Z"),
            storage_ref=None,
            metadata_={
                "canonical_id": "ev-004",
                "dataset_id": "ds-002",
                "record_identifier": "CDR-2241",
                "is_demo": True,
            },
        ),
        InvestigationEvidence(
            id=_uuid("ev-007"),
            investigation_id=investigation_id,
            evidence_type="RECORD",
            title="GST registration",
            description="GSTIN 27AAACM1234F1Z5 resolved to Mumbai Trading Corporation Pvt Ltd.",
            source="FIR Records - Pune District",
            provenance={
                "source": "GST Registry Extract",
                "source_id": "gst_registry.json #MTC-001",
                "confidence": 0.9,
            },
            collected_at=_utc("2026-08-20T10:00:00Z"),
            storage_ref=None,
            metadata_={
                "canonical_id": "ev-007",
                "dataset_id": "ds-005",
                "record_identifier": "GST-MTC-001",
                "is_demo": True,
            },
        ),
        InvestigationEvidence(
            id=_uuid("ev-009"),
            investigation_id=investigation_id,
            evidence_type="TRANSACTION",
            title="Flagged transaction record",
            description="Transfer of ₹4,80,000 flagged by threshold analytics.",
            source="Bank Transaction Log",
            provenance={
                "source": "Bank Transaction Log",
                "source_id": "transactions_flagged_aug2026.xlsx row 132",
                "confidence": 0.99,
            },
            collected_at=_utc("2026-08-20T11:00:00Z"),
            storage_ref=None,
            metadata_={
                "canonical_id": "ev-009",
                "dataset_id": "ds-003",
                "record_identifier": "TXN-2026-0482",
                "is_demo": True,
            },
        ),
    ]
    for it in items:
        session.add(it)
    return items


def _seed_findings(
    session: AsyncSession,
    investigation_id: uuid.UUID,
    entities: dict[str, Entity],
    evidence: list[InvestigationEvidence],
) -> list[InvestigationFinding]:
    ev_by_cid = {e.metadata_.get("canonical_id"): e for e in evidence}
    findings = [
        InvestigationFinding(
            id=_uuid("inf-006-1"),
            investigation_id=investigation_id,
            title="Coordinate cluster around the primary device",
            description=(
                "Multiple source records associate the primary device with the "
                "person of interest across the probe window."
            ),
            severity=FindingSeverity.MEDIUM,
            confidence=FindingConfidence.INFERRED,
            status=FindingStatus.OPEN,
            entity_refs=[
                str(entities["ent-person-001"].id),
                str(entities["ent-phone-001"].id),
            ],
            metadata_={
                "canonical_id": "inf-006-1",
                "evidence_ids": [str(ev_by_cid["ev-004"].id)],
                "tags": ["cdr", "association"],
                "is_demo": True,
            },
        ),
        InvestigationFinding(
            id=_uuid("inf-006-2"),
            investigation_id=investigation_id,
            title="Shared company relationship observed",
            description=(
                "Person of interest and linked person share a company "
                "association across records."
            ),
            severity=FindingSeverity.LOW,
            confidence=FindingConfidence.OBSERVED,
            status=FindingStatus.OPEN,
            entity_refs=[
                str(entities["ent-person-001"].id),
                str(entities["ent-org-001"].id),
                str(entities["ent-person-003"].id),
            ],
            metadata_={
                "canonical_id": "inf-006-2",
                "evidence_ids": [str(ev_by_cid["ev-007"].id)],
                "tags": ["company"],
                "is_demo": True,
            },
        ),
    ]
    for f in findings:
        session.add(f)
    return findings


def _seed_events(
    session: AsyncSession, investigation_id: uuid.UUID
) -> list[InvestigationEvent]:
    events = [
        InvestigationEvent(
            id=_uuid("event-001"),
            investigation_id=investigation_id,
            event_type="meeting",
            timestamp=_utc("2026-02-19T18:40:00Z"),
            location="Chennai",
            description=(
                "Multiple target devices co-located; consistent with a "
                "coordination meeting."
            ),
            metadata_={"canonical_id": "event-001", "is_demo": True},
        ),
        InvestigationEvent(
            id=_uuid("event-002"),
            investigation_id=investigation_id,
            event_type="transaction",
            timestamp=_utc("2026-02-14T11:05:00Z"),
            location="Pune",
            description="₹4,80,000 transferred to corporate account 884511900221.",
            metadata_={"canonical_id": "event-002", "is_demo": True},
        ),
        InvestigationEvent(
            id=_uuid("event-003"),
            investigation_id=investigation_id,
            event_type="case_event",
            timestamp=_utc("2026-02-05T09:00:00Z"),
            location=None,
            description="Recorded as named individual in case proceedings.",
            metadata_={"canonical_id": "event-003", "is_demo": True},
        ),
    ]
    for e in events:
        session.add(e)
    return events


def _seed_notes(
    session: AsyncSession, investigation_id: uuid.UUID
) -> list[InvestigationNote]:
    notes = [
        InvestigationNote(
            id=_uuid("inn-006-1"),
            investigation_id=investigation_id,
            content=(
                "Demo journey anchor: verify the end-to-end lifecycle from "
                "datasets to AI for the SIH demonstration."
            ),
            author="Inspector Mehta",
            metadata_={"canonical_id": "inn-006-1", "is_demo": True},
        )
    ]
    session.add(notes[0])
    return notes


def _seed_datasets(
    session: AsyncSession, investigation_id: uuid.UUID
) -> list[Dataset]:
    """Seed canonical datasets referenced by Operation Meridian."""
    datasets = [
        Dataset(
            id=_uuid("ds-001"),
            investigation_id=investigation_id,
            name="FIR Records",
            description="First Information Report records from Pune District",
            source_name="FIR Records - Pune District",
            format="csv",
            category="document",
            status=DatasetStatus.READY,
            record_count=45,
            file_size=52400,
            file_name="fir_records_pune.csv",
            quality_score=0.92,
            warnings=0,
            errors=0,
            duplicates=0,
            metadata_={"canonical_id": "ds-001", "is_demo": True},
        ),
        Dataset(
            id=_uuid("ds-002"),
            investigation_id=investigation_id,
            name="CDR Extract - Operation clean",
            description="Call detail records from Operation clean extraction",
            source_name="CDR Extract - Operation clean",
            format="csv",
            category="structured",
            status=DatasetStatus.READY,
            record_count=3200,
            file_size=284000,
            file_name="cdr_extract_clean.csv",
            quality_score=0.88,
            warnings=1,
            errors=0,
            duplicates=3,
            metadata_={"canonical_id": "ds-002", "is_demo": True},
        ),
        Dataset(
            id=_uuid("ds-003"),
            investigation_id=investigation_id,
            name="Bank Transaction Log",
            description="Flagged bank transaction records from threshold analytics",
            source_name="Bank Transaction Log",
            format="xlsx",
            category="structured",
            status=DatasetStatus.READY,
            record_count=128,
            file_size=42000,
            file_name="transactions_flagged_aug2026.xlsx",
            quality_score=0.95,
            warnings=0,
            errors=0,
            duplicates=0,
            metadata_={"canonical_id": "ds-003", "is_demo": True},
        ),
    ]
    for ds in datasets:
        session.add(ds)
    return datasets


def _seed_ingestion_jobs(
    session: AsyncSession,
    investigation_id: uuid.UUID,
    datasets: list[Dataset],
) -> list[IngestionJob]:
    """Seed ingestion jobs for the seeded datasets."""
    jobs = []
    for ds in datasets:
        job = IngestionJob(
            id=_uuid(f"ing-{ds.metadata_.get('canonical_id', ds.id)}"),
            investigation_id=investigation_id,
            dataset_id=ds.id,
            status=IngestionJobStatus.COMPLETED,
            progress=100,
            records_processed=ds.record_count,
            entities_extracted=ds.record_count // 2,
            candidates_created=ds.record_count // 3,
            matches_found=ds.record_count // 5,
            errors_list=[],
            warnings_list=[],
            created_by="Inspector Mehta",
            metadata_={"is_demo": True},
        )
        session.add(job)
        jobs.append(job)
    return jobs


async def seed_database(
    session: AsyncSession, *, force: bool = False
) -> None:
    """Populate the database with the Operation Meridian demo universe.

    Idempotent: if the Operation Meridian investigation already exists the
    seeding is a no-op, unless ``force=True`` (which clears existing child
    rows first). Raises after flushing the inserts so callers can commit.
    """
    existing = await session.get(Investigation, _uuid("inv-006"))
    if existing is not None:
        if not force:
            return
        await cleanup_seed_investigation(session)

    investigation = _seed_investigation(session)

    entities = _seed_entities(session, investigation.id)
    relationships = _seed_relationships(session, investigation.id, entities)
    evidence = _seed_evidence(session, investigation.id)
    findings = _seed_findings(session, investigation.id, entities, evidence)
    events = _seed_events(session, investigation.id)
    notes = _seed_notes(session, investigation.id)
    datasets = _seed_datasets(session, investigation.id)
    _seed_ingestion_jobs(session, investigation.id, datasets)

    _ = (relationships, findings, events, notes)

    await session.flush()


async def cleanup_seed_investigation(session: AsyncSession) -> None:
    """Delete all seeded child rows for the Operation Meridian investigation."""
    from sqlalchemy import delete

    investigation_id = _uuid("inv-006")
    for model in (
        IngestionJob,
        Dataset,
        Entity,
        Relationship,
        InvestigationEvidence,
        InvestigationFinding,
        InvestigationEvent,
        InvestigationNote,
    ):
        await session.execute(
            delete(model).where(model.investigation_id == investigation_id)
        )
    await session.execute(delete(Investigation).where(Investigation.id == investigation_id))
    await session.flush()

async def _run() -> None:
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.config import get_settings
    from app.models import Base

    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        await seed_database(session, force=True)
        await session.commit()
    await engine.dispose()
    print("Seeded Operation Meridian (inv-006).")


if __name__ == "__main__":
    import asyncio

    asyncio.run(_run())
