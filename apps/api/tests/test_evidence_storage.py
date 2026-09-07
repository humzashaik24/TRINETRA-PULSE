"""Tests for the filesystem evidence storage boundary."""

import uuid

import pytest

from app.storage.evidence_storage import EvidenceBlob, EvidenceStorage, EvidenceStorageError


@pytest.fixture
def storage(tmp_path):
    return EvidenceStorage(tmp_path / "evidence")


def test_save_and_load_roundtrip(storage: EvidenceStorage):
    evidence_id = uuid.uuid4()
    blob = EvidenceBlob(
        evidence_id=evidence_id,
        filename="fir.pdf",
        content_type="application/pdf",
        data=b"%PDF-1.4 fake",
        metadata={"record_identifier": "FIR-2026-001"},
    )
    storage.save(blob)

    assert storage.exists(evidence_id)
    loaded = storage.load(evidence_id)
    assert loaded.filename == "fir.pdf"
    assert loaded.content_type == "application/pdf"
    assert loaded.data == b"%PDF-1.4 fake"
    assert loaded.metadata == {"record_identifier": "FIR-2026-001"}


def test_overwrite_same_evidence_id(storage: EvidenceStorage):
    evidence_id = uuid.uuid4()
    storage.save(
        EvidenceBlob(evidence_id, "a.txt", "text/plain", b"one", {})
    )
    storage.save(
        EvidenceBlob(evidence_id, "a.txt", "text/plain", b"two", {"v": 2})
    )
    assert storage.load(evidence_id).data == b"two"


def test_delete_removes_blob(storage: EvidenceStorage):
    evidence_id = uuid.uuid4()
    storage.save(
        EvidenceBlob(evidence_id, "a.txt", "text/plain", b"x", {})
    )
    assert storage.exists(evidence_id)
    storage.delete(evidence_id)
    assert not storage.exists(evidence_id)


def test_load_missing_raises(storage: EvidenceStorage):
    with pytest.raises(EvidenceStorageError):
        storage.load(uuid.uuid4())


def test_delete_missing_raises(storage: EvidenceStorage):
    with pytest.raises(EvidenceStorageError):
        storage.delete(uuid.uuid4())


def test_list_ids(storage: EvidenceStorage):
    ids = [uuid.uuid4(), uuid.uuid4()]
    for i in ids:
        storage.save(EvidenceBlob(i, f"{i}.txt", "text/plain", b"x", {}))
    assert set(storage.list_ids()) == set(ids)
