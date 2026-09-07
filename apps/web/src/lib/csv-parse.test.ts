import { parseCsvPreview } from '@/lib/csv-parse';

describe('parseCsvPreview', () => {
  it('parses a simple CSV with headers and rows', () => {
    const csv = 'name,phone,city\nAlice,123,Mumbai\nBob,456,Delhi';
    const result = parseCsvPreview(csv);
    expect(result.headers).toEqual(['name', 'phone', 'city']);
    expect(result.previewRows).toEqual([
      ['Alice', '123', 'Mumbai'],
      ['Bob', '456', 'Delhi'],
    ]);
    expect(result.totalLines).toBe(2);
  });

  it('returns empty for empty input', () => {
    const result = parseCsvPreview('');
    expect(result.headers).toEqual([]);
    expect(result.previewRows).toEqual([]);
    expect(result.totalLines).toBe(0);
  });

  it('trims whitespace in cells', () => {
    const csv = ' name , phone \n Alice , 123 ';
    const result = parseCsvPreview(csv);
    expect(result.headers).toEqual(['name', 'phone']);
    expect(result.previewRows[0]).toEqual(['Alice', '123']);
  });

  it('limits preview rows to maxPreview', () => {
    const csv = 'a,b\n1,2\n3,4\n5,6\n7,8\n9,10';
    const result = parseCsvPreview(csv, 2);
    expect(result.previewRows).toHaveLength(2);
    expect(result.totalLines).toBe(5);
  });

  it('handles quoted fields with commas', () => {
    const csv = 'name,city\nAlice,"Mumbai, India"\nBob,Delhi';
    const result = parseCsvPreview(csv);
    expect(result.previewRows[0]).toEqual(['Alice', 'Mumbai, India']);
  });

  it('handles quoted fields with escaped quotes', () => {
    const csv = 'name,note\nAlice,"She said ""hello"""';
    const result = parseCsvPreview(csv);
    expect(result.previewRows[0]).toEqual(['Alice', 'She said "hello"']);
  });

  it('handles \\r\\n line endings', () => {
    const csv = 'a,b\r\n1,2\r\n3,4';
    const result = parseCsvPreview(csv);
    expect(result.headers).toEqual(['a', 'b']);
    expect(result.previewRows).toHaveLength(2);
  });

  it('skips empty trailing lines', () => {
    const csv = 'a,b\n1,2\n\n';
    const result = parseCsvPreview(csv);
    expect(result.totalLines).toBe(1);
  });
});
