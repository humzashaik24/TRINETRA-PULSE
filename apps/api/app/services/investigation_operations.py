"""Investigation operations (Phase 11) service (in-memory).

Case lifecycle & intelligence operations surface: pipeline, readiness,
health, review queue, activity log, saved views, graph/timeline
bookmarks, cross-references and provenance chains, and investigation-
scoped search. Mirrors the frontend operations mock for the demo
investigation Operation Meridian (inv-006) and related cases.

All cross-reference/provenance ids are real canonical ids (ent-*, rel-*,
ev-*, ds-*, inf-*) so nothing points at orphan records.
"""

from __future__ import annotations

from typing import Any

from app.schemas.investigation_operations import (
    CrossReference,
    GraphBookmark,
    InvestigationActivityLog,
    InvestigationHealth,
    InvestigationPipeline,
    InvestigationReadiness,
    InvestigationSearchKind,
    InvestigationSearchResult,
    ProvenanceChain,
    ReviewItem,
    SavedInvestigationView,
    TimelineBookmark,
)

_InvestigationId = str

# ---------------------------------------------------------------------------
# In-memory stores (seeded lazily via seed_operations())
# ---------------------------------------------------------------------------

_PIPELINE: dict[_InvestigationId, dict[str, Any]] = {}
_READINESS: dict[_InvestigationId, dict[str, Any]] = {}
_HEALTH: dict[_InvestigationId, dict[str, Any]] = {}
_REVIEW: dict[_InvestigationId, list[dict[str, Any]]] = {}
_ACTIVITY: dict[_InvestigationId, list[dict[str, Any]]] = {}
_VIEWS: dict[_InvestigationId, list[dict[str, Any]]] = {}
_GRAPH_BOOKMARKS: dict[_InvestigationId, list[dict[str, Any]]] = {}
_TIMELINE_BOOKMARKS: dict[_InvestigationId, list[dict[str, Any]]] = {}
_CROSS_REFS: dict[_InvestigationId, list[dict[str, Any]]] = {}
_PROVENANCE: dict[_InvestigationId, list[dict[str, Any]]] = {}
_SEARCH: dict[_InvestigationId, list[dict[str, Any]]] = {}

_VALID_INVESTIGATIONS = {"inv-001", "inv-002", "inv-003", "inv-004", "inv-005", "inv-006"}


def reset_operations() -> None:
    """Clear all stores (used by tests for isolation)."""
    for store in (
        _PIPELINE,
        _READINESS,
        _HEALTH,
        _REVIEW,
        _ACTIVITY,
        _VIEWS,
        _GRAPH_BOOKMARKS,
        _TIMELINE_BOOKMARKS,
        _CROSS_REFS,
        _PROVENANCE,
        _SEARCH,
    ):
        store.clear()


def _require(investigation_id: str) -> None:
    if investigation_id not in _VALID_INVESTIGATIONS:
        raise KeyError(f"Investigation not found: {investigation_id}")


