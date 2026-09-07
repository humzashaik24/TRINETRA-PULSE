import {
  normalizeAccount,
  normalizeByType,
  normalizeLocation,
  normalizeOrganization,
  normalizePersonName,
  normalizePhone,
  normalizeTransaction,
  normalizeVehicle,
  normalizedEquivalence,
} from '../entity-normalization';

describe('normalizePersonName', () => {
  it('preserves the raw value and collapses whitespace', () => {
    const r = normalizePersonName('  RAHUL   KUMAR ');
    expect(r.rawValue).toBe('RAHUL   KUMAR');
    expect(r.normalizedValue).toBe('rahul kumar');
    expect(r.displayValue).toBe('Rahul Kumar');
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('handles empty input', () => {
    const r = normalizePersonName('   ');
    expect(r.method).toBe('none');
    expect(r.normalizedValue).toBe('');
  });

  it('is case-insensitive for matching', () => {
    expect(normalizedEquivalence('person', 'rahul kumar', 'RAHUL Kumar')).toBe(true);
    expect(normalizedEquivalence('person', 'rahul kumar', 'rahul patel')).toBe(false);
    expect(normalizedEquivalence('person', 'R. Kumar', 'rahul kumar')).toBe(false);
  });
});

describe('normalizePhone', () => {
  it('formats a local 10-digit number into +91 canonical form', () => {
    const r = normalizePhone('98765 43210');
    expect(r.normalizedValue).toBe('919876543210');
    expect(r.displayValue).toBe('+91 98765 43210');
    expect(r.warnings.some((w) => w.includes('country code'))).toBe(true);
  });

  it('accepts a leading-zero dialing code', () => {
    const r = normalizePhone('09876543210');
    expect(r.normalizedValue).toBe('919876543210');
  });

  it('keeps an already canonical international number as-is', () => {
    const r = normalizePhone('+91 98765 43210');
    expect(r.normalizedValue).toBe('919876543210');
    expect(r.warnings.some((w) => w.includes('country code'))).toBe(false);
  });

  it('flags an unexpected digit count', () => {
    const r = normalizePhone('12345');
    expect(r.warnings.some((w) => w.includes('Unexpected phone digit count'))).toBe(true);
  });

  it('treats differently formatted same numbers as equivalent', () => {
    expect(normalizedEquivalence('phone', '+91 98765 43210', '9876543210')).toBe(true);
    expect(normalizedEquivalence('phone', '9876543210', '9812345678')).toBe(false);
  });
});

describe('normalizeVehicle', () => {
  it('normalizes registration into uppercase compact form', () => {
    const r = normalizeVehicle(' mh 14 bx 2231 ');
    expect(r.normalizedValue).toBe('MH14BX2231');
    expect(r.warnings).toEqual([]);
  });

  it('warns on an unrecognized format without altering the raw value', () => {
    const r = normalizeVehicle('MH-14-JUNK');
    expect(r.rawValue).toBe('MH-14-JUNK');
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('normalizeOrganization', () => {
  it('standardizes legal suffixes for display but keeps matching lowercase', () => {
    const r = normalizeOrganization('acme pvt ltd');
    expect(r.displayValue).toBe('acme Pvt Ltd');
    expect(r.normalizedValue).toBe('acme pvt ltd');
  });

  it('preserves acronym casing while leaving other words untouched', () => {
    const r = normalizeOrganization('NGO bla');
    expect(r.displayValue).toBe('NGO bla');
  });
});

describe('normalizeLocation', () => {
  it('collapses punctuation to a canonical key while preserving display', () => {
    const r = normalizeLocation('Pune, Maharashtra');
    expect(r.normalizedValue).toBe('pune maharashtra');
    expect(r.displayValue).toBe('Pune, Maharashtra');
  });
});

describe('normalizeAccount', () => {
  it('extracts digits only', () => {
    const r = normalizeAccount('ACC-7784');
    expect(r.normalizedValue).toBe('7784');
  });
});

describe('normalizeTransaction', () => {
  it('collapses and uppercases transaction ids', () => {
    const r = normalizeTransaction('tx- 1187');
    expect(r.normalizedValue).toBe('TX- 1187');
  });
});

describe('normalizeByType fallback', () => {
  it('uses generic normalization for untyped/case-type values', () => {
    const r = normalizeByType('case', '  FIR-2026-001 ');
    expect(r.method).toBe('generic');
    expect(r.normalizedValue).toBe('fir-2026-001');
  });
});