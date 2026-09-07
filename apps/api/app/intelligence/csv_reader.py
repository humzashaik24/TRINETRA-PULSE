"""Data-intelligence CSV ingestion boundary.

Structured datasets (CDR extracts, bank transaction logs, FIR records, GST
registry) arrive as CSV. This module provides a small, validated reader that
normalises each row to a dict and preserves provenance (dataset name, source
record identifier) so downstream evidence / entity extraction stays traceable.
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field


class CsvIntelligenceError(Exception):
    """Raised for invalid CSV / missing required columns."""


@dataclass(frozen=True)
class CsvRow:
    """A single parsed data-intelligence row with provenance."""

    dataset_name: str
    row_index: int  # 1-based physical row number in the source file
    record_identifier: str | None
    data: dict[str, str]
    raw: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class CsvTable:
    """The parsed, validated shape of a CSV dataset."""

    dataset_name: str
    headers: list[str]
    rows: list[CsvRow]
    total_rows: int


def parse_csv(
    content: str,
    *,
    dataset_name: str,
    required_columns: list[str] | None = None,
    id_column: str | None = None,
    dialect: str = "excel",
) -> CsvTable:
    """Parse CSV ``content`` into a validated ``CsvTable``.

    ``required_columns`` (if given) must all be present in the header row.
    ``id_column`` names the column whose value becomes each row's
    ``record_identifier`` (used for provenance / dedup).
    """
    reader = csv.DictReader(io.StringIO(content), dialect=dialect)
    if reader.fieldnames is None:
        raise CsvIntelligenceError("CSV has no header row")

    headers = list(reader.fieldnames)
    if required_columns:
        missing = [c for c in required_columns if c not in headers]
        if missing:
            raise CsvIntelligenceError(
                f"Missing required column(s) for dataset '{dataset_name}': {missing}"
            )
    if id_column and id_column not in headers:
        raise CsvIntelligenceError(
            f"id_column '{id_column}' not present in dataset '{dataset_name}'"
        )

    rows: list[CsvRow] = []
    for row_index, raw_row in enumerate(reader, start=2):  # 1-based incl. header
        record_identifier = None
        if id_column:
            record_identifier = raw_row.get(id_column) or None
        rows.append(
            CsvRow(
                dataset_name=dataset_name,
                row_index=row_index,
                record_identifier=record_identifier,
                data=dict(raw_row),
                raw=[raw_row.get(h, "") for h in headers],
            )
        )

    return CsvTable(
        dataset_name=dataset_name,
        headers=headers,
        rows=rows,
        total_rows=len(rows),
    )