def seed_operations() -> None:
    """Seed deterministic lifecycle data for the demo investigations."""
    if _READINESS:
        return

    # ---- inv-006 · Operation Meridian (active/high demo anchor) ----
    _PIPELINE["inv-006"] = {
        "investigation_id": "inv-006",
        "current_stage": "findings",
        "progress": 84,
        "completed_stages": [
            "data",
            "extraction",
            "resolution",
            "relationships",
            "network",
            "analytics",
            "evidence",
            "findings",
        ],
        "need_review": ["analytics"],
        "next_recommended_action": "Review the analytics coverage before finalising findings.",
        "stages": [
            {
                "stage": "data",
                "label": "Data",
                "description": "Ingest and validate datasets",
                "status": "COMPLETED",
                "started_at": "2026-08-18T08:00:00Z",
                "completed_at": "2026-08-18T08:20:00Z",
                "count": 3,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/data-intelligence",
            },
            {
                "stage": "extraction",
                "label": "Extraction",
                "description": "Extract entities from sources",
                "status": "COMPLETED",
                "started_at": "2026-08-18T08:21:00Z",
                "completed_at": "2026-08-18T09:00:00Z",
                "count": 5,
                "warning_count": 1,
                "error_count": 0,
                "target_workspace": "/entity-intelligence",
            },
            {
                "stage": "resolution",
                "label": "Resolution",
                "description": "Resolve duplicate entities",
                "status": "COMPLETED",
                "started_at": "2026-08-18T09:01:00Z",
                "completed_at": "2026-08-18T09:30:00Z",
                "count": 1,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/entity-intelligence",
            },
            {
                "stage": "relationships",
                "label": "Relationships",
                "description": "Build relationship links",
                "status": "COMPLETED",
                "started_at": "2026-08-19T09:00:00Z",
                "completed_at": "2026-08-20T11:00:00Z",
                "count": 4,
                "warning_count": 1,
                "error_count": 0,
                "target_workspace": "/networks",
            },
            {
                "stage": "network",
                "label": "Network",
                "description": "Generate the network graph",
                "status": "COMPLETED",
                "started_at": "2026-08-22T09:00:00Z",
                "completed_at": "2026-08-22T09:30:00Z",
                "count": 1,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/networks",
            },
            {
                "stage": "analytics",
                "label": "Analytics",
                "description": "Compute network analytics",
                "status": "NEEDS_REVIEW",
                "started_at": "2026-08-23T09:05:00Z",
                "completed_at": None,
                "count": 1,
                "warning_count": 1,
                "error_count": 0,
                "target_workspace": "/analytics",
            },
            {
                "stage": "evidence",
                "label": "Evidence",
                "description": "Link evidence items",
                "status": "COMPLETED",
                "started_at": "2026-08-21T11:10:00Z",
                "completed_at": "2026-08-24T10:00:00Z",
                "count": 4,
                "warning_count": 1,
                "error_count": 0,
                "target_workspace": "/evidence",
            },
            {
                "stage": "findings",
                "label": "Findings",
                "description": "Record analytical findings",
                "status": "RUNNING",
                "started_at": "2026-08-24T09:00:00Z",
                "completed_at": None,
                "count": 2,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/findings",
            },
            {
                "stage": "timeline",
                "label": "Timeline",
                "description": "Aggregate the event timeline",
                "status": "NOT_STARTED",
                "started_at": None,
                "completed_at": None,
                "count": None,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/timeline",
            },
        ],
    }

    _READINESS["inv-006"] = {
        "investigation_id": "inv-006",
        "overall": "in_progress",
        "next_recommended_action": "Confirm analytics coverage and complete the timeline.",
        "items": [
            {
                "key": "data",
                "label": "Data",
                "level": "ready",
                "detail": "3 datasets",
                "warning_count": 0,
            },
            {
                "key": "datasets",
                "label": "Datasets",
                "level": "ready",
                "detail": "4 datasets linked",
                "warning_count": 0,
            },
            {
                "key": "entities",
                "label": "Entities",
                "level": "ready",
                "detail": "5 entities",
                "warning_count": 0,
            },
            {
                "key": "relationships",
                "label": "Relationships",
                "level": "in_progress",
                "detail": "4 relationships",
                "warning_count": 1,
            },
            {
                "key": "evidence",
                "label": "Evidence",
                "level": "ready",
                "detail": "4 evidence items",
                "warning_count": 0,
            },
            {
                "key": "findings",
                "label": "Findings",
                "level": "in_progress",
                "detail": "2 findings",
                "warning_count": 0,
            },
            {
                "key": "network",
                "label": "Network",
                "level": "ready",
                "detail": "1 network",
                "warning_count": 0,
            },
            {
                "key": "analytics",
                "label": "Analytics",
                "level": "needs_attention",
                "detail": "1 snapshot",
                "warning_count": 1,
            },
            {
                "key": "timeline",
                "label": "Timeline",
                "level": "not_started",
                "detail": None,
                "warning_count": 0,
            },
            {
                "key": "ai",
                "label": "AI",
                "level": "in_progress",
                "detail": "Context ready",
                "warning_count": 0,
            },
        ],
    }

    _HEALTH["inv-006"] = {
        "investigation_id": "inv-006",
        "open_review_count": 2,
        "computed_at": "2026-08-26T12:00:00Z",
        "metrics": [
            {
                "key": "data_completeness",
                "label": "Data completeness",
                "value": 92,
                "total": 100,
                "detail": "3 of 3 expected datasets",
                "has_issues": False,
            },
            {
                "key": "entity_resolution_coverage",
                "label": "Entity resolution coverage",
                "value": 88,
                "total": 100,
                "detail": "5 of 6 candidates resolved",
                "has_issues": False,
            },
            {
                "key": "relationship_coverage",
                "label": "Relationship coverage",
                "value": 74,
                "total": 100,
                "detail": "One link based on a single source",
                "has_issues": True,
            },
            {
                "key": "evidence_coverage",
                "label": "Evidence coverage",
                "value": 85,
                "total": 100,
                "detail": "4 evidence items linked",
                "has_issues": False,
            },
            {
                "key": "network_readiness",
                "label": "Network readiness",
                "value": 90,
                "total": 100,
                "detail": "Network generated and analysable",
                "has_issues": False,
            },
            {
                "key": "analytics_readiness",
                "label": "Analytics readiness",
                "value": 60,
                "total": 100,
                "detail": "Baseline captured; review pending",
                "has_issues": True,
            },
            {
                "key": "open_review_items",
                "label": "Open review items",
                "value": 40,
                "total": 100,
                "detail": "2 items awaiting a decision",
                "has_issues": True,
            },
        ],
    }

    _REVIEW["inv-006"] = [
        {
            "id": "rvq-006-1",
            "investigation_id": "inv-006",
            "kind": "relationship_review",
            "priority": "MEDIUM",
            "title": "Relationship needs corroboration",
            "description": (
                "KNOWS link between Rahul Kumar and Vikram Patel is based on a single "
                "source record (confidence 0.74)."
            ),
            "ref_type": "relationship",
            "ref_id": "inr-006-2",
            "created_at": "2026-08-19T09:00:00Z",
            "resolved": False,
        },
        {
            "id": "rvq-006-2",
            "investigation_id": "inv-006",
            "kind": "evidence_missing_metadata",
            "priority": "LOW",
            "title": "Evidence missing source reference",
            "description": "One evidence item is not yet fully referenced to a source record.",
            "ref_type": "evidence",
            "ref_id": "inev-006-4",
            "created_at": "2026-08-21T11:10:00Z",
            "resolved": False,
        },
    ]

    _ACTIVITY["inv-006"] = [
        {
            "id": "fact-006-6",
            "investigation_id": "inv-006",
            "action": "asked_ai",
            "label": "Asked AI",
            "detail": "Assistant explained the primary entity and its connections",
            "at": "2026-08-26T12:00:00Z",
            "actor": "Inspector Mehta",
        },
        {
            "id": "fact-006-5",
            "investigation_id": "inv-006",
            "action": "opened_network",
            "label": "Opened network",
            "detail": "Opened Operation Clean network",
            "at": "2026-08-26T11:40:00Z",
            "actor": "Inspector Mehta",
        },
        {
            "id": "fact-006-4",
            "investigation_id": "inv-006",
            "action": "viewed_evidence",
            "label": "Viewed evidence",
            "detail": "Inspected flagged transaction record",
            "at": "2026-08-26T11:20:00Z",
            "actor": "Analyst Singh",
        },
        {
            "id": "fact-006-3",
            "investigation_id": "inv-006",
            "action": "opened_entity",
            "label": "Opened entity",
            "detail": "Inspected profile for Rahul Kumar",
            "at": "2026-08-26T11:10:00Z",
            "actor": "Inspector Mehta",
        },
        {
            "id": "fact-006-2",
            "investigation_id": "inv-006",
            "action": "created_finding",
            "label": "Created finding",
            "detail": "Shared company relationship observed",
            "at": "2026-08-25T10:00:00Z",
            "actor": "Inspector Mehta",
        },
        {
            "id": "fact-006-1",
            "investigation_id": "inv-006",
            "action": "opened_investigation",
            "label": "Opened investigation",
            "detail": "Opened Operation Meridian",
            "at": "2026-08-18T09:00:00Z",
            "actor": "Inspector Mehta",
        },
    ]

    _VIEWS["inv-006"] = [
        {
            "id": "sav-006-1",
            "investigation_id": "inv-006",
            "name": "Meridian Core Cluster",
            "description": "Primary device, account and flagged transaction.",
            "network_filters": {"relationshipTypes": ["USES", "OWNS_ACCOUNT", "SENT_TRANSACTION"]},
            "timeline_range": {"from": "2026-08-18T00:00:00Z", "to": None},
            "selected_entities": [
                "ent-person-001",
                "ent-phone-001",
                "ent-account-001",
                "ent-txn-001",
            ],
            "analytics_scope": {"centralityType": "pagerank"},
            "created_at": "2026-08-24T10:00:00Z",
        }
    ]

    _GRAPH_BOOKMARKS["inv-006"] = [
        {
            "id": "gbm-006-1",
            "investigation_id": "inv-006",
            "network_id": "NET-001",
            "label": "Meridian core selection",
            "entity_ids": ["ent-person-001", "ent-phone-001", "ent-txn-001"],
            "relationship_ids": ["rel-001", "rel-008"],
            "created_at": "2026-08-24T11:00:00Z",
        }
    ]

    _TIMELINE_BOOKMARKS["inv-006"] = [
        {
            "id": "tbm-006-1",
            "investigation_id": "inv-006",
            "label": "Meridian Incident Period",
            "start": "2026-02-14T00:00:00Z",
            "end": "2026-02-19T23:59:59Z",
            "filters": {"entityTypes": ["person", "organization", "transaction"]},
            "created_at": "2026-08-25T09:00:00Z",
        }
    ]

    _CROSS_REFS["inv-006"] = [
        {
            "id": "xr-006-1",
            "investigation_id": "inv-006",
            "entity": {
                "type": "entity",
                "id": "ent-person-001",
                "label": "Rahul Kumar",
            },
            "relationships": [
                {
                    "type": "relationship",
                    "id": "rel-001",
                    "label": "USES — primary device",
                },
                {
                    "type": "relationship",
                    "id": "rel-005",
                    "label": "WORKS_FOR — Mumbai Trading Corp",
                },
                {
                    "type": "relationship",
                    "id": "rel-008",
                    "label": "SENT_TRANSACTION — flagged",
                },
            ],
            "evidence": [
                {
                    "type": "evidence",
                    "id": "ev-001",
                    "label": "FIR record — named accused",
                },
                {
                    "type": "evidence",
                    "id": "ev-004",
                    "label": "CDR subscriber records",
                },
                {
                    "type": "evidence",
                    "id": "ev-009",
                    "label": "Flagged transaction record",
                },
            ],
            "findings": [
                {
                    "type": "finding",
                    "id": "inf-006-1",
                    "label": "Coordinate cluster around the primary device",
                },
                {
                    "type": "finding",
                    "id": "inf-006-2",
                    "label": "Shared company relationship observed",
                },
            ],
            "links": [
                {"from_type": "entity", "to_type": "relationship"},
                {"from_type": "relationship", "to_type": "evidence"},
                {"from_type": "entity", "to_type": "finding"},
                {"from_type": "finding", "to_type": "evidence"},
            ],
        }
    ]

    _PROVENANCE["inv-006"] = [
        {
            "id": "prov-006-1",
            "investigation_id": "inv-006",
            "target_type": "relationship",
            "target_id": "rel-001",
            "timestamp": "2026-08-18T09:12:00Z",
            "nodes": [
                {
                    "type": "source",
                    "id": "src-cdr",
                    "label": "Communication Data",
                    "detail": "CDR extract source",
                    "timestamp": None,
                },
                {
                    "type": "dataset",
                    "id": "ds-002",
                    "label": "CDR Extract - Operation clean",
                    "detail": "Call detail records",
                    "timestamp": None,
                },
                {
                    "type": "record",
                    "id": "rec-cdr-2241",
                    "label": "cdr_extract.csv #2241",
                    "detail": "Subscriber record",
                    "timestamp": "2026-02-14T11:05:00Z",
                },
                {
                    "type": "entity",
                    "id": "ent-phone-001",
                    "label": "+91 98765 43210",
                    "detail": "Phone entity",
                    "timestamp": None,
                },
                {
                    "type": "relationship",
                    "id": "rel-001",
                    "label": "USES",
                    "detail": "Subscriber link",
                    "timestamp": "2026-08-18T09:12:00Z",
                },
                {
                    "type": "finding",
                    "id": "inf-006-1",
                    "label": "Coordinate cluster",
                    "detail": "Related finding",
                    "timestamp": "2026-08-24T09:00:00Z",
                },
            ],
        }
    ]

    _SEARCH["inv-006"] = [
        {
            "id": "s1-006",
            "investigation_id": "inv-006",
            "kind": "entity",
            "label": "Rahul Kumar",
            "description": "Person of interest",
            "ref_id": "ent-person-001",
            "score": 0.95,
        },
        {
            "id": "s2-006",
            "investigation_id": "inv-006",
            "kind": "entity",
            "label": "Vikram Patel",
            "description": "Linked person",
            "ref_id": "ent-person-003",
            "score": 0.74,
        },
        {
            "id": "s3-006",
            "investigation_id": "inv-006",
            "kind": "relationship",
            "label": "Rahul Kumar USES +91 98765 43210",
            "description": "Subscriber link",
            "ref_id": "rel-001",
            "score": 0.98,
        },
        {
            "id": "s4-006",
            "investigation_id": "inv-006",
            "kind": "evidence",
            "label": "FIR record — named accused",
            "description": "Case scan",
            "ref_id": "ev-001",
            "score": 0.88,
        },
        {
            "id": "s5-006",
            "investigation_id": "inv-006",
            "kind": "finding",
            "label": "Coordinate cluster around the primary device",
            "description": "Association finding",
            "ref_id": "inf-006-1",
            "score": 0.87,
        },
        {
            "id": "s6-006",
            "investigation_id": "inv-006",
            "kind": "dataset",
            "label": "CDR Extract - Operation clean",
            "description": "Call detail records",
            "ref_id": "ds-002",
            "score": 0.8,
        },
    ]

    # ---- A lighter set for inv-001 (Operation Clean) ----
    _PIPELINE["inv-001"] = {
        "investigation_id": "inv-001",
        "current_stage": "evidence",
        "progress": 66,
        "completed_stages": [
            "data",
            "extraction",
            "resolution",
            "relationships",
            "network",
            "analytics",
            "evidence",
        ],
        "need_review": [],
        "next_recommended_action": None,
        "stages": [
            {
                "stage": "data",
                "label": "Data",
                "description": "Ingest and validate datasets",
                "status": "COMPLETED",
                "started_at": "2026-02-10T08:00:00Z",
                "completed_at": "2026-02-10T08:30:00Z",
                "count": 3,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/data-intelligence",
            },
            {
                "stage": "extraction",
                "label": "Extraction",
                "description": "Extract entities from sources",
                "status": "COMPLETED",
                "started_at": "2026-02-10T08:31:00Z",
                "completed_at": "2026-02-10T09:00:00Z",
                "count": 4,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/entity-intelligence",
            },
            {
                "stage": "resolution",
                "label": "Resolution",
                "description": "Resolve duplicate entities",
                "status": "COMPLETED",
                "started_at": "2026-02-10T09:01:00Z",
                "completed_at": "2026-02-10T09:30:00Z",
                "count": 1,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/entity-intelligence",
            },
            {
                "stage": "relationships",
                "label": "Relationships",
                "description": "Build relationship links",
                "status": "COMPLETED",
                "started_at": "2026-02-10T09:31:00Z",
                "completed_at": "2026-02-10T10:00:00Z",
                "count": 3,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/networks",
            },
            {
                "stage": "network",
                "label": "Network",
                "description": "Generate the network graph",
                "status": "COMPLETED",
                "started_at": "2026-02-10T10:01:00Z",
                "completed_at": "2026-02-10T10:20:00Z",
                "count": 1,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/networks",
            },
            {
                "stage": "analytics",
                "label": "Analytics",
                "description": "Compute network analytics",
                "status": "COMPLETED",
                "started_at": "2026-02-10T10:21:00Z",
                "completed_at": "2026-02-10T10:40:00Z",
                "count": 1,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/analytics",
            },
            {
                "stage": "evidence",
                "label": "Evidence",
                "description": "Link evidence items",
                "status": "RUNNING",
                "started_at": "2026-08-12T09:00:00Z",
                "completed_at": None,
                "count": 5,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/evidence",
            },
            {
                "stage": "findings",
                "label": "Findings",
                "description": "Record analytical findings",
                "status": "NOT_STARTED",
                "started_at": None,
                "completed_at": None,
                "count": None,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/findings",
            },
            {
                "stage": "timeline",
                "label": "Timeline",
                "description": "Aggregate the event timeline",
                "status": "NOT_STARTED",
                "started_at": None,
                "completed_at": None,
                "count": None,
                "warning_count": 0,
                "error_count": 0,
                "target_workspace": "/timeline",
            },
        ],
    }

    _READINESS["inv-001"] = {
        "investigation_id": "inv-001",
        "overall": "in_progress",
        "next_recommended_action": None,
        "items": [
            {
                "key": "data",
                "label": "Data",
                "level": "ready",
                "detail": "3 datasets",
                "warning_count": 0,
            },
            {
                "key": "datasets",
                "label": "Datasets",
                "level": "ready",
                "detail": "3 datasets linked",
                "warning_count": 0,
            },
            {
                "key": "entities",
                "label": "Entities",
                "level": "ready",
                "detail": "6 entities",
                "warning_count": 0,
            },
            {
                "key": "relationships",
                "label": "Relationships",
                "level": "ready",
                "detail": "3 relationships",
                "warning_count": 0,
            },
            {
                "key": "evidence",
                "label": "Evidence",
                "level": "in_progress",
                "detail": "5 evidence items",
                "warning_count": 0,
            },
            {
                "key": "findings",
                "label": "Findings",
                "level": "not_started",
                "detail": None,
                "warning_count": 0,
            },
            {
                "key": "network",
                "label": "Network",
                "level": "ready",
                "detail": "1 network",
                "warning_count": 0,
            },
            {
                "key": "analytics",
                "label": "Analytics",
                "level": "ready",
                "detail": "1 snapshot",
                "warning_count": 0,
            },
            {
                "key": "timeline",
                "label": "Timeline",
                "level": "not_started",
                "detail": None,
                "warning_count": 0,
            },
            {
                "key": "ai",
                "label": "AI",
                "level": "in_progress",
                "detail": "Context ready",
                "warning_count": 0,
            },
        ],
    }

    _HEALTH["inv-001"] = {
        "investigation_id": "inv-001",
        "open_review_count": 0,
        "computed_at": "2026-08-26T12:05:00Z",
        "metrics": [
            {
                "key": "data_completeness",
                "label": "Data completeness",
                "value": 95,
                "total": 100,
                "detail": "3 of 3 expected datasets",
                "has_issues": False,
            },
            {
                "key": "entity_resolution_coverage",
                "label": "Entity resolution coverage",
                "value": 90,
                "total": 100,
                "detail": "6 of 6 candidates resolved",
                "has_issues": False,
            },
            {
                "key": "relationship_coverage",
                "label": "Relationship coverage",
                "value": 90,
                "total": 100,
                "detail": "All links corroborated",
                "has_issues": False,
            },
            {
                "key": "evidence_coverage",
                "label": "Evidence coverage",
                "value": 82,
                "total": 100,
                "detail": "5 evidence items linked",
                "has_issues": False,
            },
            {
                "key": "network_readiness",
                "label": "Network readiness",
                "value": 92,
                "total": 100,
                "detail": "Network generated and analysable",
                "has_issues": False,
            },
            {
                "key": "analytics_readiness",
                "label": "Analytics readiness",
                "value": 100,
                "total": 100,
                "detail": "Baseline captured",
                "has_issues": False,
            },
            {
                "key": "open_review_items",
                "label": "Open review items",
                "value": 100,
                "total": 100,
                "detail": "No open items",
                "has_issues": False,
            },
        ],
    }

    _REVIEW["inv-001"] = []
    _ACTIVITY["inv-001"] = [
        {
            "id": "fact-001-2",
            "investigation_id": "inv-001",
            "action": "opened_network",
            "label": "Opened network",
            "detail": "Opened Operation Clean network",
            "at": "2026-08-13T10:00:00Z",
            "actor": "Inspector Mehta",
        },
        {
            "id": "fact-001-1",
            "investigation_id": "inv-001",
            "action": "opened_investigation",
            "label": "Opened investigation",
            "detail": "Opened Operation Clean",
            "at": "2026-02-10T09:00:00Z",
            "actor": "Inspector Mehta",
        },
    ]

    _CROSS_REFS["inv-001"] = [
        {
            "id": "xr-001-1",
            "investigation_id": "inv-001",
            "entity": {
                "type": "entity",
                "id": "ent-person-001",
                "label": "Rahul Kumar",
            },
            "relationships": [
                {
                    "type": "relationship",
                    "id": "rel-001",
                    "label": "USES — primary device",
                },
                {
                    "type": "relationship",
                    "id": "rel-005",
                    "label": "WORKS_FOR — Mumbai Trading Corp",
                },
                {
                    "type": "relationship",
                    "id": "rel-007",
                    "label": "OWNS_ACCOUNT — flagged account",
                },
            ],
            "evidence": [
                {
                    "type": "evidence",
                    "id": "ev-001",
                    "label": "FIR record — named accused",
                },
                {
                    "type": "evidence",
                    "id": "ev-004",
                    "label": "CDR subscriber records",
                },
                {
                    "type": "evidence",
                    "id": "ev-007",
                    "label": "GST registration",
                },
            ],
            "findings": [
                {
                    "type": "finding",
                    "id": "inf-001-1",
                    "label": "Concentrated usage around the primary device",
                },
                {
                    "type": "finding",
                    "id": "inf-001-2",
                    "label": "Company relationship observed",
                },
            ],
            "links": [
                {"from_type": "entity", "to_type": "relationship"},
                {"from_type": "relationship", "to_type": "evidence"},
                {"from_type": "entity", "to_type": "finding"},
                {"from_type": "finding", "to_type": "evidence"},
            ],
        }
    ]

    _PROVENANCE["inv-001"] = [
        {
            "id": "prov-001-1",
            "investigation_id": "inv-001",
            "target_type": "relationship",
            "target_id": "rel-007",
            "timestamp": "2026-08-04T11:25:00Z",
            "nodes": [
                {
                    "type": "source",
                    "id": "src-bank",
                    "label": "Transaction Data",
                    "detail": "Flagged transaction source",
                    "timestamp": None,
                },
                {
                    "type": "dataset",
                    "id": "ds-003",
                    "label": "Bank Transaction Log",
                    "detail": "Suspicious transaction patterns",
                    "timestamp": None,
                },
                {
                    "type": "record",
                    "id": "rec-bank-132",
                    "label": "Row 132",
                    "detail": "Flagged transaction record",
                    "timestamp": "2026-02-14T11:05:00Z",
                },
                {
                    "type": "entity",
                    "id": "ent-account-001",
                    "label": "7731 0029 4567",
                    "detail": "Account entity",
                    "timestamp": None,
                },
                {
                    "type": "relationship",
                    "id": "rel-007",
                    "label": "OWNS_ACCOUNT",
                    "detail": "Account ownership link",
                    "timestamp": "2026-08-04T11:25:00Z",
                },
                {
                    "type": "finding",
                    "id": "inf-001-1",
                    "label": "Concentrated usage",
                    "detail": "Related finding",
                    "timestamp": "2026-08-09T08:00:00Z",
                },
            ],
        }
    ]

    _SEARCH["inv-001"] = [
        {
            "id": "s1-001",
            "investigation_id": "inv-001",
            "kind": "entity",
            "label": "Rahul Kumar",
            "description": "Primary person of interest",
            "ref_id": "ent-person-001",
            "score": 0.95,
        },
        {
            "id": "s2-001",
            "investigation_id": "inv-001",
            "kind": "entity",
            "label": "+91 98765 43210",
            "description": "Primary device",
            "ref_id": "ent-phone-001",
            "score": 0.9,
        },
        {
            "id": "s3-001",
            "investigation_id": "inv-001",
            "kind": "relationship",
            "label": "Rahul Kumar USES +91 98765 43210",
            "description": "Subscriber link",
            "ref_id": "rel-001",
            "score": 0.9,
        },
        {
            "id": "s4-001",
            "investigation_id": "inv-001",
            "kind": "evidence",
            "label": "FIR record — named accused",
            "description": "Case scan",
            "ref_id": "ev-001",
            "score": 0.88,
        },
        {
            "id": "s5-001",
            "investigation_id": "inv-001",
            "kind": "dataset",
            "label": "CDR Extract - Operation clean",
            "description": "Call detail records",
            "ref_id": "ds-002",
            "score": 0.8,
        },
    ]


