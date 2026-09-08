"""Server-side evidence storage provider selection."""

from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.storage.evidence_storage import (
    EvidenceStorageError,
    LocalFilesystemEvidenceStorage,
    S3EvidenceStorage,
)


@lru_cache
def get_evidence_storage() -> LocalFilesystemEvidenceStorage | S3EvidenceStorage:
    settings = get_settings()
    provider = settings.evidence_storage_provider.strip().lower()
    if provider == "filesystem":
        return LocalFilesystemEvidenceStorage(settings.evidence_storage_dir)
    if provider == "s3":
        return S3EvidenceStorage(
            bucket=settings.evidence_storage_bucket,
            region=settings.evidence_storage_region,
            endpoint=settings.evidence_storage_endpoint or None,
            access_key_id=settings.evidence_storage_access_key_id or None,
            secret_access_key=settings.evidence_storage_secret_access_key or None,
            prefix=settings.evidence_storage_prefix,
        )
    raise EvidenceStorageError(
        f"Unsupported EVIDENCE_STORAGE_PROVIDER: {settings.evidence_storage_provider}"
    )
