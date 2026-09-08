"""Durable evidence payload storage providers.

Evidence metadata and authoritative checksums remain in PostgreSQL. This
module is the single boundary for raw payload bytes and supports local
filesystem storage plus S3-compatible object storage.
"""

from __future__ import annotations

import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import UUID

VALID = "VALID"
MISSING = "MISSING"
MISMATCH = "MISMATCH"
UNAVAILABLE = "UNAVAILABLE"


def sha256_hex(data: bytes) -> str:
    # Keep raw payload hashing under the existing evidence-integrity authority.
    from app.services.evidence_integrity import compute_payload_checksum

    return compute_payload_checksum(data)


def evidence_object_key(
    investigation_id: UUID,
    evidence_id: UUID,
    prefix: str = "evidence",
) -> str:
    """Build a deterministic key; user-controlled filenames never participate."""
    safe_prefix = re.sub(r"[^A-Za-z0-9._-]+", "-", prefix.strip("/")) or "evidence"
    return f"{safe_prefix}/{investigation_id}/{evidence_id}/payload"


@dataclass(frozen=True)
class EvidenceBlob:
    evidence_id: UUID
    filename: str
    content_type: str
    data: bytes
    metadata: dict[str, Any]
    investigation_id: UUID | None = None

    @property
    def checksum(self) -> str:
        return sha256_hex(self.data)


class EvidenceStorageError(Exception):
    """Raised when a payload cannot be stored or retrieved."""


class LocalFilesystemEvidenceStorage:
    """Development/test provider with investigation-scoped filesystem keys."""

    def __init__(self, base_dir: str | Path) -> None:
        self.base_dir = Path(base_dir)

    def _blob_dir(self, evidence_id: UUID, investigation_id: UUID | None = None) -> Path:
        if not isinstance(evidence_id, UUID):
            raise EvidenceStorageError(f"Invalid evidence id: {evidence_id!r}")
        if investigation_id is not None and not isinstance(investigation_id, UUID):
            raise EvidenceStorageError(f"Invalid investigation id: {investigation_id!r}")
        return (
            self.base_dir / str(investigation_id) / str(evidence_id)
            if investigation_id
            else self.base_dir / str(evidence_id)
        )

    def save(self, blob: EvidenceBlob) -> str:
        blob_dir = self._blob_dir(blob.evidence_id, blob.investigation_id)
        blob_dir.mkdir(parents=True, exist_ok=True)
        (blob_dir / "payload").write_bytes(blob.data)
        (blob_dir / "checksum.sha256").write_text(blob.checksum, encoding="utf-8")
        meta = {
            "evidence_id": str(blob.evidence_id),
            "investigation_id": str(blob.investigation_id) if blob.investigation_id else None,
            "filename": blob.filename,
            "content_type": blob.content_type,
            "checksum": blob.checksum,
            "metadata": blob.metadata,
        }
        (blob_dir / "meta.json").write_text(json.dumps(meta, sort_keys=True), encoding="utf-8")
        return self._storage_ref(blob.evidence_id, blob.investigation_id)

    def _storage_ref(self, evidence_id: UUID, investigation_id: UUID | None = None) -> str:
        return evidence_object_key(
            investigation_id or UUID(int=0),
            evidence_id,
            prefix="filesystem",
        )

    def load(
        self,
        evidence_id: UUID,
        investigation_id: UUID | None = None,
        storage_ref: str | None = None,
    ) -> EvidenceBlob:
        blob_dir = self._blob_dir(evidence_id, investigation_id)
        if not (blob_dir / "payload").exists() or not (blob_dir / "meta.json").exists():
            raise EvidenceStorageError(f"Evidence payload not found: {evidence_id}")
        try:
            meta = json.loads((blob_dir / "meta.json").read_text(encoding="utf-8"))
            data = (blob_dir / "payload").read_bytes()
            return EvidenceBlob(
                evidence_id=evidence_id,
                investigation_id=investigation_id,
                filename=meta["filename"],
                content_type=meta["content_type"],
                data=data,
                metadata=meta.get("metadata", {}),
            )
        except (OSError, KeyError, json.JSONDecodeError) as exc:
            raise EvidenceStorageError(f"Evidence payload unavailable: {evidence_id}") from exc

    def verify_integrity(
        self,
        evidence_id: UUID,
        expected_checksum: str | None = None,
        investigation_id: UUID | None = None,
        storage_ref: str | None = None,
    ) -> str:
        if expected_checksum is None:
            expected_checksum = self.checksum(evidence_id, investigation_id)
            if expected_checksum is None:
                return "MISSING_CHECKSUM"
        try:
            blob = self.load(evidence_id, investigation_id, storage_ref)
        except EvidenceStorageError:
            return MISSING
        return VALID if blob.checksum == expected_checksum else MISMATCH

    def delete(
        self,
        evidence_id: UUID,
        investigation_id: UUID | None = None,
        storage_ref: str | None = None,
    ) -> None:
        blob_dir = self._blob_dir(evidence_id, investigation_id)
        if not blob_dir.exists():
            raise EvidenceStorageError(f"Evidence payload not found: {evidence_id}")
        shutil.rmtree(blob_dir)

    def exists(self, evidence_id: UUID, investigation_id: UUID | None = None) -> bool:
        return (self._blob_dir(evidence_id, investigation_id) / "payload").exists()

    def checksum(self, evidence_id: UUID, investigation_id: UUID | None = None) -> str | None:
        path = self._blob_dir(evidence_id, investigation_id) / "checksum.sha256"
        return path.read_text(encoding="utf-8").strip() if path.exists() else None

    def list_ids(self) -> list[UUID]:
        if not self.base_dir.exists():
            return []
        ids: list[UUID] = []
        for entry in self.base_dir.iterdir():
            if entry.is_dir() and (entry / "payload").exists():
                try:
                    ids.append(UUID(entry.name))
                except ValueError:
                    continue
        return ids