# ---------------------------------------------------------------------------
# Pipeline / readiness / health
# ---------------------------------------------------------------------------


def get_pipeline(investigation_id: str) -> InvestigationPipeline:
    _require(investigation_id)
    seed_operations()
    row = _PIPELINE.get(investigation_id)
    if not row:
        raise KeyError(f"No pipeline for investigation: {investigation_id}")
    return InvestigationPipeline(**row)


def get_readiness(investigation_id: str) -> InvestigationReadiness:
    _require(investigation_id)
    seed_operations()
    row = _READINESS.get(investigation_id)
    if not row:
        raise KeyError(f"No readiness for investigation: {investigation_id}")
    return InvestigationReadiness(**row)


def get_health(investigation_id: str) -> InvestigationHealth:
    _require(investigation_id)
    seed_operations()
    row = _HEALTH.get(investigation_id)
    if not row:
        raise KeyError(f"No health for investigation: {investigation_id}")
    return InvestigationHealth(**row)


def get_review_queue(investigation_id: str, resolved: bool | None = None) -> list[ReviewItem]:
    _require(investigation_id)
    seed_operations()
    items = _REVIEW.get(investigation_id, [])
    if resolved is not None:
        items = [i for i in items if i["resolved"] is resolved]
    return [ReviewItem(**i) for i in items]


