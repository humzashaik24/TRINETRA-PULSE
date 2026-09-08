/**
 * Tests for the Phase 17.6 typed evidence API adapter.
 *
 * Covers the mapping of persisted ``RealEvidence`` rows into the Phase 12 UI
 * shapes (search source + detail item, preserving the SHA-256 integrity
 * block), the fetch layer, and the deterministic search/filter/sort/pagination
 * semantics the workspace consumes over the API row set.
 */

import {
  mapEvidenceSource,
  mapEvidenceItem,
  getEvidenceById,
  getEvidenceIntegrity,
  getEvidenceChain,
  getEvidenceChainVerification,
  recordEvidenceChainVerification,
  loadEvidenceSearch,
  OPERATION_MERIDIAN_ID,
  OPERATION_MERIDIAN_EVIDENCE_001,
} from './evidence';
import type { RealEvidence } from './investigations';
import type { EvidenceItem } from '@trinetra-pulse/types';

const row = (overrides: Partial<RealEvidence> = {}): RealEvidence => ({
  id: OPERATION_MERIDIAN_EVIDENCE_001,
  investigation_id: OPERATION_MERIDIAN_ID,
  evidence_type: 'FIR',
  title: 'First Information Report',
  description: 'Initial FIR recorded for Operation Meridian.',
  source: 'fir_registry.json',
  provenance: {
    source_id: 'fir_registry.json #FIR-001',
    dataset_id: 'fir_registry',
    document_id: 'fir-001',
    confidence: 0.9,
  },
  collected_at: '2026-08-18T08:30:00.000000',
  storage_ref: 'blob://fir-001',
  metadata: {
    is_demo: true,
    canonical_id: 'ev-001',
    dataset_id: 'fir_registry',
    record_identifier: 'FIR-2026-001',
  },
  created_at: '2026-08-18T09:00:00.000000',
  updated_at: '2026-08-18T09:00:00.000000',
  integrity: {
    checksum: 'a'.repeat(64),
    status: 'VERIFIED',
  },
  ...overrides,
});

describe('OPERATION_MERIDIAN_* demo anchors', () => {
  it('exposes the deterministic Operation Meridian ids', () => {
    expect(OPERATION_MERIDIAN_ID).toBe('6c887c98-939a-50ce-ac27-f58376941de2');
    expect(OPERATION_MERIDIAN_EVIDENCE_001).toBe(
      'c5c948b4-aeb7-5915-bd6e-5df573fed86c',
    );
  });
});

describe('mapEvidenceSource', () => {
  it('maps a persisted row into the lightweight search-row shape', () => {
    const source = mapEvidenceSource(row());
    expect(source).toMatchObject({
      id: OPERATION_MERIDIAN_EVIDENCE_001,
      title: 'First Information Report',
      evidenceType: 'FIR',
      status: 'AVAILABLE',
      sourceName: 'fir_registry.json',
      investigationId: OPERATION_MERIDIAN_ID,
      isDemoData: true,
    });
    expect(source.entityIds).toEqual([]);
    expect(source.findingIds).toEqual([]);
    expect(source.eventIds).toEqual([]);
  });

  it('falls back to provenance.source and then Relational API', () => {
    expect(
      mapEvidenceSource(
        row({ source: null, provenance: { source: 'fir_registry.json' } }),
      ).sourceName,
    ).toBe('fir_registry.json');
    expect(
      mapEvidenceSource(row({ source: null, provenance: {} })).sourceName,
    ).toBe('Relational API');
  });
});

describe('mapEvidenceItem', () => {
  it('maps the persisted row into the full detail shape', () => {
    const item = mapEvidenceItem(row());
    expect(item.id).toBe(OPERATION_MERIDIAN_EVIDENCE_001);
    expect(item.title).toBe('First Information Report');
    expect(item.evidenceType).toBe('FIR');
    expect(item.status).toBe('AVAILABLE');
    expect(item.extractionMethod).toBe('MANUAL');
    expect(item.extractionConfidence).toBe(0.9);
    expect(item.investigationId).toBe(OPERATION_MERIDIAN_ID);
    expect(item.createdAt).toBe('2026-08-18T09:00:00.000000');
    expect(item.links).toEqual([]);
    expect(item.versions).toEqual([]);
    expect(item.timeline).toEqual([]);
    expect(item.isDemoData).toBe(true);
    expect(item.datasetId).toBe('fir_registry');
  });

  it('surfaces the SHA-256 integrity block as provenance hash + integrity', () => {
    const item = mapEvidenceItem(row());
    expect(item.provenance.hash).toBe('a'.repeat(64));
    expect(item.integrity).toEqual({ checksum: 'a'.repeat(64), status: 'VERIFIED' });
  });

  it('rebuilds provenance from the persisted provenance dict + metadata', () => {
    const item = mapEvidenceItem(row());
    expect(item.provenance.source).toBe('fir_registry.json');
    expect(item.provenance.sourceId).toBe('fir_registry.json #FIR-001');
    expect(item.provenance.datasetId).toBe('fir_registry');
    expect(item.provenance.recordIdentifier).toBe('FIR-2026-001');
    expect(item.provenance.version).toBe(1);
    expect(item.provenance.reviewState).toBe('PENDING');
  });

  it('leaves integrity/provenance.hash undefined when the backend has none', () => {
    const item = mapEvidenceItem(row({ integrity: null }));
    expect(item.provenance.hash).toBeUndefined();
    expect(item.integrity).toBeUndefined();
  });
});

