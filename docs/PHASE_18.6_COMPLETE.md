# PHASE 18.6 COMPLETE

## 1. Objective

Phase 18.6 adds a durable, provider-neutral raw evidence payload boundary
without changing the PostgreSQL evidence metadata, SHA-256 integrity service,
provenance, custody chain, RBAC, or investigation-scoped APIs.

## 2. Architecture changes

`EvidenceStorage` remains the single storage boundary. It now has:

- `LocalFilesystemEvidenceStorage` for development and tests.
- `S3EvidenceStorage` for S3-compatible production object storage.
- `get_evidence_storage()` for server-side provider selection.

Production configuration requires `EVIDENCE_STORAGE_PROVIDER=s3` and a bucket.
Object-storage credentials are server-side only and are never exposed through
`NEXT_PUBLIC_*`.

## 3. Object-key strategy

Keys are deterministic and investigation-scoped:

```text
evidence/{investigation_id}/{evidence_id}/payload
```

Filenames are metadata only and never form part of an object key.

## 4. Security and integrity

Storage operations require the already-resolved evidence and investigation
scope. The S3 provider rejects unscoped access and rejects storage references
outside the expected deterministic key. The existing evidence checksum remains
the authoritative SHA-256 value. Storage verification reports `VALID`,
`MISSING`, `MISMATCH`, or `UNAVAILABLE`; missing or unavailable objects are
never treated as valid.

Custody-chain creation remains unchanged and continues to use the persisted
evidence checksum. No storage, evidence, audit, or custody tables were added.

## 5. API and frontend behavior

Existing evidence detail and integrity responses now include `storage_status`
alongside the existing checksum integrity result. The evidence detail UI
displays the payload storage state honestly. Mock mode does not fabricate
stored payloads, and API mode does not fall back to mock evidence.

The current evidence-create API remains metadata-oriented; raw payload callers
use the storage boundary and persisted `storage_ref` contract. No redundant
download endpoint or public object URL was introduced.

## 6. Render configuration

Render remains native Python + native Node + managed PostgreSQL. The API
requires these storage variables in production:

- `EVIDENCE_STORAGE_PROVIDER=s3`
- `EVIDENCE_STORAGE_BUCKET`
- `EVIDENCE_STORAGE_REGION`
- optional `EVIDENCE_STORAGE_ENDPOINT`
- `EVIDENCE_STORAGE_ACCESS_KEY_ID`
- `EVIDENCE_STORAGE_SECRET_ACCESS_KEY`
- optional `EVIDENCE_STORAGE_PREFIX`

Secrets are `sync: false` in `render.yaml`; no secret values are committed.

## 7. Verification and limitations

Filesystem and mocked S3 provider tests cover deterministic keys, round trips,
missing objects, checksum match/mismatch, scope protection, and provider
selection. Existing ingestion, integrity, custody, RBAC, and isolation tests
remain the regression boundary.

Live S3 and Render verification was not performed because cloud credentials
were unavailable. The production provider is prepared but must be exercised
after deployment with an operator-managed S3-compatible bucket.

Phase 19 was not started.
