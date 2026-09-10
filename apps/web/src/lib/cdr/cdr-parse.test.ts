import {
  detectCdrFormat,
  formatAccountDigits,
  formatPhoneDigits,
  normalizeAccount,
  normalizePhone,
  parseCdrCsv,
  parseCsvCellsLine,
} from '@/lib/cdr/cdr-parse';
import { SAMPLE_CDR_CSV, SAMPLE_TRANSACTION_CSV } from '@/mock/cdr-sample';

describe('cdr normalizePhone', () => {
  it('normalises +91-prefixed Indian numbers to 10 digits', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhone('+919026543210')).toBe('9026543210');
  });

  it('normalises 0091 / 0-prefixed / plain forms', () => {
    expect(normalizePhone('00919876543210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
    expect(normalizePhone('9876543210')).toBe('9876543210');
  });

  it('rejects numbers that cannot be reduced to 10 digits', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('not a phone')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe('cdr display formatters', () => {
  it('formats phone digits as +91 XXXXX XXXXX', () => {
    expect(formatPhoneDigits('9876543210')).toBe('+91 98765 43210');
  });

  it('formats account digits in groups of four', () => {
    expect(formatAccountDigits('773100294567')).toBe('7731 0029 4567');
  });
});

describe('cdr normalizeAccount', () => {
  it('keeps digits and rejects short values', () => {
    expect(normalizeAccount('7731 0029 4567')).toBe('773100294567');
    expect(normalizeAccount('12')).toBeNull();
  });
});

describe('cdr CSV cell parser', () => {
  it('handles quoted cells with commas and CRLF', () => {
    const rows = parseCsvCellsLine('a,"b,c",d\r\ne,f,g');
    expect(rows).toEqual([
      ['a', 'b,c', 'd'],
      ['e', 'f', 'g'],
    ]);
  });
});

describe('cdr format detection', () => {
  it('detects communication format from CDR headers', () => {
    expect(detectCdrFormat(['caller', 'called_number', 'start_time', 'duration_seconds'])).toBe('communication');
    expect(detectCdrFormat(['a_number', 'b_number', 'call_type'])).toBe('communication');
  });

  it('detects transaction format from account columns', () => {
    expect(detectCdrFormat(['from_account', 'to_account', 'amount'])).toBe('transaction');
  });

  it('rejects unrecognised headers', () => {
    expect(detectCdrFormat(['name', 'age', 'score'])).toBeNull();
  });
});

describe('cdr parseCdrCsv', () => {
  it('parses the bundled CDR sample deterministically', () => {
    const result = parseCdrCsv(SAMPLE_CDR_CSV);
    expect(result.format).toBe('communication');
    expect(result.records).toHaveLength(11);
    expect(result.skippedRows).toBe(1);
    const [first] = result.records;
    expect(first).toMatchObject({
      kind: 'communication',
      caller: '9876543210',
      callee: '9021011345',
      durationSeconds: 342,
      type: 'VOICE',
      timestamp: '2026-02-01T08:12:00.000Z',
      sourceRow: 2,
    });
    expect(result.records.some((r) => r.kind === 'communication' && r.type === 'SMS')).toBe(true);
  });

  it('parses the bundled transaction sample deterministically', () => {
    const result = parseCdrCsv(SAMPLE_TRANSACTION_CSV);
    expect(result.format).toBe('transaction');
    expect(result.records).toHaveLength(5);
    expect(result.skippedRows).toBe(1);
    const [first] = result.records;
    expect(first).toMatchObject({
      kind: 'transaction',
      fromAccount: '773100294567',
      toAccount: '552288901123',
      amount: 125000,
      currency: 'INR',
    });
  });

  it('detects unknown formats without guessing', () => {
    const result = parseCdrCsv('name,age\nAlice,31');
    expect(result.format).toBeNull();
    expect(result.records).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('reports an empty file', () => {
    const result = parseCdrCsv('');
    expect(result.format).toBeNull();
    expect(result.warnings.some((w) => w.includes('empty'))).toBe(true);
  });

  it('handles a UTF-8 BOM in the header row', () => {
    const result = parseCdrCsv('\uFEFFcaller,called_number\n9876543210,9021011345\n');
    expect(result.format).toBe('communication');
    expect(result.records).toHaveLength(1);
  });
});