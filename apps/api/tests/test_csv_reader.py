"""Tests for the data-intelligence CSV ingestion boundary."""

import pytest

from app.intelligence.csv_reader import CsvIntelligenceError, parse_csv

CSV_SAMPLE = """txn_id,amount,account,beneficiary,date
TXN-2026-0482,4500000,773100294567,Mumbai Trading Corp,2026-03-14
TXN-2026-0491,1200000,773100294567,Rahul Kumar,2026-03-15
TXN-2026-0510,990000,773100294567,Vikram Patel,2026-03-16
"""


def test_parse_csv_basic():
    table = parse_csv(CSV_SAMPLE, dataset_name="bank_exports")
    assert table.dataset_name == "bank_exports"
    assert table.headers == [
        "txn_id",
        "amount",
        "account",
        "beneficiary",
        "date",
    ]
    assert table.total_rows == 3
    assert len(table.rows) == 3


def test_row_provenance_record_identifier():
    table = parse_csv(
        CSV_SAMPLE, dataset_name="bank_exports", id_column="txn_id"
    )
    first = table.rows[0]
    assert first.record_identifier == "TXN-2026-0482"
    assert first.row_index == 2  # physical row after the header
    assert first.data["beneficiary"] == "Mumbai Trading Corp"
    assert first.data["amount"] == "4500000"


def test_required_columns_present():
    table = parse_csv(
        CSV_SAMPLE,
        dataset_name="bank_exports",
        required_columns=["txn_id", "amount", "beneficiary"],
    )
    assert table.total_rows == 3


def test_missing_required_column_raises():
    with pytest.raises(CsvIntelligenceError) as exc:
        parse_csv(
            CSV_SAMPLE,
            dataset_name="bank_exports",
            required_columns=["txn_id", "not_present"],
        )
    assert "not_present" in str(exc.value)


def test_invalid_id_column_raises():
    with pytest.raises(CsvIntelligenceError) as exc:
        parse_csv(CSV_SAMPLE, dataset_name="bank_exports", id_column="nope")
    assert "nope" in str(exc.value)


def test_empty_csv_raises():
    with pytest.raises(CsvIntelligenceError):
        parse_csv("", dataset_name="empty")


def test_csv_with_only_a_header_row():
    table = parse_csv("txn_id,amount\n", dataset_name="header_only")
    assert table.total_rows == 0
    assert table.headers == ["txn_id", "amount"]