describe('fetch layer', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches a scoped evidence row by id', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(row()),
    } as unknown as Response);

    const result = await getEvidenceById(
      OPERATION_MERIDIAN_EVIDENCE_001,
      OPERATION_MERIDIAN_ID,
    );
    expect(result.id).toBe(OPERATION_MERIDIAN_EVIDENCE_001);
    const [url] = (global.fetch as jest.Mock).mock.calls[0] as unknown as [string];
    expect(url).toBe(
      `/api/v2/evidence/${OPERATION_MERIDIAN_EVIDENCE_001}?investigation_id=${OPERATION_MERIDIAN_ID}`,
    );
  });

  it('fetches the integrity block', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ checksum: 'a'.repeat(64), status: 'VERIFIED' }),
    } as unknown as Response);

    const integrity = await getEvidenceIntegrity(OPERATION_MERIDIAN_EVIDENCE_001);
    expect(integrity).toEqual({ checksum: 'a'.repeat(64), status: 'VERIFIED' });
    const [url] = (global.fetch as jest.Mock).mock.calls[0] as unknown as [string];
    expect(url).toBe(
      `/api/v2/evidence/${OPERATION_MERIDIAN_EVIDENCE_001}/integrity`,
    );
  });
});

describe('loadEvidenceSearch', () => {
  const rows = [
    row(),
    row({
      id: 'ev-004-id',
      evidence_type: 'COMMUNICATION',
      title: 'Call Detail Record',
      source: 'cdr_provider.json',
      provenance: { source_id: 'cdr_provider.json #CDR-004' },
      metadata: { is_demo: true, canonical_id: 'ev-004', dataset_id: 'cdr_provider' },
    }),
    row({
      id: 'ev-007-id',
      evidence_type: 'REPORT',
      title: 'GST registration',
      source: 'gst_registry.json',
      provenance: {
        source_id: 'gst_registry.json #MTC-001',
        confidence: 0.9,
      },
      metadata: { is_demo: true, canonical_id: 'ev-007', dataset_id: 'gst_registry' },
    }),
    row({
      id: 'ev-009-id',
      evidence_type: 'DOCUMENT',
      title: 'Consignment manifest',
      source: 'shipping_manifest.json',
      provenance: { source_id: 'shipping_manifest.json #MAN-009' },
      metadata: { is_demo: true, canonical_id: 'ev-009', dataset_id: 'manifest' },
    }),
  ];

  const stubFetch = () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(rows),
    } as unknown as Response);
  };

  const originalFetch = global.fetch;

  beforeEach(() => stubFetch());

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the full row set with facets', async () => {
    const result = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, {});
    expect(result.items).toHaveLength(4);
    expect(result.total).toBe(4);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.facets?.evidenceTypes.FIR).toBe(1);
    expect(result.facets?.evidenceTypes.COMMUNICATION).toBe(1);
    expect(result.facets?.sources['gst_registry.json']).toBe(1);
  });

  it('filters by query across searchable fields', async () => {
    const result = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, {
      query: 'gst registration',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ title: 'GST registration' });
  });

  it('filters by evidence type and source name', async () => {
    const byType = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, {
      evidenceTypes: ['COMMUNICATION'],
    });
    expect(byType.items.map((i) => i.title)).toEqual(['Call Detail Record']);

    const bySource = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, {
      sourceNames: ['gst_registry.json'],
    });
    expect(bySource.items.map((i) => i.title)).toEqual(['GST registration']);
  });

  it('matches nothing for non-modeled filters (honest empty)', async () => {
    const result = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, {
      statuses: ['VERIFIED'],
    });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);

    const tags = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, { tags: ['x'] });
    expect(tags.items).toHaveLength(0);
  });

  it('paginates deterministically', async () => {
    const page1 = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, {
      page: 1,
      pageSize: 2,
    });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(4);
    expect(page1.totalPages).toBe(2);

    const page2 = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, {
      page: 2,
      pageSize: 2,
    });
    expect(page2.items).toHaveLength(2);
    expect(page2.page).toBe(2);
  });

  it('sorts by title with the requested direction', async () => {
    const asc = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, {
      sortBy: 'title',
      sortOrder: 'asc',
    });
    const titles = asc.items.map((i) => i.title);
    expect([...titles].sort()).toEqual(titles);

    const desc = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, {
      sortBy: 'title',
      sortOrder: 'desc',
    });
    const titlesDesc = desc.items.map((i) => i.title);
    expect([...titlesDesc].sort().reverse()).toEqual(titlesDesc);
  });

  it('never fabricates relational link data in the returned sources', async () => {
    const result = await loadEvidenceSearch(OPERATION_MERIDIAN_ID, {});
    for (const item of result.items) {
      expect(item.entityIds).toEqual([]);
      expect(item.findingIds).toEqual([]);
      expect(item.eventIds).toEqual([]);
    }
  });
});

