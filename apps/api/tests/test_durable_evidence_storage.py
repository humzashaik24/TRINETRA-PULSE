"""Phase 18.6 durable evidence storage provider tests."""

from uuid import uuid4

import pytest

from app.storage import factory
from app.storage.evidence_storage import (
    MISMATCH,
    MISSING,
    VALID,
    EvidenceBlob,
    EvidenceStorageError,
    LocalFilesystemEvidenceStorage,
    S3EvidenceStorage,
    evidence_object_key,
)


class FakeBody:
    def __init__(self, data: bytes):
        self.data = data

    def read(self) -> bytes:
        return self.data


class FakeS3:
    def __init__(self):
        self.objects: dict[tuple[str, str], dict] = {}

    def put_object(self, **kwargs):
        self.objects[(kwargs["Bucket"], kwargs["Key"])] = kwargs

    def get_object(self, **kwargs):
        value = self.objects[(kwargs["Bucket"], kwargs["Key"])]
        return {
            "Body": FakeBody(value["Body"]),
            "ContentType": value["ContentType"],
            "Metadata": value["Metadata"],
        }

    def delete_object(self, **kwargs):
        self.objects.pop((kwargs["Bucket"], kwargs["Key"]), None)


def test_object_key_is_deterministic_and_scope_bound():
    investigation_id = uuid4()
    evidence_id = uuid4()
    assert evidence_object_key(investigation_id, evidence_id) == (
        f"evidence/{investigation_id}/{evidence_id}/payload"
    )
    assert "filename" not in evidence_object_key(investigation_id, evidence_id)


def test_filesystem_provider_roundtrip_and_integrity(tmp_path):
    investigation_id = uuid4()
    evidence_id = uuid4()
    storage = LocalFilesystemEvidenceStorage(tmp_path)
    blob = EvidenceBlob(
        evidence_id,
        "report.pdf",
        "application/pdf",
        b"payload",
        {"source": "test"},
        investigation_id,
    )
    reference = storage.save(blob)
    assert str(investigation_id) in reference
    assert storage.load(evidence_id, investigation_id).data == b"payload"
    assert storage.verify_integrity(evidence_id, blob.checksum, investigation_id) == VALID
    assert storage.verify_integrity(evidence_id, "0" * 64, investigation_id) == MISMATCH


def test_filesystem_missing_payload_is_not_valid(tmp_path):
    storage = LocalFilesystemEvidenceStorage(tmp_path)
    assert storage.verify_integrity(uuid4(), "0" * 64, uuid4()) == MISSING


def test_s3_provider_roundtrip_and_scope_protection():
    investigation_id = uuid4()
    evidence_id = uuid4()
    client = FakeS3()
    storage = S3EvidenceStorage(
        bucket="evidence-bucket",
        region="us-east-1",
        client=client,
    )
    blob = EvidenceBlob(
        evidence_id,
        "raw.csv",
        "text/csv",
        b"a,b\n1,2\n",
        {"source": "test"},
        investigation_id,
    )
    key = storage.save(blob)
    assert key == evidence_object_key(investigation_id, evidence_id)
    loaded = storage.load(evidence_id, investigation_id, key)
    assert loaded.data == blob.data
    assert storage.verify_integrity(evidence_id, blob.checksum, investigation_id, key) == VALID
    with pytest.raises(EvidenceStorageError):
        storage.load(evidence_id, uuid4(), key)


def test_s3_provider_rejects_unscoped_upload():
    storage = S3EvidenceStorage(bucket="evidence-bucket", region="us-east-1", client=FakeS3())
    with pytest.raises(EvidenceStorageError, match="Investigation scope"):
        storage.save(EvidenceBlob(uuid4(), "x", "text/plain", b"x", {}))


def test_storage_factory_selects_filesystem(monkeypatch, tmp_path):
    factory.get_evidence_storage.cache_clear()
    from app.core.config import Settings

    monkeypatch.setattr(
        factory,
        "get_settings",
        lambda: Settings(
            evidence_storage_provider="filesystem",
            evidence_storage_dir=str(tmp_path),
        ),
    )
    assert isinstance(factory.get_evidence_storage(), LocalFilesystemEvidenceStorage)
    factory.get_evidence_storage.cache_clear()


def test_storage_factory_rejects_unknown_provider(monkeypatch):
    factory.get_evidence_storage.cache_clear()
    from app.core.config import Settings

    monkeypatch.setattr(
        factory,
        "get_settings",
        lambda: Settings(
            evidence_storage_provider="unknown",
        ),
    )
    with pytest.raises(EvidenceStorageError, match="Unsupported"):
        factory.get_evidence_storage()
    factory.get_evidence_storage.cache_clear()
