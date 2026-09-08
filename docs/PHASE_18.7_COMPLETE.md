# Phase 18.7 — Real Evidence Payload Upload & End-to-End Lifecycle

## 1. Objective

Phase 18.7 adds the missing raw-payload lifecycle without adding a table,
storage system, custody ledger, authentication layer, or infrastructure
dependency.

## 2. Existing architecture audit

The implementation extends the `/api/v2` evidence router, the existing
`InvestigationEvidence` model, `EvidenceStorage` providers, the
`evidence_integrity` authority, `DataProvenance`, `EvidenceChainService`,
JWT/RBAC dependencies, the Data Intelligence uploader, and the existing
Context Inspector. `EvidenceCreate` remains the metadata-only compatibility
endpoint.

## 3. Upload lifecycle and API

`POST /api/v2/evidence/upload` accepts `multipart/form-data` with
`investigation_id`, `file`, and optional metadata. The actor is taken only from
the verified JWT. Filename, empty payload, dangerous MIME types, and the
server-side `EVIDENCE_MAX_UPLOAD_BYTES` ceiling are validated before storage.
The response includes the evidence id, filename, size, storage reference,
integrity block, and metadata.

## 4. Storage, checksum, provenance, and custody

Bytes are stored through `LocalFilesystemEvidenceStorage` or `S3EvidenceStorage`
using the existing deterministic investigation-scoped key:
`evidence/{investigation_id}/{evidence_id}/payload`. The raw SHA-256 is
calculated server-side through `evidence_integrity.compute_payload_checksum`
and is persisted as the evidence payload checksum. A `DataProvenance` record
references the evidence row, actor, storage reference, and checksum. A
controlled `EVIDENCE_UPLOADED` custody event is appended; no competing chain
hash is created.

## 5. Retrieval security

`GET /api/v2/evidence/{evidence_id}/download` requires authentication and an
optional matching investigation scope. It verifies the stored object against
the persisted checksum before streaming. Missing, unavailable, or mismatched
objects return explicit error states; permanent public URLs and credentials are
never exposed. Access is recorded with the existing audit vocabulary.

## 6. RBAC and isolation

Existing `CanMutateDep` permits upload for investigator, supervisor, and admin;
auditors remain read-only. Existing investigation-scoped lookups return 404 for
scope mismatches. No client actor, checksum, verification state, or storage
key is trusted. The repository has no membership/assignment ACL beyond its
existing investigation model, so authorization is role plus resource existence
in this phase; this is a documented limitation rather than a new role system.

## 7. Frontend and mock/API behavior

The existing Data Intelligence upload zone sends non-CSV payloads to the real
evidence endpoint in API mode and displays evidence id/checksum status. CSV
files continue through the existing ingestion pipeline. Evidence detail offers
an explicit View / Download action, and the Context Inspector shows id,
checksum, integrity, payload status, and custody summary. Mock mode remains
honest and does not fabricate payloads; API errors do not fall back to mock.

## 8. Failure handling

Storage is performed before database commit. If storage fails, no success is
returned. If database flush/commit fails after storage, rollback is attempted
and the provider delete operation is attempted as compensation. Perfect
distributed transactionality is not claimed; cleanup failure is not hidden.

## 9. Verification

Local targeted backend evidence API tests cover successful multipart upload,
raw retrieval, checksum/storage status, provenance, empty/oversized payloads,
and traversal rejection. Backend compilation and Ruff, plus frontend TypeScript
and targeted ESLint, were run. Full-suite/build/database/live-provider checks
are reported separately by the task run and must not be interpreted as live
Render or S3 verification.

## 10. Known limitations and cloud honesty

The current storage abstraction buffers payload bytes for its existing
`EvidenceBlob` contract; the endpoint bounds reads before storage. CSV
ingestion remains metadata/record oriented and is intentionally not converted
to a second duplicate evidence record. No live Render, PostgreSQL, or S3
credentials were available for verification. Local filesystem and mocked S3
provider behavior remain the applicable verification targets.

Phase 19 advanced network analytics is documented separately in
`docs/PHASE_19_COMPLETE.md`.