describe('EvidenceItem integrity slice', () => {
  it('keeps the integrity block optional and typed', () => {
    const withIntegrity: EvidenceItem = mapEvidenceItem(row());
    expect(withIntegrity.integrity?.status).toBe('VERIFIED');
    const withoutIntegrity: EvidenceItem = mapEvidenceItem(row({ integrity: null }));
    expect(withoutIntegrity.integrity).toBeUndefined();
  });
});

describe('custody chain fetch layer (Phase 18.2)', () => {
  const originalFetch = global.fetch;

  const chainEntry = (sequenceNumber: number) => ({
    id: `chain-${sequenceNumber}`,
    evidence_id: OPERATION_MERIDIAN_EVIDENCE_001,
    investigation_id: OPERATION_MERIDIAN_ID,
    sequence_number: sequenceNumber,
    action: 'evidence_created',
    payload_hash: 'p'.repeat(64),
    metadata_hash: 'm'.repeat(64),
    previous_entry_hash: sequenceNumber === 1 ? null : `h${sequenceNumber - 1}`,
    entry_hash: `h${sequenceNumber}`,
    actor_id: null,
    actor_email: 'Inspector Mehta',
    details: { phase: '18.2', source: 'api_create' },
    created_at: '2026-08-18T09:00:00.000000',
    updated_at: '2026-08-18T09:00:00.000000',
  });

  const verification = {
    status: 'VALID',
    valid: true,
    entries: 2,
    reason: null,
    verified_at: '2026-08-18T09:05:00.000000',
  };

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches the scoped custody chain', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([chainEntry(1), chainEntry(2)]),
    } as unknown as Response);

    const entries = await getEvidenceChain(
      OPERATION_MERIDIAN_EVIDENCE_001,
      OPERATION_MERIDIAN_ID,
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].sequence_number).toBe(1);
    const [url] = (global.fetch as jest.Mock).mock.calls[0] as unknown as [string];
    expect(url).toBe(
      `/api/v2/evidence/${OPERATION_MERIDIAN_EVIDENCE_001}/chain?investigation_id=${OPERATION_MERIDIAN_ID}`,
    );
  });

  it('verifies read-only via GET (no audit write)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(verification),
    } as unknown as Response);

    const result = await getEvidenceChainVerification(OPERATION_MERIDIAN_EVIDENCE_001);
    expect(result).toMatchObject({ status: 'VALID', valid: true, entries: 2 });
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/v2/evidence/${OPERATION_MERIDIAN_EVIDENCE_001}/chain/verify`);
    // Read-only verification must never write an audit event.
    expect(opts.method).toBe('GET');
  });

  it('records verification via POST with the scoped query', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ...verification, valid: false, status: 'TAMPERED' }),
    } as unknown as Response);

    const result = await recordEvidenceChainVerification(
      OPERATION_MERIDIAN_EVIDENCE_001,
      OPERATION_MERIDIAN_ID,
    );
    expect(result.status).toBe('TAMPERED');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0] as unknown as [string, RequestInit & { method?: string }];
    expect(url).toBe(
      `/api/v2/evidence/${OPERATION_MERIDIAN_EVIDENCE_001}/chain/verify?investigation_id=${OPERATION_MERIDIAN_ID}`,
    );
    expect(opts.method).toBe('POST');
  });

  it('surfaces backend failures as ApiClientError rather than fabricating a chain', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          code: 'evidence_not_found',
          message: 'Evidence not found',
          details: {},
          status_code: 404,
        }),
    } as unknown as Response);

    await expect(getEvidenceChain('missing-id')).rejects.toMatchObject({
      code: 'evidence_not_found',
    });
  });
});