def get_activity(investigation_id: str) -> list[InvestigationActivityLog]:
    _require(investigation_id)
    seed_operations()
    items = _ACTIVITY.get(investigation_id, [])
    return [
        InvestigationActivityLog(**i) for i in sorted(items, key=lambda a: a["at"], reverse=True)
    ]


# ---------------------------------------------------------------------------
# Saved views & bookmarks
# ---------------------------------------------------------------------------


def list_saved_views(investigation_id: str) -> list[SavedInvestigationView]:
    _require(investigation_id)
    seed_operations()
    return [SavedInvestigationView(**v) for v in _VIEWS.get(investigation_id, [])]


def create_saved_view(investigation_id: str, payload: dict[str, Any]) -> SavedInvestigationView:
    _require(investigation_id)
    seed_operations()
    view = SavedInvestigationView(
        id=f"sav-{investigation_id}-{len(_VIEWS.get(investigation_id, [])) + 1:03d}",
        investigation_id=investigation_id,
        name=payload["name"],
        description=payload.get("description"),
        network_filters=payload.get("network_filters", {}),
        timeline_range=payload.get("timeline_range"),
        selected_entities=payload.get("selected_entities", []),
        analytics_scope=payload.get("analytics_scope", {}),
        created_at=_now_iso(),
    )
    _VIEWS.setdefault(investigation_id, []).insert(0, view.model_dump())
    return view


