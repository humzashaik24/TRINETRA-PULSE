"""Dev-local file-backed evidence storage.

The relational ``evidence`` table keeps metadata (title, source, provenance,
``storage_ref``) while the actual evidence payload (raw document bytes,
extracted text, etc.) lives in an external store. In production this would be
object storage (e.g. S3); for the SIH demonstration we provide a portable
filesystem implementation that is safe to run locally and in tests.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID


@dataclass(frozen=True)
class EvidenceBlob:
    """The stored payload for a single evidence item."""

    evidence_id: UUID
    filename: str
    content_type: str
    data: bytes
    metadata: dict


class EvidenceStorageError(Exception):
    """Raised for storage-level failures (missing, not found, etc.)."""


class EvidenceStorage:
    """Filesystem-backed evidence store keyed by investigation evidence id.

    Layout under the base directory::

        <base>/<evidence_id>/payload
        <base>/<evidence_id>/meta.json

    Idempotent and dependency-free so it works in CI and local dev.
    """

    def __init__(self, base_dir: str | Path) -> None:
        self.base_dir = Path(base_dir)

    def _blob_dir(self, evidence_id: UUID) -> Path:
        return self.base_dir / str(evidence_id)

    def save(self, blob: EvidenceBlob) -> None:
        blob_dir = self._blob_dir(blob.evidence_id)
        blob_dir.mkdir(parents=True, exist_ok=True)
        (blob_dir / "payload").write_bytes(blob.data)
        meta = {
            "evidence_id": str(blob.evidence_id),
            "filename": blob.filename,
            "content_type": blob.content_type,
            "metadata": blob.metadata,
        }
        (blob_dir / "meta.json").write_text(
            json.dumps(meta, indent=2), encoding="utf-8"
        )

    def load(self, evidence_id: UUID) -> EvidenceBlob:
        blob_dir = self._blob_dir(evidence_id)
        payload_path = blob_dir / "payload"
        meta_path = blob_dir / "meta.json"
        if not payload_path.exists() or not meta_path.exists():
            raise EvidenceStorageError(f"Evidence not found: {evidence_id}")
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        return EvidenceBlob(
            evidence_id=evidence_id,
            filename=meta["filename"],
            content_type=meta["content_type"],
            data=payload_path.read_bytes(),
            metadata=meta.get("metadata", {}),
        )

    def delete(self, evidence_id: UUID) -> None:
        blob_dir = self._blob_dir(evidence_id)
        if not blob_dir.exists():
            raise EvidenceStorageError(f"Evidence not found: {evidence_id}")
        import shutil

        shutil.rmtree(blob_dir)

    def exists(self, evidence_id: UUID) -> bool:
        return (self._blob_dir(evidence_id) / "payload").exists()

    def list_ids(self) -> list[UUID]:
        if not self.base_dir.exists():
            return []
        return [
            UUID(entry.name)
            for entry in self.base_dir.iterdir()
            if entry.is_dir() and (entry / "payload").exists()
        ]
