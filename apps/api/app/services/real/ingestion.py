"""CSV ingestion pipeline — parse, extract entities, build relationships, persist."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import InvestigationNotFoundError, NotFoundError
from app.intelligence.csv_reader import CsvIntelligenceError, parse_csv
from app.models import (
    DataProvenance,
    DatasetStatus,
    Entity,
    EntityType,
    IngestionJob,
    IngestionJobStatus,
    InvestigationEvent,
    InvestigationEvidence,
    ProvenanceSourceType,
    Relationship,
    RelationshipType,
)
from app.repositories.dataset import (
    DataProvenanceRepository,
    DatasetRepository,
    IngestionJobRepository,
)
from app.repositories.investigation import InvestigationRepository


@dataclass
class IngestionResult:
    dataset_id: str
    job_id: str
    records_processed: int
    entities_created: int
    relationships_created: int
    evidence_created: int
    provenance_created: int
    events_created: int
    duplicates_skipped: int
    warnings: list[str] = field(default_factory=list)


# --- Entity column detection heuristics ---

PERSON_KEYWORDS = ("name", "person", "individual", "suspect", "accused", "witness", "subscriber")
PHONE_KEYWORDS = ("phone", "mobile", "msisdn", "telephone", "contact", "caller", "callee")
VEHICLE_KEYWORDS = ("vehicle", "car", "registration", "licence", "license", "plate", "rc_")
LOCATION_KEYWORDS = (
    "location", "address", "city", "district",
    "place", "lat", "lng", "tower", "cell",
)
ORG_KEYWORDS = ("organization", "company", "firm", "entity_name", "org", "gstin")
ACCOUNT_KEYWORDS = ("account", "bank", "ifsc", "upi")
TXN_KEYWORDS = ("transaction", "amount", "txn", "transfer", "payment", "debit", "credit")

ENTITY_KEYWORD_MAP: dict[EntityType, tuple[str, ...]] = {
    EntityType.PERSON: PERSON_KEYWORDS,
    EntityType.PHONE: PHONE_KEYWORDS,
    EntityType.VEHICLE: VEHICLE_KEYWORDS,
    EntityType.LOCATION: LOCATION_KEYWORDS,
    EntityType.ORGANIZATION: ORG_KEYWORDS,
    EntityType.ACCOUNT: ACCOUNT_KEYWORDS,
    EntityType.TRANSACTION: TXN_KEYWORDS,
}

ID_COLUMN_HINTS = ("id", "record", "fir", "case", "number", "ref")


class IngestionPipeline:
    """End-to-end CSV ingestion: parse → extract → persist."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.investigations = InvestigationRepository(session)
        self.datasets = DatasetRepository(session)
        self.jobs = IngestionJobRepository(session)
        self.provenance = DataProvenanceRepository(session)

    # ------------------------------------------------------------------
    # Entity column heuristics
    # ------------------------------------------------------------------

    @staticmethod
    def _matches_keywords(col_name: str, keywords: tuple[str, ...]) -> bool:
        lower = col_name.lower().replace(" ", "_")
        return any(kw in lower for kw in keywords)

    @classmethod
    def _detect_entity_columns(cls, headers: list[str]) -> dict[EntityType, list[str]]:
        result: dict[EntityType, list[str]] = {}
        for etype, keywords in ENTITY_KEYWORD_MAP.items():
            matched = [h for h in headers if cls._matches_keywords(h, keywords)]
            if matched:
                result[etype] = matched
        return result

    @classmethod
    def _detect_id_column(cls, headers: list[str]) -> str | None:
        for h in headers:
            if any(hint in h.lower() for hint in ID_COLUMN_HINTS):
                return h
        return headers[0] if headers else None

    # ------------------------------------------------------------------
    # Normalization
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_name(raw: str) -> str:
        return re.sub(r"\s+", " ", raw.strip().lower())

    # ------------------------------------------------------------------
    # Entity extraction
    # ------------------------------------------------------------------

    async def _find_or_create_entity(
        self,
        canonical_name: str,
        entity_type: EntityType,
        investigation_id: UUID,
        source: str,
        raw_value: str,
        confidence: float = 0.75,
    ) -> Entity:
        normalized = self._normalize_name(canonical_name)
        result = await self.session.execute(
            select(Entity).where(
                Entity.investigation_id == investigation_id,
                Entity.canonical_name == normalized,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        entity = Entity(
            investigation_id=investigation_id,
            entity_type=entity_type,
            canonical_name=normalized,
            name=raw_value.strip(),
            confidence=confidence,
            attributes={"source_column": source, "raw_value": raw_value},
            metadata_={"source": "csv_ingestion", "source_column": source},
        )
        self.session.add(entity)
        await self.session.flush()
        return entity

    # ------------------------------------------------------------------
    # Relationship creation
    # ------------------------------------------------------------------

    async def _find_or_create_relationship(
        self,
        source_entity: Entity,
        target_entity: Entity,
        relationship_type: RelationshipType,
        investigation_id: UUID,
        source_name: str,
        record_id: str | None = None,
        confidence: float = 0.7,
    ) -> Relationship:
        result = await self.session.execute(
            select(Relationship).where(
                Relationship.investigation_id == investigation_id,
                Relationship.source_entity_id == source_entity.id,
                Relationship.target_entity_id == target_entity.id,
                Relationship.relationship_type == relationship_type,
            )
        )
        existing_rel = result.scalar_one_or_none()
        if existing_rel:
            return existing_rel

        rel = Relationship(
            investigation_id=investigation_id,
            source_entity_id=source_entity.id,
            target_entity_id=target_entity.id,
            relationship_type=relationship_type,
            confidence=confidence,
            source=source_name,
            evidence_refs=[f"{source_name} row {record_id}"] if record_id else [],
            description=f"{relationship_type.value} relationship from CSV import",
            metadata_={"source": "csv_ingestion", "source_name": source_name},
        )
        self.session.add(rel)
        await self.session.flush()
        return rel

    # ------------------------------------------------------------------
    # Evidence creation
    # ------------------------------------------------------------------

    async def _create_evidence(
        self,
        investigation_id: UUID,
        title: str,
        evidence_type: str,
        source_name: str,
        record_id: str | None,
        row_data: dict,
        dataset_id: UUID,
    ) -> InvestigationEvidence:
        evidence = InvestigationEvidence(
            investigation_id=investigation_id,
            evidence_type=evidence_type,
            title=title,
            description=f"Record imported from {source_name}",
            source=source_name,
            provenance={
                "source": source_name,
                "source_id": record_id,
                "dataset_id": str(dataset_id),
                "confidence": 0.85,
            },
            collected_at=datetime.now(UTC),
            metadata_={
                "source": "csv_ingestion",
                "source_name": source_name,
                "record_identifier": record_id,
                "dataset_id": str(dataset_id),
            },
        )
        self.session.add(evidence)
        await self.session.flush()
        return evidence

    # ------------------------------------------------------------------
    # Provenance creation (Phase 17.1)
    # ------------------------------------------------------------------

    async def _create_entity_provenance(
        self,
        entity: Entity,
        investigation_id: UUID,
        dataset_id: UUID,
        job_id: UUID,
        source_name: str,
        checksum: str,
    ) -> DataProvenance:
        prov = DataProvenance(
            investigation_id=investigation_id,
            dataset_id=dataset_id,
            ingestion_job_id=job_id,
            entity_id=entity.id,
            source_type=ProvenanceSourceType.DATABASE,
            source_name=source_name,
            timestamp=datetime.now(UTC),
            extraction_method="csv_ingestion",
            confidence=entity.confidence,
            checksum=checksum,
            notes=f"Auto-extracted from CSV ingestion: {source_name}",
            metadata_={
                "source": "csv_ingestion",
                "entity_type": entity.entity_type.value,
                "canonical_name": entity.canonical_name,
            },
        )
        self.session.add(prov)
        return prov

    async def _create_relationship_provenance(
        self,
        relationship: Relationship,
        investigation_id: UUID,
        dataset_id: UUID,
        job_id: UUID,
        source_name: str,
        checksum: str,
    ) -> DataProvenance:
        prov = DataProvenance(
            investigation_id=investigation_id,
            dataset_id=dataset_id,
            ingestion_job_id=job_id,
            relationship_id=relationship.id,
            source_type=ProvenanceSourceType.DATABASE,
            source_name=source_name,
            timestamp=datetime.now(UTC),
            extraction_method="csv_ingestion",
            confidence=relationship.confidence,
            checksum=checksum,
            notes=f"Auto-extracted from CSV ingestion: {source_name}",
            metadata_={
                "source": "csv_ingestion",
                "relationship_type": relationship.relationship_type.value,
            },
        )
        self.session.add(prov)
        return prov

    # ------------------------------------------------------------------
    # Event creation (Phase 17.1 — investigation timeline)
    # ------------------------------------------------------------------

    async def _create_event(
        self,
        investigation_id: UUID,
        event_type: str,
        description: str,
        metadata: dict | None = None,
    ) -> InvestigationEvent:
        event = InvestigationEvent(
            investigation_id=investigation_id,
            event_type=event_type,
            timestamp=datetime.now(UTC),
            description=description,
            metadata_=metadata or {},
        )
        self.session.add(event)
        return event

    # ------------------------------------------------------------------
    # Main pipeline
    # ------------------------------------------------------------------

    async def run(
        self,
        investigation_id: UUID,
        dataset_id: UUID,
        file_content: str,
        file_name: str,
        created_by: str | None = None,
    ) -> IngestionResult:
        inv = await self.investigations.get(investigation_id)
        if not inv:
            raise InvestigationNotFoundError(str(investigation_id))
        ds = await self.datasets.get(dataset_id)
        if not ds:
            raise NotFoundError("Dataset", str(dataset_id))

        # Compute file checksum
        checksum = hashlib.sha256(file_content.encode("utf-8")).hexdigest()

        # Create ingestion job
        job = IngestionJob(
            investigation_id=investigation_id,
            dataset_id=dataset_id,
            status=IngestionJobStatus.RUNNING,
            progress=0,
            started_at=datetime.now(UTC).isoformat(),
            created_by=created_by,
            metadata_={"file_name": file_name, "checksum": checksum},
        )
        self.session.add(job)
        await self.session.flush()

        ds.status = DatasetStatus.PROCESSING
        ds.last_ingestion_id = job.id
        await self.session.flush()

        # Phase 0: Timeline events
        events_created = 0
        await self._create_event(
            investigation_id,
            "dataset_uploaded",
            f"Dataset '{ds.name}' uploaded ({file_name})",
            metadata={"dataset_id": str(dataset_id), "file_name": file_name},
        )
        await self._create_event(
            investigation_id,
            "ingestion_started",
            f"Ingestion started for dataset '{ds.name}'",
            metadata={"dataset_id": str(dataset_id), "job_id": str(job.id)},
        )
        events_created += 2
        await self.session.flush()

        # Parse CSV
        try:
            dataset_name = ds.name or file_name
            id_column = self._detect_id_column([])
            csv_table = parse_csv(
                file_content,
                dataset_name=dataset_name,
                id_column=id_column,
            )
        except (CsvIntelligenceError, Exception) as exc:
            ds.status = DatasetStatus.FAILED
            job.status = IngestionJobStatus.FAILED
            job.errors_list = [str(exc)]
            await self.session.flush()
            await self._create_event(
                investigation_id,
                "ingestion_failed",
                f"Ingestion failed for dataset '{ds.name}': {exc}",
                metadata={"dataset_id": str(dataset_id), "job_id": str(job.id)},
            )
            await self.session.flush()
            return IngestionResult(
                dataset_id=str(dataset_id),
                job_id=str(job.id),
                records_processed=0,
                entities_created=0,
                relationships_created=0,
                evidence_created=0,
                provenance_created=0,
                events_created=events_created + 1,
                duplicates_skipped=0,
                warnings=[str(exc)],
            )

        headers = csv_table.headers
        rows = csv_table.rows
        total = len(rows)

        entity_columns = self._detect_entity_columns(headers)
        evidence_type = self._infer_evidence_type(headers, ds.category)

        entity_cache: dict[str, Entity] = {}
        entity_provenance_set: set[str] = set()
        relationship_cache: set[tuple[str, str, str]] = set()
        relationship_provenance_set: set[str] = set()
        duplicates = 0
        entities_created = 0
        relationships_created = 0
        evidence_created = 0
        provenance_created = 0
        warnings: list[str] = []

        for row_idx, csv_row in enumerate(rows):
            row_data = csv_row.data
            record_id = csv_row.record_identifier

            # Phase 1: Extract unique entities for this row
            row_entities: dict[EntityType, Entity] = {}
            for etype, columns in entity_columns.items():
                for col in columns:
                    raw = (row_data.get(col) or "").strip()
                    if not raw or len(raw) < 2:
                        continue
                    normalized = self._normalize_name(raw)
                    cache_key = f"{investigation_id}:{normalized}"
                    if cache_key in entity_cache:
                        row_entities[etype] = entity_cache[cache_key]
                        continue
                    entity = await self._find_or_create_entity(
                        raw, etype, investigation_id, col, raw,
                    )
                    is_new = entity.created_at == entity.updated_at
                    if is_new:
                        entities_created += 1
                        # Create provenance for new entity
                        prov_key = f"{dataset_id}:{entity.id}"
                        if prov_key not in entity_provenance_set:
                            await self._create_entity_provenance(
                                entity, investigation_id, dataset_id,
                                job.id, ds.name or file_name, checksum,
                            )
                            entity_provenance_set.add(prov_key)
                            provenance_created += 1
                    else:
                        duplicates += 1
                    entity_cache[cache_key] = entity
                    row_entities[etype] = entity
                    break  # take first valid column per entity type

            # Phase 2: Create relationships between entity types
            entity_types_present = list(row_entities.keys())
            for i, etype_a in enumerate(entity_types_present):
                for etype_b in entity_types_present[i + 1:]:
                    entity_a = row_entities[etype_a]
                    entity_b = row_entities[etype_b]
                    rel_key = f"{entity_a.id}:{entity_b.id}"
                    if rel_key in relationship_cache:
                        continue
                    rel_type = self._infer_relationship_type(etype_a, etype_b)
                    rel = await self._find_or_create_relationship(
                        entity_a, entity_b, rel_type,
                        investigation_id, ds.name or file_name, record_id,
                    )
                    relationship_cache.add(rel_key)
                    relationships_created += 1
                    # Create provenance for new relationship
                    prov_key = f"{dataset_id}:{rel.id}"
                    if prov_key not in relationship_provenance_set:
                        await self._create_relationship_provenance(
                            rel, investigation_id, dataset_id,
                            job.id, ds.name or file_name, checksum,
                        )
                        relationship_provenance_set.add(prov_key)
                        provenance_created += 1

            # Phase 3: Evidence for each row
            if row_entities:
                ptype = entity_types_present[0] if entity_types_present else EntityType.PERSON
                primary_entity = row_entities[ptype]
                evidence_title = f"Record {record_id or row_idx + 2} — {primary_entity.name}"
                await self._create_evidence(
                    investigation_id, evidence_title, evidence_type,
                    ds.name or file_name, record_id, row_data, dataset_id,
                )
                evidence_created += 1

            # Progress update every 50 rows
            if (row_idx + 1) % 50 == 0 or row_idx == total - 1:
                job.progress = min(95, int((row_idx + 1) / total * 95))
                job.records_processed = row_idx + 1
                await self.session.flush()

        # Quality score
        quality_score = self._compute_quality_score(
            total, entities_created, len(warnings), duplicates,
        )

        # Complete job
        job.status = IngestionJobStatus.COMPLETED
        job.progress = 100
        job.records_processed = total
        job.entities_extracted = entities_created
        job.candidates_created = relationships_created
        job.matches_found = evidence_created
        job.warnings_list = warnings
        job.completed_at = datetime.now(UTC).isoformat()

        ds.status = DatasetStatus.READY
        ds.record_count = total
        ds.quality_score = quality_score
        ds.warnings = len(warnings)
        ds.duplicates = duplicates

        # Phase 0 completion: ingestion_completed event
        await self._create_event(
            investigation_id,
            "ingestion_completed",
            f"Ingestion completed for dataset '{ds.name}': "
            f"{total} records, {entities_created} entities, "
            f"{relationships_created} relationships, {evidence_created} evidence, "
            f"{provenance_created} provenance records",
            metadata={
                "dataset_id": str(dataset_id),
                "job_id": str(job.id),
                "records_processed": total,
                "entities_created": entities_created,
                "relationships_created": relationships_created,
                "evidence_created": evidence_created,
                "provenance_created": provenance_created,
                "checksum": checksum,
            },
        )
        events_created += 1
        await self.session.flush()

        return IngestionResult(
            dataset_id=str(dataset_id),
            job_id=str(job.id),
            records_processed=total,
            entities_created=entities_created,
            relationships_created=relationships_created,
            evidence_created=evidence_created,
            provenance_created=provenance_created,
            events_created=events_created,
            duplicates_skipped=duplicates,
            warnings=warnings,
        )

    @staticmethod
    def _infer_evidence_type(headers: list[str], category: str) -> str:
        header_str = " ".join(h.lower() for h in headers)
        if "phone" in header_str or "call" in header_str or "cdr" in header_str:
            return "COMMUNICATION"
        if "amount" in header_str or "transaction" in header_str or "bank" in header_str:
            return "TRANSACTION"
        if "vehicle" in header_str or "registration" in header_str:
            return "VEHICLE"
        if "location" in header_str or "lat" in header_str:
            return "LOCATION"
        if "fir" in header_str or "case" in header_str:
            return "FIR"
        if category == "document":
            return "DOCUMENT"
        return "RECORD"

    @staticmethod
    def _infer_relationship_type(a: EntityType, b: EntityType) -> RelationshipType:
        pair = frozenset([a, b])
        if pair == frozenset([EntityType.PERSON, EntityType.PHONE]):
            return RelationshipType.ASSOCIATED_WITH
        if pair == frozenset([EntityType.PERSON, EntityType.PERSON]):
            return RelationshipType.KNOWN_ASSOCIATE
        if pair == frozenset([EntityType.PERSON, EntityType.ORGANIZATION]):
            return RelationshipType.OTHER
        if pair == frozenset([EntityType.PERSON, EntityType.ACCOUNT]):
            return RelationshipType.OWNS
        if EntityType.TRANSACTION in pair:
            return RelationshipType.TRANSACTION
        if pair == frozenset([EntityType.PERSON, EntityType.VEHICLE]):
            return RelationshipType.OWNS
        return RelationshipType.ASSOCIATED_WITH

    @staticmethod
    def _compute_quality_score(
        total_records: int,
        entities_created: int,
        warnings: int,
        duplicates: int,
    ) -> float:
        if total_records == 0:
            return 0.0
        entity_ratio = min(entities_created / total_records, 1.0)
        warn_penalty = min(warnings / total_records, 0.3)
        dup_penalty = min(duplicates / total_records, 0.2)
        score = 0.5 + (0.35 * entity_ratio) - warn_penalty - dup_penalty
        return round(max(0.0, min(1.0, score)), 2)