def delete_saved_view(investigation_id: str, view_id: str) -> None:
    _require(investigation_id)
    seed_operations()
    _VIEWS[investigation_id] = [v for v in _VIEWS.get(investigation_id, []) if v["id"] != view_id]


def list_graph_bookmarks(investigation_id: str) -> list[GraphBookmark]:
    _require(investigation_id)
    seed_operations()
    return [GraphBookmark(**b) for b in _GRAPH_BOOKMARKS.get(investigation_id, [])]


def create_graph_bookmark(investigation_id: str, payload: dict[str, Any]) -> GraphBookmark:
    _require(investigation_id)
    seed_operations()
    bookmark = GraphBookmark(
        id=f"gbm-{investigation_id}-{len(_GRAPH_BOOKMARKS.get(investigation_id, [])) + 1:03d}",
        investigation_id=investigation_id,
        network_id=payload["network_id"],
        label=payload["label"],
        entity_ids=payload.get("entity_ids", []),
        relationship_ids=payload.get("relationship_ids", []),
        created_at=_now_iso(),
    )
    _GRAPH_BOOKMARKS.setdefault(investigation_id, []).insert(0, bookmark.model_dump())
    return bookmark


def delete_graph_bookmark(investigation_id: str, bookmark_id: str) -> None:
    _require(investigation_id)
    seed_operations()
    _GRAPH_BOOKMARKS[investigation_id] = [
        b for b in _GRAPH_BOOKMARKS.get(investigation_id, []) if b["id"] != bookmark_id
    ]


