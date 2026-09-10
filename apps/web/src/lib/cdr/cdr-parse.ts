// ============================================================
// KNOWLEDGE CANVAS — CDR / CSV PARSER
// ============================================================
// Deterministic, dependency-free parsing of communication (CDR)
// and transaction CSV data into records the network workspace can
// expand with. No randomness, no network, no side effects.
//
// Two record shapes are recognised by header detection:
//   - communication: caller + callee phone numbers (voice / sms / data)
//   - transaction:    from_account + to_account amounts
// A file that matches neither is rejected with explicit guidance
// instead of guessing.
// ============================================================

export type CdrRecordKind = 'communication' | 'transaction';

export interface CdrCallRecord {
  kind: 'communication';
  caller: string;
  callee: string;
  timestamp: string | null;
  durationSeconds: number | null;
  type: 'VOICE' | 'SMS' | 'DATA' | 'UNKNOWN';
  sourceRow: number;
}

export interface CdrTransactionRecord {
  kind: 'transaction';
  fromAccount: string;
  toAccount: string;
  amount: number | null;
  currency: string | null;
  timestamp: string | null;
  reference: string | null;
  sourceRow: number;
}

export type CdrRecord = CdrCallRecord | CdrTransactionRecord;

export interface CdrParseResult {
  format: CdrRecordKind | null;
  headers: string[];
  records: CdrRecord[];
  skippedRows: number;
  warnings: string[];
}

// ------------------------------------------------------------
// Phone + account normalisation (deterministic)
// ------------------------------------------------------------

const DIGITS_ONLY = /\D/g;

/** Keep only decimal digits from a raw phone / account string. */
function digitsOnly(raw: string): string {
  return raw.replace(DIGITS_ONLY, '');
}

/**
 * Normalise an Indian phone number to 10 digits.
 * Handles "+91", "0091", 0-prefixed and plain 10/11/12 digit forms.
 * Returns null when the value cannot be reduced to a valid 10-digit
 * number — records with an invalid number are skipped, never guessed.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let d = digitsOnly(raw.trim());
  if (!d) return null;
  if (d.startsWith('0091')) d = d.slice(4);
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length !== 10) return null;
  // Indian mobile numbers start with 6-9. A non-mobile 10-digit value
  // (landline) is still accepted — the CDR may contain any number.
  return d;
}

/** Normalise a bank account number to plain digits (min length 6). */
export function normalizeAccount(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const d = digitsOnly(raw.trim());
  if (d.length < 6) return null;
  return d;
}

/** Display form: "+91 98765 43210". */
export function formatPhoneDigits(digits: string): string {
  const d = digits.replace(DIGITS_ONLY, '');
  if (d.length !== 10) return d;
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

/** Display form: "7731 0029 4567" (groups of four). */
export function formatAccountDigits(digits: string): string {
  const d = digits.replace(DIGITS_ONLY, '');
  const groups = d.match(/.{1,4}/g) ?? [];
  return groups.join(' ');
}

// ------------------------------------------------------------
// Minimal CSV tokenizer (quotes + commas + newlines, no deps)
// ------------------------------------------------------------

export function parseCsvCellsLine(text: string): string[][] {
  const rows: string[][] = [];
  const clean = text.replace(/^\uFEFF/, '');
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const lines = clean.split(/\r?\n/);
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\r') {
        // skip
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    cell = '';
    const isEmpty = row.every((c) => c.trim() === '');
    if (!isEmpty) rows.push(row);
    row = [];
  }
  return rows;
}

// ------------------------------------------------------------
// Header detection
// ------------------------------------------------------------

const HEADER_ALIASES: Record<string, string[]> = {
  caller: ['caller', 'calling', 'calling_number', 'calling_party', 'a_number', 'a_number_msisdn', 'msisdn', 'source_number', 'dialed_from', 'from_number', 'from'],
  callee: ['callee', 'called', 'called_number', 'called_party', 'b_number', 'destination', 'destination_number', 'dialed_to', 'to_number', 'to'],
  timestamp: ['timestamp', 'datetime', 'date_time', 'call_time', 'call_date', 'date', 'time', 'start_time', 'starttime', 'txn_time', 'transaction_time', 'trx_time'],
  duration: ['duration', 'duration_seconds', 'duration_sec', 'call_duration', 'secs', 'seconds', 'hold_time'],
  callType: ['type', 'call_type', 'record_type', 'sub_type', 'service', 'communication_type', 'call_kind'],
  direction: ['direction', 'call_direction', 'cdr_type', 'nature'],
  fromAccount: ['from_account', 'fromacct', 'sender_account', 'source_account', 'debit_account', 'debit_acc', 'sender', 'source_acc'],
  toAccount: ['to_account', 'toacct', 'beneficiary_account', 'beneficiary', 'receiver_account', 'credit_account', 'credit_acc', 'receiver', 'dest_account'],
  amount: ['amount', 'amount_inr', 'value', 'txn_amount', 'transaction_amount', 'trx_amount', 'credit'],
  currency: ['currency', 'ccy', 'currency_code'],
  reference: ['reference', 'reference_no', 'ref_no', 'txn_ref', 'txn_id', 'transaction_id', 'transaction_reference', 'reference_number', 'remark'],
};

