# Data Ingestion (Phase 16)

Phase 16 introduces a real data ingestion pipeline that connects the frontend
upload zone to the backend persistence layer. Users can upload CSV files through
the UI, which are parsed, validated, and persisted as entities, relationships,
and evidence in PostgreSQL — investigation-scoped throughout.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                         │
│   UploadZone  →  POST /api/v2/datasets/upload (FormData)         │
│   DatasetTable → GET  /api/v2/datasets?investigation_id=...      │
│   IngestionHistory → GET /api/v2/datasets/all-jobs               │
│   InvestigationDataTab (new) — scoped upload + table per case    │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│ API  (apps/api)                                                  │
│   POST /api/v2/datasets/upload                                    │
│     → saves file to tmp, creates Dataset record (VALIDATING)      │
│     → creates IngestionJob (QUEUED)                               │
│     → runs IngestionPipeline synchronously                        │
│     → returns UploadResult (dataset_id, job_id, stats)            │
│                                                                   │
│   IngestionPipeline (app/services/real/ingestion.py)              │
│     → parse_csv() from csv_reader.py                              │
│     → _detect_entity_columns() heuristics                         │
│     → _find_or_create_entity() per row (dedup via cache)          │
│     → _find_or_create_relationship() between entity pairs         │
│     → InvestigationEvidence per row                               │
│     → quality score computation                                   │
│     → job status lifecycle: QUEUED → COMPLETED / FAILED           │
│     → dataset status lifecycle: VALIDATING → READY / FAILED       │
└──────────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Description |
|------|-------------|
| `apps/api/app/services/real/ingestion.py` | `IngestionPipeline` — CSV → entities → relationships → evidence |
| `apps/api/app/api/routers/datasets.py` | Upload endpoint, list datasets, list all jobs |
| `apps/web/src/lib/api/investigations.ts` | `uploadDataset()`, `listDatasets()`, `listAllIngestionJobs()` |
| `apps/web/src/lib/api/client.ts` | `isFormData` support for multipart uploads |
| `apps/web/src/components/data-intelligence/upload-zone.tsx` | File upload UI with progress tracking |
| `apps/web/src/components/data-intelligence/dataset-table.tsx` | Dataset listing (real API or mock) |
| `apps/web/src/components/data-intelligence/ingestion-history.tsx` | Job history (real API or mock) |
| `apps/web/src/components/investigation/investigation-data-tab.tsx` | Investigation-scoped data management |
| `apps/web/src/components/shell/investigation-shell.tsx` | Added `Data` tab (9th tab) |

## Entity Column Detection

The pipeline auto-detects entity columns from CSV headers using keyword heuristics:

| Entity Type | Keywords |
|-------------|----------|
| PERSON | name, person, suspect, victim, accused, witness |
| PHONE | phone, mobile, msisdn, telephone, contact, caller, callee |
| VEHICLE | vehicle, car, registration, plate, number |
| LOCATION | location, address, city, district, place, lat, lng, tower, cell |
| ORGANIZATION | organization, company, firm, entity, org |
| ACCOUNT | account, bank, ifsc, upi |
| TRANSACTION | txn, transaction, amount, payment, transfer |

## Deduplication

Entities are deduplicated via:
1. **In-memory cache** — same `normalized_name` within a single pipeline run
2. **Database lookup** — `_find_or_create_entity` checks for existing entity
   with same `canonical_name` + `investigation_id`

Normalization: lowercase, collapse whitespace, strip.

## Frontend Behavior

- **Mock mode** (`NEXT_PUBLIC_USE_MOCK_API=true`): all components use mock data,
  upload simulates progress without hitting the API
- **Real mode** (`NEXT_PUBLIC_USE_MOCK_API=false`): upload calls `POST /api/v2/datasets/upload`,
  tables refresh via polling/auto-refresh

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v2/datasets/upload` | Upload CSV file + metadata (FormData) |
| GET | `/api/v2/datasets?investigation_id=...` | List datasets (optionally filtered) |
| GET | `/api/v2/datasets/all-jobs` | List all ingestion jobs across investigations |
| GET | `/api/v2/datasets/{id}` | Get single dataset |
| GET | `/api/v2/datasets/{id}/jobs` | List jobs for a dataset |

## Testing

```bash
cd apps/api
.\venv\Scripts\python.exe -m pytest tests/test_ingestion_pipeline.py -v  # 18 tests
.\venv\Scripts\python.exe -m pytest tests/test_data_provenance.py -v     # 14 tests
```

Covers: entity column detection, normalization, relationship type inference,
evidence type inference, quality scoring, full pipeline integration (entities +
relationships + evidence + job lifecycle + dataset status + dedup + failure).

## Render-PG Limitation

Local development uses SQLite (via `aiosqlite`). The UUID column adapter for
`session.get(IngestionJob, UUID(...))` requires a `UUID` object, not a string.
In production (PostgreSQL via Render), both work. The upload endpoint and
pipeline are tested against SQLite locally and validated on Render PostgreSQL
post-deploy.
