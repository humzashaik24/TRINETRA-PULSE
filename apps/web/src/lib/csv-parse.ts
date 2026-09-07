// ============================================================
// CLIENT-SIDE CSV PARSER
// ============================================================
// Lightweight CSV parser for column mapping UI. Handles quoted
// fields with embedded commas and escaped quotes. Not intended
// for production ingestion (backend uses Python csv module).
// ============================================================

export interface CsvParseResult {
  headers: string[];
  previewRows: string[][];
  totalLines: number;
}

/**
 * Parse a CSV string into headers and a preview of the first `maxPreview`
 * data rows. Empty trailing lines are trimmed.
 */
export function parseCsvPreview(
  content: string,
  maxPreview = 5,
): CsvParseResult {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], previewRows: [], totalLines: 0 };

  const headers = parseCsvLine(lines[0]);
  const previewRows: string[][] = [];
  for (let i = 1; i < lines.length && previewRows.length < maxPreview; i++) {
    previewRows.push(parseCsvLine(lines[i]));
  }

  return { headers, previewRows, totalLines: lines.length - 1 };
}

/**
 * Parse a single CSV line respecting quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  cells.push(current.trim());
  return cells;
}