function headerIndexOf(headers: string[], key: keyof typeof HEADER_ALIASES): number {
  const normalized = headers.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[-.]/g, '_'));
  return normalized.findIndex((h) => {
    const aliases = HEADER_ALIASES[key];
    if (aliases.includes(h)) return true;
    // Aliased headers like "caller_number" already captured; also match a
    // flattened form for compound names (e.g. "called_party_number").
    return aliases.some((a) => a.length >= 5 && (h.includes(a) || a.includes(h)));
  });
}

/** Decide the record shape for a CSV, or null when unrecognised. */
export function detectCdrFormat(headers: string[]): CdrRecordKind | null {
  const hasCaller = headerIndexOf(headers, 'caller') >= 0;
  const hasCallee = headerIndexOf(headers, 'callee') >= 0;
  const hasFrom = headerIndexOf(headers, 'fromAccount') >= 0;
  const hasTo = headerIndexOf(headers, 'toAccount') >= 0;
  if ((hasCaller && hasCallee) || (hasCaller && headerIndexOf(headers, 'duration') >= 0)) {
    return 'communication';
  }
  if (hasFrom && hasTo) return 'transaction';
  return null;
}

// ------------------------------------------------------------
// Value coercions (deterministic)
// ------------------------------------------------------------

function parseDuration(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseAmount(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw.trim().replace(/[^\d.\-]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function parseTimestamp(value: string | undefined): string | null {
  if (value == null || value.trim() === '') return null;
  // Excel serial dates and epoch seconds are not handled here; any
  // ISO-ish value parsed by Date is accepted deterministically.
  const t = Date.parse(value.trim());
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

function callTypeOf(raw: string | undefined): CdrCallRecord['type'] {
  const v = (raw ?? '').trim().toUpperCase();
  if (v.includes('SMS') || v.includes('MSG')) return 'SMS';
  if (v.includes('DATA')) return 'DATA';
  if (v.includes('VOICE') || v.includes('CALL')) return 'VOICE';
  return 'UNKNOWN';
}

// ------------------------------------------------------------
// Main parser
// ------------------------------------------------------------

export function parseCdrCsv(text: string): CdrParseResult {
  const rows = parseCsvCellsLine(text);
  if (rows.length === 0) {
    return { format: null, headers: [], records: [], skippedRows: 0, warnings: ['The file is empty.'] };
  }

  const headers = rows[0];
  const format = detectCdrFormat(headers);
  if (!format) {
    return {
      format: null,
      headers,
      records: [],
      skippedRows: rows.length - 1,
      warnings: [
        'Could not detect a communication or transaction format in the header row.',
        'Communication CDRs need caller and called numbers; transaction logs need from and to account columns.',
      ],
    };
  }

  const idx = {
    caller: headerIndexOf(headers, 'caller'),
    callee: headerIndexOf(headers, 'callee'),
    timestamp: headerIndexOf(headers, 'timestamp'),
    duration: headerIndexOf(headers, 'duration'),
    callType: headerIndexOf(headers, 'callType'),
    direction: headerIndexOf(headers, 'direction'),
    fromAccount: headerIndexOf(headers, 'fromAccount'),
    toAccount: headerIndexOf(headers, 'toAccount'),
    amount: headerIndexOf(headers, 'amount'),
    currency: headerIndexOf(headers, 'currency'),
    reference: headerIndexOf(headers, 'reference'),
  };

  const records: CdrRecord[] = [];
  const warnings: string[] = [];
  let skippedRows = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0) continue;
    const sourceRow = r + 1;

    if (format === 'communication') {
      const callerRaw = idx.caller >= 0 ? row[idx.caller] : '';
      const calleeRaw = idx.callee >= 0 ? row[idx.callee] : '';
      const caller = normalizePhone(callerRaw);
      const callee = normalizePhone(calleeRaw);
      if (!caller || !callee) {
        skippedRows++;
        continue;
      }
      if (caller === callee) {
        skippedRows++;
        continue;
      }
      records.push({
        kind: 'communication',
        caller,
        callee,
        timestamp: parseTimestamp(idx.timestamp >= 0 ? row[idx.timestamp] : undefined),
        durationSeconds: parseDuration(idx.duration >= 0 ? row[idx.duration] : undefined),
        type: callTypeOf(idx.callType >= 0 ? row[idx.callType] : undefined),
        sourceRow,
      });
    } else {
      const fromRaw = idx.fromAccount >= 0 ? row[idx.fromAccount] : '';
      const toRaw = idx.toAccount >= 0 ? row[idx.toAccount] : '';
      const fromAccount = normalizeAccount(fromRaw);
      const toAccount = normalizeAccount(toRaw);
      if (!fromAccount || !toAccount) {
        skippedRows++;
        continue;
      }
      if (fromAccount === toAccount) {
        skippedRows++;
        continue;
      }
      records.push({
        kind: 'transaction',
        fromAccount,
        toAccount,
        amount: parseAmount(idx.amount >= 0 ? row[idx.amount] : undefined),
        currency: idx.currency >= 0 && row[idx.currency]?.trim() ? row[idx.currency].trim() : null,
        timestamp: parseTimestamp(idx.timestamp >= 0 ? row[idx.timestamp] : undefined),
        reference: idx.reference >= 0 && row[idx.reference]?.trim() ? row[idx.reference].trim() : null,
        sourceRow,
      });
    }
  }

  return { format, headers, records, skippedRows, warnings };
}