def list_timeline_bookmarks(investigation_id: str) -> list[TimelineBookmark]:
    _require(investigation_id)
    seed_operations()
    return [TimelineBookmark(**b) for b in _TIMELINE_BOOKMARKS.get(investigation_id, [])]


def create_timeline_bookmark(investigation_id: str, payload: dict[str, Any]) -> TimelineBookmark:
    _require(investigation_id)
    seed_operations()
    bookmark = TimelineBookmark(
        id=f"tbm-{investigation_id}-{len(_TIMELINE_BOOKMARKS.get(investigation_id, [])) + 1:03d}",
        investigation_id=investigation_id,
        label=payload["label"],
        start=payload.get("start"),
        end=payload.get("end"),
        filters=payload.get("filters", {}),
        created_at=_now_iso(),
    )
    _TIMELINE_BOOKMARKS.setdefault(investigation_id, []).insert(0, bookmark.model_dump())
    return bookmark


def delete_timeline_bookmark(investigation_id: str, bookmark_id: str) -> None:
    _require(investigation_id)
    seed_operations()
    _TIMELINE_BOOKMARKS[investigation_id] = [
        b for b in _TIMELINE_BOOKMARKS.get(investigation_id, []) if b["id"] != bookmark_id
    ]


# ---------------------------------------------------------------------------
# Cross references & provenance
# ---------------------------------------------------------------------------


