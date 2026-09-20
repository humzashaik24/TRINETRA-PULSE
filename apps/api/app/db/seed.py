"""Deterministic seed data for the Trinetra Pulse relational database.

Phase A (Data Integrity Foundation) makes *Operation Trinetra Nexus* the single
canonical demonstration universe in the backend:

- one investigation (``inv-demo-nexus`` / "Operation Trinetra Nexus")
- 35 entities / 60 relationships / 3 clusters / 6 findings / 7 evidence /
  2 events / 1 note / 7 datasets

It is the exact deterministic dataset authored in
``apps/web/src/mock/nexus-dataset.ts`` (each timestamp is fixed, no randomness),
ported into real database rows so the mock/relational split-brain is resolved
at the foundation level.

The legacy *Operation Meridian* (``inv-006``) universe remains available as an
explicit non-demo fixture via ``seed_operation_meridian`` — it is what the
pre-existing relational tests and the real-API client anchor on — but it is
**not** part of the canonical presentation seed and is never created by
``python -m app.db.seed``.

Every foreign-key reference resolves within the seeded universe. IDs are
deterministic ``uuid5`` values derived from the canonical demo ids
(e.g. ``inv-demo-nexus``), so re-seeding is stable and reproducible.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import (
    Dataset,
    DatasetStatus,
    Entity,
    EntityType,
    EvidenceChainAction,
    EvidenceChainEntry,
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
    NetworkAnalyticsSnapshot,
    Relationship,
    RelationshipType,
    User,
    UserRole,
    VerificationStatus,
)
from app.services import evidence_chain, evidence_integrity


def _uuid(canonical_id: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"trinetra::{canonical_id}")


def _utc(iso_str: str) -> datetime:
    return datetime.fromisoformat(iso_str.replace("Z", "+00:00"))


# ---------------------------------------------------------------------------
# Nexus demo universe (Operation Trinetra Nexus) — canonical presentation seed.
# ---------------------------------------------------------------------------
# Ported verbatim from apps/web/src/mock/nexus-dataset.ts. The 35 nodes / 60
# edges / 7 evidence / 6 findings / 2 events / 1 note / 7 datasets below are
# the exact deterministic dataset the frontend mock exposes.
# ---------------------------------------------------------------------------


# (canonical_id, type, name, canonical_name, confidence, verified, flagged, attributes)
NEXUS_ENTITIES: list[tuple[str, EntityType, str, str, float, bool, bool, dict]] = [
    ("ent-nexus-person-001", EntityType.PERSON, "Arjun Kapoor", "arjun kapoor", 0.94, True, True,
     {"full_name": "Arjun Kapoor", "phone": "+91 98110 22334", "email": "arjun.k@bluesky.example",
      "date_of_birth": "1985-03-14", "address": "45 Defence Colony, New Delhi 110024",
      "location": "Delhi", "id_number": "PAN AABCA1234D"}),
    ("ent-nexus-person-002", EntityType.PERSON, "Suresh Iyer", "suresh iyer", 0.82, False, True,
     {"full_name": "Suresh Iyer", "phone": "+91 97770 55661", "location": "Delhi",
      "organization": "BlueSky Trading Solutions"}),
    ("ent-nexus-person-003", EntityType.PERSON, "Kavya Menon", "kavya menon", 0.79, False, False,
     {"full_name": "Kavya Menon", "phone": "+91 98980 11223", "location": "Delhi",
      "organization": "BlueSky Trading Solutions"}),
    ("ent-nexus-person-004", EntityType.PERSON, "Ramesh Nair", "ramesh nair", 0.68, False, False,
     {"full_name": "Ramesh Nair", "location": "Mumbai"}),
    ("ent-nexus-person-005", EntityType.PERSON, "Meera Joshi", "meera joshi", 0.86, True, True,
     {"full_name": "Meera Joshi", "phone": "+91 99112 88990", "phone2": "+91 96544 12021",
      "location": "Hyderabad",
      "organizations": ["Pinnacle Import-Export Corp", "Swift Cargo Logistics"]}),
    ("ent-nexus-person-006", EntityType.PERSON, "Nikhil Sharma", "nikhil sharma", 0.77, False, True,
     {"full_name": "Nikhil Sharma", "location": "Hyderabad",
      "organization": "Pinnacle Import-Export Corp", "vehicle": "TS 05 CD 5500"}),
    ("ent-nexus-person-007", EntityType.PERSON, "Pooja Deshmukh", "pooja deshmukh", 0.71, False, False,
     {"full_name": "Pooja Deshmukh", "location": "Hyderabad",
      "organization": "Swift Cargo Logistics"}),
    ("ent-nexus-person-008", EntityType.PERSON, "Vikram Rao", "vikram rao", 0.83, True, True,
     {"full_name": "Vikram Rao", "phone": "+91 97770 55661", "location": "Hyderabad",
      "organization": "Pinnacle Import-Export Corp"}),
    ("ent-nexus-person-009", EntityType.PERSON, "Ananya Pillai", "ananya pillai", 0.66, False, False,
     {"full_name": "Ananya Pillai", "location": "Delhi"}),
    ("ent-nexus-person-010", EntityType.PERSON, "Ravi Reddy", "ravi reddy", 0.58, False, False,
     {"full_name": "Ravi Reddy", "location": "Hyderabad"}),
    ("ent-nexus-org-001", EntityType.ORGANIZATION, "BlueSky Trading Solutions",
     "bluesky trading solutions", 0.92, True, True,
     {"full_name": "BlueSky Trading Solutions", "gst": "07AABCB1234A1ZN", "location": "Delhi",
      "type": "Private Limited"}),
    ("ent-nexus-org-002", EntityType.ORGANIZATION, "Pinnacle Import-Export Corp",
     "pinnacle import-export corp", 0.83, True, True,
     {"full_name": "Pinnacle Import-Export Corp", "gst": "36AABCC5678D1ZP", "location": "Hyderabad",
      "type": "Private Limited"}),
    ("ent-nexus-org-003", EntityType.ORGANIZATION, "Swift Cargo Logistics",
     "swift cargo logistics", 0.74, False, True,
     {"full_name": "Swift Cargo Logistics", "gst": "36AABCD9012E1ZQ", "location": "Hyderabad",
      "type": "LLP"}),
    ("ent-nexus-org-004", EntityType.ORGANIZATION, "Golden Gate Financials",
     "golden gate financials", 0.62, False, False,
     {"full_name": "Golden Gate Financials", "gst": "27AABCE3456F1ZT", "location": "Mumbai",
      "type": "Private Limited"}),
    ("ent-nexus-phone-001", EntityType.PHONE, "+91 98110 22334", "+919811022334", 0.96, True, True,
     {"subscriber": "Arjun Kapoor", "operator": "Airtel", "location": "Delhi"}),
    ("ent-nexus-phone-002", EntityType.PHONE, "+91 98980 11223", "+919898011223", 0.93, True, False,
     {"subscriber": "Kavya Menon", "operator": "Jio", "location": "Delhi"}),
    ("ent-nexus-phone-003", EntityType.PHONE, "+91 97770 55661", "+919777055661", 0.84, False, False,
     {"subscriber": "Suresh Iyer", "operator": "Vi", "location": "Delhi"}),
    ("ent-nexus-phone-004", EntityType.PHONE, "+91 99112 88990", "+919911288990", 0.78, False, False,
     {"subscriber": "Meera Joshi", "operator": "Airtel", "location": "Hyderabad"}),
    ("ent-nexus-phone-005", EntityType.PHONE, "+91 96544 12021", "+919654412021", 0.66, False, False,
     {"subscriber": "Meera Joshi", "operator": "Jio", "location": "Hyderabad"}),
    ("ent-nexus-account-001", EntityType.ACCOUNT, "4001 2213 5566", "400122135566", 0.95, True, True,
     {"bank": "State Bank of India", "account_type": "Current", "holder": "BlueSky Trading Solutions"}),
    ("ent-nexus-account-002", EntityType.ACCOUNT, "4002 7755 8877", "400277558877", 0.85, False, True,
     {"bank": "HDFC Bank", "account_type": "Current", "holder": "BlueSky Trading Solutions"}),
    ("ent-nexus-account-003", EntityType.ACCOUNT, "4003 1122 9900", "400311229900", 0.80, False, True,
     {"bank": "ICICI Bank", "account_type": "Current", "holder": "Golden Gate Financials",
      "controller": "Meera Joshi"}),
    ("ent-nexus-account-004", EntityType.ACCOUNT, "4004 5566 0011", "400455660011", 0.70, False, False,
     {"bank": "Axis Bank", "account_type": "Savings", "holder": "Vikram Rao"}),
    ("ent-nexus-vehicle-001", EntityType.VEHICLE, "DL 01 AB 1234", "dl01ab1234", 0.83, False, False,
     {"make": "Toyota", "model": "Innova", "year": 2021, "color": "White",
      "registered_to": "Pooja Deshmukh"}),
    ("ent-nexus-vehicle-002", EntityType.VEHICLE, "TS 05 CD 5500", "ts05cd5500", 0.90, True, True,
     {"make": "Hyundai", "model": "Creta", "year": 2022, "color": "Silver",
      "registered_to": "Nikhil Sharma"}),
    ("ent-nexus-vehicle-003", EntityType.VEHICLE, "MH 02 EF 8899", "mh02ef8899", 0.67, False, False,
     {"make": "Tata", "model": "Ace", "year": 2020, "color": "Blue",
      "registered_to": "Swift Cargo Logistics"}),
    ("ent-nexus-location-001", EntityType.LOCATION, "Delhi", "delhi", 0.95, True, True,
     {"type": "City", "state": "Delhi", "country": "India"}),
    ("ent-nexus-location-002", EntityType.LOCATION, "Hyderabad", "hyderabad", 0.93, True, True,
     {"type": "City", "state": "Telangana", "country": "India"}),
    ("ent-nexus-location-003", EntityType.LOCATION, "Mumbai", "mumbai", 0.84, False, False,
     {"type": "City", "state": "Maharashtra", "country": "India"}),
    ("ent-nexus-txn-001", EntityType.TRANSACTION, "TXN-NEX-001", "txn-nex-001", 0.97, True, True,
     {"amount": "INR 5,20,000", "sender": "4001 2213 5566", "receiver": "4003 1122 9900",
      "date": "2026-09-05"}),
    ("ent-nexus-txn-002", EntityType.TRANSACTION, "TXN-NEX-002", "txn-nex-002", 0.95, True, True,
     {"amount": "INR 3,80,000", "sender": "4002 7755 8877", "receiver": "4004 5566 0011",
      "date": "2026-09-06"}),
    ("ent-nexus-txn-003", EntityType.TRANSACTION, "TXN-NEX-003", "txn-nex-003", 0.79, False, True,
     {"amount": "INR 2,10,000", "sender": "4003 1122 9900", "receiver": "4004 5566 0011",
      "date": "2026-09-04"}),
    ("ent-nexus-txn-004", EntityType.TRANSACTION, "TXN-NEX-004", "txn-nex-004", 0.72, False, False,
     {"amount": "INR 1,50,000", "note": "Located via Mumbai cell tower data", "date": "2026-08-15"}),
    ("ent-nexus-device-001", EntityType.PHONE, "IMEI 356938035643809", "imei356938035643809", 0.76,
     False, True, {"type": "Mobile Device", "imei": "356938035643809", "linked_to": "Arjun Kapoor"}),
    ("ent-nexus-event-001", EntityType.EVENT, "Co-location — Hyderabad Warehouse",
     "colocation hyderabad warehouse", 0.80, False, True,
     {"event_date": "2026-09-02", "location": "Hyderabad", "co_location_count": 4}),
]

NEXUS_ENTITY_DESCRIPTIONS: dict[str, str] = {
    "ent-nexus-person-001": "Central node of the Nexus fraud network. Hub entity with 14 direct connections.",
    "ent-nexus-person-002": "Senior associate at BlueSky Trading Solutions; frequent co-location with Kapoor in Delhi.",
    "ent-nexus-person-003": "Phone-linked associate at BlueSky Trading Solutions.",
    "ent-nexus-person-004": "Operative connected to Golden Gate Financials through GST ledger records.",
    "ent-nexus-person-005": "Bridge entity connecting Delhi Financial Core to Hyderabad Operations; 8 direct connections.",
    "ent-nexus-person-006": "Pinnacle Import-Export operative in Hyderabad; vehicle tracking links to warehouse events.",
    "ent-nexus-person-007": "Swift Cargo Logistics associate linked via vehicle DL 01 AB 1234.",
    "ent-nexus-person-008": "Senior Pinnacle operative; confirmed co-location at the Hyderabad warehouse event.",
    "ent-nexus-person-009": "Low-confidence associate; possible money mule pathway via account-004.",
    "ent-nexus-person-010": "Weakly linked associate; possible money mule receiving layered funds.",
    "ent-nexus-org-001": "Primary Delhi-based shell company; GST registrations show overlapping custodians.",
    "ent-nexus-org-002": "Hyderabad shell company with import-export facade; linked to warehouse co-location.",
    "ent-nexus-org-003": "Hyderabad logistics front linked to Pinnacle; warehouse event involvement confirmed.",
    "ent-nexus-org-004": "Mumbai-based financial entity; receives layered transactions.",
    "ent-nexus-device-001": "Secondary device linked to Arjun Kapoor; IMEI tracked via CDR and cell tower.",
    "ent-nexus-event-001": "Multiple Nexus devices co-located at Hyderabad warehouse premises on September 2nd.",
}


# (canonical edge id suffix, source, target, label, confidence, source_name, date)
NEXUS_RELATIONSHIP_LABELS: dict[str, RelationshipType] = {
    "USES": RelationshipType.USES,
    "OWNS": RelationshipType.OWNS,
    "WORKS_FOR": RelationshipType.WORKS_FOR,
    "OWNS_ACCOUNT": RelationshipType.OWNS_ACCOUNT,
    "LOCATED_AT": RelationshipType.LOCATED_AT,
    "KNOWS": RelationshipType.KNOWS,
    "SENT_TRANSACTION": RelationshipType.SENT_TRANSACTION,
    "INVOLVED_IN": RelationshipType.INVOLVED_IN,
    "SUPPORTED_BY": RelationshipType.SUPPORTED_BY,
}

# 60 edges in the exact order authored by the Nexus dataset (rel-nexus-001..060).
NEXUS_RELATIONSHIPS: list[tuple[str, str, str, float, str]] = [
    ("ent-nexus-person-001", "ent-nexus-phone-001", "USES", 0.98, "Telecom Subscriber DB"),
    ("ent-nexus-person-001", "ent-nexus-vehicle-001", "OWNS", 0.85, "Vehicle Tracking Data"),
    ("ent-nexus-person-001", "ent-nexus-org-001", "WORKS_FOR", 0.95, "GST Ledger Extract"),
    ("ent-nexus-person-001", "ent-nexus-org-004", "WORKS_FOR", 0.70, "GST Ledger Extract"),
    ("ent-nexus-person-001", "ent-nexus-org-002", "WORKS_FOR", 0.68, "GST Ledger Extract"),
    ("ent-nexus-person-001", "ent-nexus-account-001", "OWNS_ACCOUNT", 0.97, "Bank Transaction Log"),
    ("ent-nexus-person-001", "ent-nexus-account-003", "OWNS_ACCOUNT", 0.72, "Bank Transaction Log"),
    ("ent-nexus-person-001", "ent-nexus-location-001", "LOCATED_AT", 0.94, "Cell Tower Data"),
    ("ent-nexus-person-001", "ent-nexus-person-002", "KNOWS", 0.90, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-001", "ent-nexus-person-003", "KNOWS", 0.78, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-001", "ent-nexus-person-005", "KNOWS", 0.86, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-001", "ent-nexus-device-001", "USES", 0.87, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-001", "ent-nexus-txn-001", "SENT_TRANSACTION", 0.92, "Bank Transaction Log"),
    ("ent-nexus-person-001", "ent-nexus-txn-002", "SENT_TRANSACTION", 0.74, "Bank Transaction Log"),
    ("ent-nexus-person-005", "ent-nexus-phone-004", "USES", 0.92, "Telecom Subscriber DB"),
    ("ent-nexus-person-005", "ent-nexus-phone-005", "USES", 0.87, "Telecom Subscriber DB"),
    ("ent-nexus-person-005", "ent-nexus-org-002", "WORKS_FOR", 0.94, "GST Ledger Extract"),
    ("ent-nexus-person-005", "ent-nexus-org-003", "WORKS_FOR", 0.82, "GST Ledger Extract"),
    ("ent-nexus-person-005", "ent-nexus-account-003", "OWNS_ACCOUNT", 0.90, "Bank Transaction Log"),
    ("ent-nexus-person-005", "ent-nexus-location-002", "LOCATED_AT", 0.95, "Cell Tower Data"),
    ("ent-nexus-person-005", "ent-nexus-person-006", "KNOWS", 0.79, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-005", "ent-nexus-person-008", "KNOWS", 0.84, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-002", "ent-nexus-phone-003", "USES", 0.84, "Telecom Subscriber DB"),
    ("ent-nexus-person-002", "ent-nexus-account-002", "OWNS_ACCOUNT", 0.83, "Bank Transaction Log"),
    ("ent-nexus-person-002", "ent-nexus-org-001", "WORKS_FOR", 0.89, "GST Ledger Extract"),
    ("ent-nexus-person-003", "ent-nexus-phone-002", "USES", 0.93, "Telecom Subscriber DB"),
    ("ent-nexus-person-003", "ent-nexus-org-001", "WORKS_FOR", 0.80, "GST Ledger Extract"),
    ("ent-nexus-person-003", "ent-nexus-person-002", "KNOWS", 0.72, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-004", "ent-nexus-org-004", "WORKS_FOR", 0.68, "GST Ledger Extract"),
    ("ent-nexus-person-004", "ent-nexus-person-010", "KNOWS", 0.55, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-006", "ent-nexus-org-002", "WORKS_FOR", 0.85, "GST Ledger Extract"),
    ("ent-nexus-person-006", "ent-nexus-vehicle-002", "OWNS", 0.82, "Vehicle Tracking Data"),
    ("ent-nexus-person-006", "ent-nexus-person-007", "KNOWS", 0.68, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-007", "ent-nexus-org-003", "WORKS_FOR", 0.76, "GST Ledger Extract"),
    ("ent-nexus-person-007", "ent-nexus-vehicle-001", "OWNS", 0.73, "Vehicle Tracking Data"),
    ("ent-nexus-person-008", "ent-nexus-org-002", "WORKS_FOR", 0.90, "GST Ledger Extract"),
    ("ent-nexus-person-008", "ent-nexus-account-004", "OWNS_ACCOUNT", 0.84, "Bank Transaction Log"),
    ("ent-nexus-person-008", "ent-nexus-event-001", "INVOLVED_IN", 0.87, "Cell Tower Data"),
    ("ent-nexus-person-009", "ent-nexus-person-002", "KNOWS", 0.65, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-009", "ent-nexus-person-010", "KNOWS", 0.60, "CDR Extract - Harness Cell"),
    ("ent-nexus-person-010", "ent-nexus-account-004", "OWNS_ACCOUNT", 0.62, "Bank Transaction Log"),
    ("ent-nexus-org-001", "ent-nexus-location-001", "LOCATED_AT", 0.95, "GST Ledger Extract"),
    ("ent-nexus-org-001", "ent-nexus-account-001", "OWNS_ACCOUNT", 0.93, "Bank Transaction Log"),
    ("ent-nexus-org-001", "ent-nexus-account-002", "OWNS_ACCOUNT", 0.86, "Bank Transaction Log"),
    ("ent-nexus-org-001", "ent-nexus-account-003", "OWNS_ACCOUNT", 0.78, "Bank Transaction Log"),
    ("ent-nexus-org-002", "ent-nexus-location-002", "LOCATED_AT", 0.94, "GST Ledger Extract"),
    ("ent-nexus-org-002", "ent-nexus-event-001", "INVOLVED_IN", 0.81, "Cell Tower Data"),
    ("ent-nexus-org-003", "ent-nexus-location-002", "LOCATED_AT", 0.89, "GST Ledger Extract"),
    ("ent-nexus-org-003", "ent-nexus-vehicle-003", "OWNS", 0.71, "Vehicle Tracking Data"),
    ("ent-nexus-org-003", "ent-nexus-event-001", "INVOLVED_IN", 0.83, "Cell Tower Data"),
    ("ent-nexus-org-004", "ent-nexus-account-003", "OWNS_ACCOUNT", 0.75, "Bank Transaction Log"),
    ("ent-nexus-org-001", "ent-nexus-org-004", "SUPPORTED_BY", 0.66, "GST Ledger Extract"),
    ("ent-nexus-org-002", "ent-nexus-org-003", "SUPPORTED_BY", 0.74, "GST Ledger Extract"),
    ("ent-nexus-org-002", "ent-nexus-org-001", "SUPPORTED_BY", 0.60, "GST Ledger Extract"),
    ("ent-nexus-account-001", "ent-nexus-txn-001", "SENT_TRANSACTION", 0.94, "Bank Transaction Log"),
    ("ent-nexus-txn-001", "ent-nexus-account-003", "SENT_TRANSACTION", 0.91, "Bank SWIFT Trail"),
    ("ent-nexus-account-002", "ent-nexus-txn-002", "SENT_TRANSACTION", 0.89, "Bank Transaction Log"),
    ("ent-nexus-txn-002", "ent-nexus-account-004", "SENT_TRANSACTION", 0.87, "Bank Transaction Log"),
    ("ent-nexus-account-003", "ent-nexus-txn-003", "SENT_TRANSACTION", 0.79, "Bank Transaction Log"),
    ("ent-nexus-txn-004", "ent-nexus-location-003", "LOCATED_AT", 0.72, "Cell Tower Data"),
]


# 7 evidence items (ev-nexus-001..007).
NEXUS_EVIDENCE: list[dict] = [
    {
        "cid": "ev-nexus-001", "evidence_type": "FIR",
        "title": "FIR-2026-021 — Delhi North financial fraud",
        "description": (
            "FIR filed at Delhi North district naming Arjun Kapoor and associates "
            "for multi-city shell company fraud."
        ),
        "source": "FIR Records - Delhi North",
        "source_id": "FIR-2026-021",
        "dataset": "ds-nexus-001",
        "confidence": 0.97,
        "collected_at": "2026-07-01T09:15:00Z",
        "record_identifier": "FIR-2026-021",
        "location": "Delhi North Police Station",
    },
    {
        "cid": "ev-nexus-002", "evidence_type": "COMMUNICATION",
        "title": "CDR extract — Harness Cell batch",
        "description": (
            "Call detail record batch linking Nexus persons across Delhi and "
            "Hyderabad via communication frequency analysis."
        ),
        "source": "CDR Extract - Harness Cell",
        "source_id": "cdr_harness_nexus.csv",
        "dataset": "ds-nexus-002",
        "confidence": 0.94,
        "collected_at": "2026-07-05T10:20:00Z",
        "record_identifier": "cdr_harness_nexus.csv",
    },
    {
        "cid": "ev-nexus-003", "evidence_type": "TRANSACTION",
        "title": "Bank SWIFT trail — layered transfers",
        "description": (
            "SWIFT message records documenting the layered money flow from "
            "BlueSky accounts through bridge accounts."
        ),
        "source": "Bank SWIFT Trail",
        "source_id": "swift_nexus_q3.csv",
        "dataset": "ds-nexus-003",
        "confidence": 0.96,
        "collected_at": "2026-09-06T11:25:00Z",
        "record_identifier": "swift_nexus_q3.csv",
    },
    {
        "cid": "ev-nexus-004", "evidence_type": "DOCUMENT",
        "title": "GST ledger extract — BlueSky Trading",
        "description": (
            "GST registration and quarterly filings for BlueSky Trading Solutions "
            "showing overlapping director addresses."
        ),
        "source": "GST Ledger Extract",
        "source_id": "gst_bluesky_q2q3.csv",
        "dataset": "ds-nexus-004",
        "confidence": 0.91,
        "collected_at": "2026-07-01T09:20:00Z",
        "record_identifier": "gst_bluesky_q2q3.csv",
    },
    {
        "cid": "ev-nexus-005", "evidence_type": "VEHICLE",
        "title": "Vehicle tracking — Hyderabad routes",
        "description": (
            "GPS tracking data for TS 05 CD 5500 placing it at the Hyderabad "
            "warehouse on September 2-3."
        ),
        "source": "Vehicle Tracking Data",
        "source_id": "vehicle_hyd_sep2026.csv",
        "dataset": "ds-nexus-005",
        "confidence": 0.89,
        "collected_at": "2026-09-03T07:20:00Z",
        "record_identifier": "vehicle_hyd_sep2026.csv",
    },
    {
        "cid": "ev-nexus-006", "evidence_type": "LOCATION",
        "title": "Cell tower aggregation — Hyderabad warehouse",
        "description": (
            "Tower hit data placing multiple Nexus devices within a 500m radius "
            "of the Hyderabad warehouse on September 2nd."
        ),
        "source": "Cell Tower Data",
        "source_id": "tower_hyd_sep2.json",
        "dataset": "ds-nexus-006",
        "confidence": 0.88,
        "collected_at": "2026-09-02T21:05:00Z",
        "record_identifier": "tower_hyd_sep2.json",
    },
    {
        "cid": "ev-nexus-007", "evidence_type": "IMAGE",
        "title": "CCTV still — Hyderabad warehouse entry",
        "description": (
            "Annotated CCTV still from commercial camera near the Hyderabad "
            "warehouse, showing a silver Hyundai Creta (TS 05 CD 5500) entering "
            "the premises."
        ),
        "source": "Hyderabad Warehouse CCTV",
        "source_id": "cctv_hyd_entrance_20260902.jpg",
        "dataset": "ds-nexus-007",
        "confidence": 0.82,
        "collected_at": "2026-09-03T08:00:00Z",
        "record_identifier": "cctv_hyd_entrance_20260902.jpg",
        "location": "Hyderabad Warehouse",
    },
]


# (canonical_id, title, description, severity, tags, entity_refs, evidence_refs)
NEXUS_FINDINGS: list[tuple[str, str, str, FindingSeverity, list[str], list[str], list[str]]] = [
    ("inf-nexus-1", "Hub entity identified — Arjun Kapoor",
     "Arjun Kapoor maintains 14 direct relationships across persons, organizations, "
     "accounts and transactions, functioning as the central node of the Nexus network.",
     FindingSeverity.HIGH, ["hub", "centrality", "arjun-kapoor"],
     ["ent-nexus-person-001"], ["ev-nexus-002"]),
    ("inf-nexus-2", "Bridge entity links Delhi and Hyderabad",
     "Meera Joshi (8 direct connections) provides the only high-confidence structural "
     "bridge between the Delhi Financial Core and Hyderabad Operations clusters.",
     FindingSeverity.HIGH, ["bridge", "meera-joshi"],
     ["ent-nexus-person-005"], ["ev-nexus-002"]),
    ("inf-nexus-3", "Layered transaction chain detected",
     "Three sequential transactions (TXN-NEX-001, TXN-NEX-002, TXN-NEX-003) move funds "
     "from BlueSky accounts through bridge accounts to Pinnacle/Swift-controlled "
     "accounts within a 48-hour window.",
     FindingSeverity.HIGH, ["money-laundering", "layering"],
     ["ent-nexus-txn-001", "ent-nexus-txn-002", "ent-nexus-txn-003",
      "ent-nexus-account-001", "ent-nexus-account-003"], ["ev-nexus-003"]),
    ("inf-nexus-4", "Shell company structure confirmed",
     "BlueSky Trading Solutions, Pinnacle Import-Export Corp and Swift Cargo Logistics "
     "share overlapping GST registrations and bank account custodians, consistent with "
     "shell company fronting.",
     FindingSeverity.MEDIUM, ["shell-companies", "gst"],
     ["ent-nexus-org-001", "ent-nexus-org-002", "ent-nexus-org-003"], ["ev-nexus-004"]),
    ("inf-nexus-5", "Co-location event — Hyderabad warehouse",
     "Cell tower and vehicle tracking data independently place Nexus operatives at the "
     "same Hyderabad warehouse on September 2nd, consistent with a coordination event.",
     FindingSeverity.MEDIUM, ["colocation", "meeting"],
     ["ent-nexus-person-008", "ent-nexus-org-002", "ent-nexus-org-003"],
     ["ev-nexus-006", "ev-nexus-007"]),
    ("inf-nexus-6", "Money mule pathway identified",
     "Ravi Reddy and Ananya Pillai (person-010, person-009) receive layered funds from "
     "account-003 through TXN-NEX-003, consistent with a money mule recruitment pattern.",
     FindingSeverity.MEDIUM, ["money-mule", "layering"],
     ["ent-nexus-person-009", "ent-nexus-person-010", "ent-nexus-account-004",
      "ent-nexus-txn-003"], ["ev-nexus-003"]),
]

NEXUS_EVENTS: list[tuple[str, str, str, str, str, str]] = [
    ("inevn-001", "Hyderabad warehouse co-location event",
     "Multiple Nexus devices co-located at warehouse premises consistent with a "
     "coordination meeting.",
     "observation", "2026-09-02T21:00:00Z", "Hyderabad"),
    ("inevn-002", "Layered transfer executed",
     "INR 5,20,000 moved through three accounts in under 90 minutes — TXN-NEX-001 chain.",
     "transaction", "2026-09-05T18:05:00Z", "Delhi"),
]

NEXUS_NOTE = (
    "inn-nexus-1",
    "Nexus probe scope: map shell company structure, identify money mule pathway, "
    "establish Delhi–Hyderabad link. Replace demo data with live intelligence as case "
    "progresses.",
    "Inspector Mehta",
)

# (canonical_id, name, source_name, format, category, record_count, file_size,
#  quality_score, warnings, duplicates)
NEXUS_DATASETS: list[tuple[str, str, str, str, str, int, int, float, int, int]] = [
    ("ds-nexus-001", "FIR Records - Delhi North", "FIR Records - Delhi North",
     "pdf", "document", 45, 312000, 0.92, 0, 0),
    ("ds-nexus-002", "CDR Extract - Harness Cell", "CDR Extract - Harness Cell",
     "csv", "structured", 3200, 284000, 0.88, 1, 3),
    ("ds-nexus-003", "Bank SWIFT Trail", "Bank SWIFT Trail",
     "csv", "structured", 128, 42000, 0.95, 0, 0),
    ("ds-nexus-004", "GST Ledger Extract", "GST Ledger Extract",
     "csv", "structured", 90, 61000, 0.90, 0, 0),
    ("ds-nexus-005", "Vehicle Tracking Data", "Vehicle Tracking Data",
     "csv", "structured", 230, 152000, 0.89, 0, 0),
    ("ds-nexus-006", "Cell Tower Data", "Cell Tower Data",
     "json", "structured", 60, 98000, 0.91, 0, 0),
    ("ds-nexus-007", "Hyderabad Warehouse CCTV", "Hyderabad Warehouse CCTV",
     "jpg", "image", 12, 2458624, 0.82, 0, 0),
]

NEXUS_CHAIN_PLAN: dict[str, tuple[str, ...]] = {
    "ev-nexus-001": ("evidence_created", "evidence_verified"),
    "ev-nexus-002": ("evidence_uploaded", "evidence_accessed"),
    "ev-nexus-003": ("evidence_created", "evidence_exported"),
    "ev-nexus-004": ("evidence_uploaded", "evidence_metadata_updated"),
    "ev-nexus-005": ("evidence_uploaded", "evidence_accessed"),
    "ev-nexus-006": ("evidence_uploaded", "evidence_accessed"),
    "ev-nexus-007": ("evidence_created", "evidence_accessed"),
}


def _seed_nexus_investigation(session: AsyncSession) -> Investigation:
    investigation = Investigation(
        id=_uuid("inv-demo-nexus"),
        title="Operation Trinetra Nexus",
        description=(
            "Multi-city financial fraud probe connecting shell companies, money "
            "mules and layered transactions across Delhi, Hyderabad and Mumbai. "
            "Deterministic demonstration data — not live police data."
        ),
        status=InvestigationStatus.ACTIVE,
        priority=InvestigationPriority.HIGH,
        lead_investigator="Inspector Mehta",
        assigned_team=["Inspector Mehta", "Analyst Singh"],
        tags=["fraud", "nexus", "multi-city", "demo"],
        started_at=_utc("2026-07-01T09:00:00Z"),
        closed_at=None,
        metadata_={
            "canonical_id": "inv-demo-nexus",
            "case_id": None,
            "network_id": "NET-004",
            "demo_universe": "nexus",
            "is_demo": True,
            "is_fixture": False,
        },
    )
    session.add(investigation)
    return investigation


def _seed_nexus_entities(session: AsyncSession, investigation_id: uuid.UUID) -> dict[str, Entity]:
    entities: dict[str, Entity] = {}
    for cid, etype, name, canonical_name, confidence, verified, flagged, attributes in NEXUS_ENTITIES:
        entity = Entity(
            id=_uuid(cid),
            investigation_id=investigation_id,
            entity_type=etype,
            canonical_name=canonical_name,
            name=name,
            description=NEXUS_ENTITY_DESCRIPTIONS.get(cid),
            attributes=attributes,
            confidence=confidence,
            is_verified=verified,
            is_flagged=flagged,
            metadata_={
                "canonical_id": cid,
                "demo_universe": "nexus",
                "is_demo": True,
                "is_fixture": False,
            },
        )
        session.add(entity)
        entities[cid] = entity
    assert len(entities) == 35, f"expected 35 Nexus entities, got {len(entities)}"
    return entities


def _seed_nexus_relationships(
    session: AsyncSession,
    investigation_id: uuid.UUID,
    entities: dict[str, Entity],
) -> list[Relationship]:
    rels: list[Relationship] = []
    for idx, (source, target, label, confidence, source_name) in enumerate(
        NEXUS_RELATIONSHIPS, start=1
    ):
        cid = f"rel-nexus-{idx:03d}"
        rel = Relationship(
            id=_uuid(cid),
            investigation_id=investigation_id,
            source_entity_id=entities[source].id,
            target_entity_id=entities[target].id,
            relationship_type=NEXUS_RELATIONSHIP_LABELS[label],
            confidence=confidence,
            source=source_name,
            evidence_refs=[source_name],
            verification_status=VerificationStatus.CONFIRMED,
            description=f"{label} link in the Nexus network.",
            metadata_={
                "canonical_id": cid,
                "label": label,
                "demo_universe": "nexus",
                "is_demo": True,
                "is_fixture": False,
            },
        )
        session.add(rel)
        rels.append(rel)
    assert len(rels) == 60, f"expected 60 Nexus relationships, got {len(rels)}"
    return rels


def _seed_nexus_evidence(
    session: AsyncSession, investigation_id: uuid.UUID
) -> list[InvestigationEvidence]:
    items: list[InvestigationEvidence] = []
    for spec in NEXUS_EVIDENCE:
        item = InvestigationEvidence(
            id=_uuid(spec["cid"]),
            investigation_id=investigation_id,
            evidence_type=spec["evidence_type"],
            title=spec["title"],
            description=spec["description"],
            source=spec["source"],
            provenance={
                "source": spec["source"],
                "source_id": spec["source_id"],
                "record_identifier": spec["record_identifier"],
                "confidence": spec["confidence"],
                "location": spec.get("location"),
            },
            collected_at=_utc(spec["collected_at"]),
            storage_ref=None,
            metadata_={
                "canonical_id": spec["cid"],
                "dataset_id": spec["dataset"],
                "record_identifier": spec["record_identifier"],
                "demo_universe": "nexus",
                "is_demo": True,
                "is_fixture": False,
            },
        )
        evidence_integrity.attach_checksum(item)
        session.add(item)
        items.append(item)
    assert len(items) == 7, f"expected 7 Nexus evidence items, got {len(items)}"
    return items


def _seed_nexus_findings(
    session: AsyncSession,
    investigation_id: uuid.UUID,
    entities: dict[str, Entity],
    evidence: list[InvestigationEvidence],
) -> list[InvestigationFinding]:
    ev_by_cid = {e.metadata_.get("canonical_id"): e for e in evidence}
    findings: list[InvestigationFinding] = []
    for cid, title, description, severity, tags, entity_refs, evidence_refs in NEXUS_FINDINGS:
        finding = InvestigationFinding(
            id=_uuid(cid),
            investigation_id=investigation_id,
            title=title,
            description=description,
            severity=severity,
            confidence=FindingConfidence.ANALYTICAL,
            status=FindingStatus.OPEN,
            entity_refs=[str(entities[ref].id) for ref in entity_refs],
            metadata_={
                "canonical_id": cid,
                "source": "Network Analysis",
                "source_type": "analysis",
                "tags": tags,
                "evidence_ids": [str(ev_by_cid[ref].id) for ref in evidence_refs],
                "demo_universe": "nexus",
                "is_demo": True,
                "is_fixture": False,
            },
        )
        session.add(finding)
        findings.append(finding)
    assert len(findings) == 6, f"expected 6 Nexus findings, got {len(findings)}"
    return findings


def _seed_nexus_events(
    session: AsyncSession, investigation_id: uuid.UUID
) -> list[InvestigationEvent]:
    events: list[InvestigationEvent] = []
    for cid, _title, description, event_type, timestamp, location in NEXUS_EVENTS:
        event = InvestigationEvent(
            id=_uuid(cid),
            investigation_id=investigation_id,
            event_type=event_type,
            timestamp=_utc(timestamp),
            location=location,
            description=description,
            metadata_={
                "canonical_id": cid,
                "demo_universe": "nexus",
                "is_demo": True,
                "is_fixture": False,
            },
        )
        session.add(event)
        events.append(event)
    assert len(events) == 2, f"expected 2 Nexus events, got {len(events)}"
    return events


def _seed_nexus_notes(
    session: AsyncSession, investigation_id: uuid.UUID
) -> list[InvestigationNote]:
    cid, content, author = NEXUS_NOTE
    note = InvestigationNote(
        id=_uuid(cid),
        investigation_id=investigation_id,
        content=content,
        author=author,
        metadata_={
            "canonical_id": cid,
            "demo_universe": "nexus",
            "is_demo": True,
            "is_fixture": False,
        },
    )
    session.add(note)
    return [note]


def _seed_nexus_datasets(
    session: AsyncSession, investigation_id: uuid.UUID
) -> list[Dataset]:
    datasets: list[Dataset] = []
    for cid, name, source_name, fmt, category, record_count, file_size, quality, warns, dups in (
        NEXUS_DATASETS
    ):
        dataset = Dataset(
            id=_uuid(cid),
            investigation_id=investigation_id,
            name=name,
            description=f"{name} for the Nexus investigation.",
            source_name=source_name,
            format=fmt,
            category=category,
            status=DatasetStatus.READY,
            record_count=record_count,
            file_size=file_size,
            file_name=f"{source_name.lower().replace(' ', '_')}.{fmt}",
            quality_score=quality,
            warnings=warns,
            errors=0,
            duplicates=dups,
            metadata_={
                "canonical_id": cid,
                "demo_universe": "nexus",
                "is_demo": True,
                "is_fixture": False,
            },
        )
        session.add(dataset)
        datasets.append(dataset)
    assert len(datasets) == 7, f"expected 7 Nexus datasets, got {len(datasets)}"
    return datasets


def _seed_nexus_ingestion_jobs(
    session: AsyncSession,
    investigation_id: uuid.UUID,
    datasets: list[Dataset],
) -> list[IngestionJob]:
    jobs: list[IngestionJob] = []
    for dataset in datasets:
        record_count = dataset.record_count or 0
        job = IngestionJob(
            id=_uuid(f"ing-{dataset.metadata_.get('canonical_id', dataset.id)}"),
            investigation_id=investigation_id,
            dataset_id=dataset.id,
            status=IngestionJobStatus.COMPLETED,
            progress=100,
            records_processed=record_count,
            entities_extracted=record_count // 2,
            candidates_created=record_count // 3,
            matches_found=record_count // 5,
            errors_list=[],
            warnings_list=[],
            created_by="Inspector Mehta",
            metadata_={
                "demo_universe": "nexus",
                "is_demo": True,
                "is_fixture": False,
            },
        )
        session.add(job)
        jobs.append(job)
    assert len(jobs) == 7, f"expected 7 Nexus ingestion jobs, got {len(jobs)}"
    return jobs


def _seed_nexus_analytics_snapshot(
    session: AsyncSession, investigation_id: uuid.UUID
) -> NetworkAnalyticsSnapshot:
    snapshot = NetworkAnalyticsSnapshot(
        id=_uuid("nas-nexus-1"),
        investigation_id=investigation_id,
        algorithm_version="v1",
        computed_at=_utc("2026-09-08T14:30:00Z"),
        entity_count=35,
        relationship_count=60,
        payload={
            "network_id": "NET-004",
            "nodes": 35,
            "relationships": 60,
            "connected_components": 1,
            "community_count": 3,
            "top_connected_entity": "ent-nexus-person-001",
            "hubs": [{"entity_id": "ent-nexus-person-001", "degree": 14}],
            "bridges": ["ent-nexus-person-005"],
            "clusters": [
                {"id": "cl-nexus-delhi", "label": "Delhi Financial Core"},
                {"id": "cl-nexus-hyd", "label": "Hyderabad Operations"},
                {"id": "cl-nexus-flow", "label": "Layered Money Flow"},
            ],
            "demo_universe": "nexus",
            "is_demo": True,
            "is_fixture": False,
        },
    )
    session.add(snapshot)
    return snapshot


# ---------------------------------------------------------------------------
# Legacy Operation Meridian fixture (inv-006) — non-demo, kept for the
# pre-existing relational tests + real-API client anchor. Not part of the
# canonical presentation seed.
# ---------------------------------------------------------------------------


def _seed_meridian_investigation(session: AsyncSession) -> Investigation:
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
        metadata_={
            "canonical_id": "inv-006",
            "demo_universe": "meridian",
            "is_demo": True,
            "is_fixture": True,
        },
    )
    session.add(investigation)
    return investigation


def _seed_meridian_entities(
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
            metadata_={
                "canonical_id": cid,
                "demo_universe": "meridian",
                "is_demo": True,
                "is_fixture": True,
            },
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


def _seed_meridian_relationships(
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
        r.metadata_ = {
            "canonical_id": str(r.id),
            "demo_universe": "meridian",
            "is_demo": True,
            "is_fixture": True,
        }
        session.add(r)
    return rels


def _seed_meridian_evidence(
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
                "demo_universe": "meridian",
                "is_fixture": True,
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
                "demo_universe": "meridian",
                "is_fixture": True,
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
                "demo_universe": "meridian",
                "is_fixture": True,
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
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
        ),
    ]
    for it in items:
        evidence_integrity.attach_checksum(it)
        session.add(it)
    return items


async def _seed_evidence_chains(
    session: AsyncSession,
    evidence: list[InvestigationEvidence],
    plan: dict[str, tuple[str, ...]],
) -> None:
    """Seed deterministic custody chains for the seeded evidence.

    Each seeded item records a short, fully-linked chain so the demo exposes
    every supported lifecycle action without any application workflow inventing
    events. Entries are deterministic: appending uses locked-tail sequencing
    and fixed actor/detail snapshots, so re-seeding reproduces identical
    hashes. The ``seed_ref`` marker in ``details`` is the idempotency anchor.
    """
    by_cid = {e.metadata_.get("canonical_id"): e for e in evidence}
    service = evidence_chain.EvidenceChainService(session)
    for cid, actions in plan.items():
        item = by_cid.get(cid)
        if item is None:
            continue
        for action_name in actions:
            await service.append(
                evidence=item,
                action=EvidenceChainAction(action_name),
                actor_email="Inspector Mehta",
                details={"seed_ref": f"{cid}-chain", "is_demo": True},
            )


def _seed_meridian_findings(
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
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
        ),
        InvestigationFinding(
            id=_uuid("inf-006-2"),
            investigation_id=investigation_id,
            title="Shared company relationship observed",
            description=(
                "Person of interest and linked person share a company association across records."
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
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
        ),
    ]
    for f in findings:
        session.add(f)
    return findings


def _seed_meridian_events(
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
                "Multiple target devices co-located; consistent with a coordination meeting."
            ),
            metadata_={
                "canonical_id": "event-001",
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
        ),
        InvestigationEvent(
            id=_uuid("event-002"),
            investigation_id=investigation_id,
            event_type="transaction",
            timestamp=_utc("2026-02-14T11:05:00Z"),
            location="Pune",
            description="₹4,80,000 transferred to corporate account 884511900221.",
            metadata_={
                "canonical_id": "event-002",
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
        ),
        InvestigationEvent(
            id=_uuid("event-003"),
            investigation_id=investigation_id,
            event_type="case_event",
            timestamp=_utc("2026-02-05T09:00:00Z"),
            location=None,
            description="Recorded as named individual in case proceedings.",
            metadata_={
                "canonical_id": "event-003",
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
        ),
    ]
    for e in events:
        session.add(e)
    return events


def _seed_meridian_notes(
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
            metadata_={
                "canonical_id": "inn-006-1",
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
        )
    ]
    session.add(notes[0])
    return notes


def _seed_meridian_datasets(
    session: AsyncSession, investigation_id: uuid.UUID
) -> list[Dataset]:
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
            metadata_={
                "canonical_id": "ds-001",
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
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
            metadata_={
                "canonical_id": "ds-002",
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
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
            metadata_={
                "canonical_id": "ds-003",
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
        ),
    ]
    for ds in datasets:
        session.add(ds)
    return datasets


def _seed_meridian_ingestion_jobs(
    session: AsyncSession,
    investigation_id: uuid.UUID,
    datasets: list[Dataset],
) -> list[IngestionJob]:
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
            metadata_={
                "demo_universe": "meridian",
                "is_fixture": True,
                "is_demo": True,
            },
        )
        session.add(job)
        jobs.append(job)
    return jobs


MERIDIAN_CHAIN_PLAN: dict[str, tuple[str, ...]] = {
    "ev-001": ("evidence_created", "evidence_verified"),
    "ev-004": ("evidence_uploaded", "evidence_accessed"),
    "ev-007": ("evidence_uploaded", "evidence_metadata_updated"),
    "ev-009": ("evidence_created", "evidence_exported"),
}


# ---------------------------------------------------------------------------
# Public seeding entry points.
# ---------------------------------------------------------------------------


async def cleanup_investigation(session: AsyncSession, canonical_id: str) -> None:
    """Delete all seeded child rows for the investigation with the given canonical id."""
    from sqlalchemy import delete

    investigation_id = _uuid(canonical_id)
    for model in (
        IngestionJob,
        Dataset,
        Entity,
        Relationship,
        InvestigationEvidence,
        InvestigationFinding,
        InvestigationEvent,
        InvestigationNote,
        EvidenceChainEntry,
        NetworkAnalyticsSnapshot,
    ):
        await session.execute(delete(model).where(model.investigation_id == investigation_id))
    await session.execute(delete(Investigation).where(Investigation.id == investigation_id))
    await session.flush()


async def seed_database(session: AsyncSession, *, force: bool = False) -> None:
    """Populate the database with the canonical demo universe (Operation Trinetra Nexus).

    Users are seeded first and independently of the demo investigation so a
    database seeded before Phase 18.1 still gains the demo accounts on the
    next run. Idempotent: re-running without ``force`` is a no-op once the
    Nexus universe exists; ``force=True`` replaces it deterministically.
    """
    await _seed_demo_users(session)

    existing = await session.get(Investigation, _uuid("inv-demo-nexus"))
    if existing is not None:
        if not force:
            return
        await cleanup_investigation(session, "inv-demo-nexus")

    investigation = _seed_nexus_investigation(session)

    entities = _seed_nexus_entities(session, investigation.id)
    _seed_nexus_relationships(session, investigation.id, entities)
    evidence = _seed_nexus_evidence(session, investigation.id)
    _seed_nexus_findings(session, investigation.id, entities, evidence)
    _seed_nexus_events(session, investigation.id)
    _seed_nexus_notes(session, investigation.id)
    datasets = _seed_nexus_datasets(session, investigation.id)
    _seed_nexus_ingestion_jobs(session, investigation.id, datasets)
    _seed_nexus_analytics_snapshot(session, investigation.id)
    # Flush so chain rows' evidence FK resolves before insertion (Postgres
    # enforces it eagerly; SQLite without PRAGMA does not).
    await session.flush()
    # Deterministic custody chains for the seeded Nexus evidence.
    await _seed_evidence_chains(session, evidence, NEXUS_CHAIN_PLAN)

    await session.flush()


async def seed_operation_meridian(session: AsyncSession, *, force: bool = False) -> None:
    """Seed the legacy Operation Meridian (inv-006) universe as a FIXTURE.

    This is NOT the canonical presentation seed. Pre-existing relational tests
    and the real-API client anchor on this deterministic historic universe, so
    it is kept available as an explicit (non-default) fixture.
    """
    await _seed_demo_users(session)

    existing = await session.get(Investigation, _uuid("inv-006"))
    if existing is not None:
        if not force:
            return
        await cleanup_investigation(session, "inv-006")

    investigation = _seed_meridian_investigation(session)

    entities = _seed_meridian_entities(session, investigation.id)
    _seed_meridian_relationships(session, investigation.id, entities)
    evidence = _seed_meridian_evidence(session, investigation.id)
    _seed_meridian_findings(session, investigation.id, entities, evidence)
    _seed_meridian_events(session, investigation.id)
    _seed_meridian_notes(session, investigation.id)
    datasets = _seed_meridian_datasets(session, investigation.id)
    _seed_meridian_ingestion_jobs(session, investigation.id, datasets)
    await session.flush()
    await _seed_evidence_chains(session, evidence, MERIDIAN_CHAIN_PLAN)

    await session.flush()


# ---------------------------------------------------------------------------
# Phase 18.1 — development/demo users (BCrypt-hashed, DEVELOPMENT ONLY).
# ---------------------------------------------------------------------------
# The passwords below exist solely so the demo and the backend security test
# surface can log in locally. They MUST be changed (or the accounts removed)
# before a real production rollout. The application NEVER seeds these users
# itself on deploy — seeding is the same documented step as the demo data,
# and production installs a different, private account set.
DEMO_USERS: list[tuple[str, str, UserRole, str]] = [
    (
        "investigator@trinetra.dev",
        "Investigator User",
        UserRole.INVESTIGATOR,
        "Investigator!2026",
    ),
    (
        "supervisor@trinetra.dev",
        "Supervisor User",
        UserRole.SUPERVISOR,
        "Supervisor!2026",
    ),
    (
        "admin@trinetra.dev",
        "Administrator User",
        UserRole.ADMIN,
        "Admin!2026",
    ),
    (
        "auditor@trinetra.dev",
        "Auditor User",
        UserRole.AUDITOR,
        "Auditor!2026",
    ),
]


async def _seed_demo_users(session: AsyncSession) -> None:
    """Create the deterministic Phase 18.1 demo users (idempotent).

    Existing accounts are left untouched so re-seeding never overrides a
    password a developer has already changed.
    """
    for email, display_name, role, password in DEMO_USERS:
        existing = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        if existing is not None:
            continue
        session.add(
            User(
                email=email,
                password_hash=hash_password(password),
                display_name=display_name,
                role=role,
                is_active=True,
                metadata_={"is_demo": True},
            )
        )


DEMO_USER_LOGINS: dict[str, str] = {email: password for email, _, _, password in DEMO_USERS}


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
    print("Seeded canonical demo universe: Operation Trinetra Nexus (inv-demo-nexus) / NET-004.")
    print("Presentation surface: 35 entities / 60 relationships / 3 clusters / 6 findings /")
    print("7 evidence / 2 events / 1 note / 7 datasets.")
    print("The legacy Operation Meridian (inv-006) universe stays available as a fixture")
    print("via app.db.seed.seed_operation_meridian and is NOT part of the demo seed.")
    print("Demo logins (DEVELOPMENT ONLY):")
    for email, password in DEMO_USER_LOGINS.items():
        print(f"  {email} / {password}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(_run())