class S3EvidenceStorage:
    """S3-compatible provider using a server-side boto3 client."""

    def __init__(
        self,
        *,
        bucket: str,
        region: str,
        endpoint: str | None = None,
        access_key_id: str | None = None,
        secret_access_key: str | None = None,
        prefix: str = "evidence",
        client: Any | None = None,
    ) -> None:
        if not bucket.strip():
            raise EvidenceStorageError("S3 bucket is required")
        self.bucket = bucket
        self.prefix = prefix
        if client is not None:
            self.client = client
            return
        try:
            import boto3
        except ImportError as exc:
            raise EvidenceStorageError("boto3 is required for S3 evidence storage") from exc
        self.client = boto3.client(
            "s3",
            region_name=region or None,
            endpoint_url=endpoint or None,
            aws_access_key_id=access_key_id or None,
            aws_secret_access_key=secret_access_key or None,
        )

    def _key(self, blob: EvidenceBlob) -> str:
        if blob.investigation_id is None:
            raise EvidenceStorageError("Investigation scope is required for S3 storage")
        return evidence_object_key(blob.investigation_id, blob.evidence_id, self.prefix)

    def _resolve_key(
        self,
        evidence_id: UUID,
        investigation_id: UUID | None,
        storage_ref: str | None,
    ) -> str:
        if investigation_id is None:
            raise EvidenceStorageError("Investigation scope is required for S3 storage")
        expected = evidence_object_key(investigation_id, evidence_id, self.prefix)
        if storage_ref and storage_ref != expected:
            raise EvidenceStorageError("Storage key is outside the evidence scope")
        return expected

    def save(self, blob: EvidenceBlob) -> str:
        key = self._key(blob)
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=blob.data,
                ContentType=blob.content_type,
                Metadata={
                    "filename": blob.filename,
                    **{str(k): str(v) for k, v in blob.metadata.items()},
                },
            )
        except Exception as exc:
            raise EvidenceStorageError("S3 evidence upload failed") from exc
        return key

    def load(
        self,
        evidence_id: UUID,
        investigation_id: UUID | None = None,
        storage_ref: str | None = None,
    ) -> EvidenceBlob:
        key = self._resolve_key(evidence_id, investigation_id, storage_ref)
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            data = response["Body"].read()
            metadata = response.get("Metadata", {})
            return EvidenceBlob(
                evidence_id=evidence_id,
                investigation_id=investigation_id,
                filename=metadata.get("filename", str(evidence_id)),
                content_type=response.get("ContentType", "application/octet-stream"),
                data=data,
                metadata=metadata,
            )
        except Exception as exc:
            raise EvidenceStorageError("S3 evidence payload unavailable") from exc

    def verify_integrity(
        self,
        evidence_id: UUID,
        expected_checksum: str | None = None,
        investigation_id: UUID | None = None,
        storage_ref: str | None = None,
    ) -> str:
        if expected_checksum is None:
            raise EvidenceStorageError("An authoritative checksum is required")
        try:
            blob = self.load(evidence_id, investigation_id, storage_ref)
        except EvidenceStorageError as exc:
            return UNAVAILABLE if "unavailable" in str(exc).lower() else MISSING
        return VALID if blob.checksum == expected_checksum else MISMATCH

    def delete(
        self,
        evidence_id: UUID,
        investigation_id: UUID | None = None,
        storage_ref: str | None = None,
    ) -> None:
        key = self._resolve_key(evidence_id, investigation_id, storage_ref)
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except Exception as exc:
            raise EvidenceStorageError("S3 evidence deletion failed") from exc


# Backwards-compatible name for local callers and existing tests.
EvidenceStorage = LocalFilesystemEvidenceStorage
