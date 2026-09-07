import {
  suggestMapping,
  autoSuggestMappings,
  allHeadersRecognized,
  hasRequiredMappings,
  TARGET_LABELS,
} from '@/lib/csv-mapping';

describe('suggestMapping', () => {
  it('maps "caller_num" to phone', () => {
    const result = suggestMapping('caller_num');
    expect(result.target).toBe('phone');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('maps "person_name" to person', () => {
    const result = suggestMapping('person_name');
    expect(result.target).toBe('person');
  });

  it('maps "vehicle_no" to vehicle', () => {
    const result = suggestMapping('vehicle_no');
    expect(result.target).toBe('vehicle');
  });

  it('maps "address" to location', () => {
    const result = suggestMapping('address');
    expect(result.target).toBe('location');
  });

  it('maps "company" to organization', () => {
    const result = suggestMapping('company');
    expect(result.target).toBe('organization');
  });

  it('maps "bank_account" to account', () => {
    const result = suggestMapping('bank_account');
    expect(result.target).toBe('account');
  });

  it('maps "txn_amount" to transaction', () => {
    const result = suggestMapping('txn_amount');
    expect(result.target).toBe('transaction');
  });

  it('maps "fir_number" to id', () => {
    const result = suggestMapping('fir_number');
    expect(result.target).toBe('id');
  });

  it('returns skip for unrecognized headers', () => {
    const result = suggestMapping('random_column_xyz');
    expect(result.target).toBe('skip');
  });

  it('is case-insensitive', () => {
    const result = suggestMapping('CALLER_NUM');
    expect(result.target).toBe('phone');
  });

  it('handles headers with spaces and hyphens', () => {
    const result = suggestMapping('Caller Num');
    expect(result.target).toBe('phone');
  });
});

describe('autoSuggestMappings', () => {
  it('returns one suggestion per header', () => {
    const results = autoSuggestMappings(['name', 'phone', 'unknown']);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.sourceColumn)).toEqual(['name', 'phone', 'unknown']);
  });
});

describe('allHeadersRecognized', () => {
  it('returns true when all headers have confident mappings', () => {
    const suggestions = autoSuggestMappings(['name', 'phone', 'address']);
    expect(allHeadersRecognized(suggestions)).toBe(true);
  });

  it('returns false when any header is skipped', () => {
    const suggestions = autoSuggestMappings(['name', 'xyz_unknown', 'address']);
    expect(allHeadersRecognized(suggestions)).toBe(false);
  });

  it('returns false when confidence is low', () => {
    const suggestions = [
      { sourceColumn: 'a', target: 'phone' as const, confidence: 0.1 },
    ];
    expect(allHeadersRecognized(suggestions)).toBe(false);
  });
});

describe('hasRequiredMappings', () => {
  it('returns true when at least one column is mapped', () => {
    const mappings = [
      { sourceColumn: 'a', target: 'phone' as const, confidence: 0.8 },
      { sourceColumn: 'b', target: 'skip' as const, confidence: 0 },
    ];
    expect(hasRequiredMappings(mappings)).toBe(true);
  });

  it('returns false when all columns are skipped', () => {
    const mappings = [
      { sourceColumn: 'a', target: 'skip' as const, confidence: 0 },
      { sourceColumn: 'b', target: 'skip' as const, confidence: 0 },
    ];
    expect(hasRequiredMappings(mappings)).toBe(false);
  });
});

describe('TARGET_LABELS', () => {
  it('has human-readable labels for all targets', () => {
    expect(TARGET_LABELS.person).toBe('Person Name');
    expect(TARGET_LABELS.phone).toBe('Phone Number');
    expect(TARGET_LABELS.skip).toBe('Do not import');
    expect(Object.keys(TARGET_LABELS)).toHaveLength(9);
  });
});