def list_cross_references(
    investigation_id: str, entity_id: str | None = None
) -> list[CrossReference]:
    _require(investigation_id)
    seed_operations()
    items = _CROSS_REFS.get(investigation_id, [])
    if entity_id:
        items = [c for c in items if c["entity"]["id"] == entity_id]
    return [CrossReference(**c) for c in items]


def list_provenance(investigation_id: str, target_id: str | None = None) -> list[ProvenanceChain]:
    _require(investigation_id)
    seed_operations()
    items = _PROVENANCE.get(investigation_id, [])
    if target_id:
        items = [
            c
            for c in items
            if c["target_id"] == target_id or any(n["id"] == target_id for n in c["nodes"])
        ]
    return [ProvenanceChain(**c) for c in items]


# ---------------------------------------------------------------------------
# Investigation-scoped search
# ---------------------------------------------------------------------------


def search_investigation(investigation_id: str, query: str) -> list[InvestigationSearchResult]:
    _require(investigation_id)
    seed_operations()
    pool = _SEARCH.get(investigation_id, [])
    q = query.strip().lower()
    if not q:
        return [InvestigationSearchResult(**r) for r in pool]
    return [
        InvestigationSearchResult(**r)
        for r in pool
        if q in r["label"].lower()
        or (r.get("description") and q in r["description"].lower())
        or q in r["kind"].lower()
    ]


def search_across(
    query: str, kind: InvestigationSearchKind | None = None
) -> list[InvestigationSearchResult]:
    seed_operations()
    q = query.strip().lower()
    all_items = [r for rows in _SEARCH.values() for r in rows]
    if kind:
        all_items = [r for r in all_items if r["kind"] == kind]
    if q:
        all_items = [
            r
            for r in all_items
            if q in r["label"].lower() or (r.get("description") and q in r["description"].lower())
        ]
    return [InvestigationSearchResult(**r) for r in all_items]


def _now_iso() -> str:
    from datetime import UTC, datetime

    return datetime.now(UTC).isoformat()
