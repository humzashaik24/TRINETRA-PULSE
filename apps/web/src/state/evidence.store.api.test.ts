/**
 * API-mode tests for the evidence intelligence store (Phase 17.6).
 *
 * With `NEXT_PUBLIC_USE_MOCK_API=false` the store must route the evidence
 * workflow through the typed /api/v2 evidence adapter (`@/lib/api/evidence`),
 * never the mock evidence service, and must NOT silently fall back to mock
 * rows on API failure — the error state is surfaced instead. Coverage /
 * support / collections slices have no relational endpoints yet (Phase 17.7
 * boundary) and must stay honestly empty in API mode.
 */

import { useEvidenceStore } from '@/state/evidence.store';
import type { EvidenceItem } from '@trinetra-pulse/types';

// Force API mode for the whole module under test.
jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

// Phase 25 compatibility: the real store now imports the on-device whisper
// orchestrator; jest mocks that module.
jest.mock('@/lib/whisper/local-whisper', () => ({
  detectLocalWhisperCapability: jest.fn(() => ({ supported: true })),
  runLocalWhisper: jest.fn(),
}));

jest.mock('@/lib/api/evidence', () => ({
  getEvidenceById: jest.fn(),
  loadEvidenceSearch: jest.fn(),
  mapEvidenceItem: jest.fn(),
  getEvidenceChain: jest.fn(),
  getEvidenceChainVerification: jest.fn(),
  recordEvidenceChainVerification: jest.fn(),
}));

jest.mock('@/services/evidence.service', () => ({}));

import {
  getEvidenceById,
  loadEvidenceSearch,
  mapEvidenceItem,
  getEvidenceChain,
  getEvidenceChainVerification,
  recordEvidenceChainVerification,
} from '@/lib/api/evidence';

const mockedApi = jest.mocked({
  getEvidenceById,
  loadEvidenceSearch,
  mapEvidenceItem,
  getEvidenceChain,
  getEvidenceChainVerification,
  recordEvidenceChainVerification,
});

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const EVIDENCE_ID = 'c5c948b4-aeb7-5915-bd6e-5df573fed86c';

const realRow = () => ({
  id: EVIDENCE_ID,
  investigation_id: INVESTIGATION_ID,
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
  metadata: { is_demo: true, canonical_id: 'ev-001', dataset_id: 'fir_registry' },
  created_at: '2026-08-18T09:00:00.000000',
  updated_at: '2026-08-18T09:00:00.000000',
  integrity: { checksum: 'a'.repeat(64), status: 'VERIFIED' },
});

const mappedItem = (): EvidenceItem => ({
  id: EVIDENCE_ID,
  title: 'First Information Report',
  description: 'Initial FIR recorded for Operation Meridian.',
  evidenceType: 'FIR',
  status: 'AVAILABLE',
  investigationId: INVESTIGATION_ID,
  datasetId: 'fir_registry',
  datasetName: undefined,
  documentId: 'fir-001',
  sourceName: 'fir_registry.json',
  extractionMethod: 'MANUAL',
  extractionConfidence: 0.9,
  observedAt: '2026-08-18T08:30:00.000000',
  createdAt: '2026-08-18T09:00:00.000000',
  updatedAt: '2026-08-18T09:00:00.000000',
  provenance: {
    source: 'fir_registry.json',
    sourceId: 'fir_registry.json #FIR-001',
    datasetId: 'fir_registry',
    createdAt: '2026-08-18T09:00:00.000000',
    observedAt: undefined,
    recordIdentifier: undefined,
    version: 1,
    reviewState: 'PENDING',
  },
  metadata: {},
  snippet: undefined,
  links: [],
  versions: [],
  timeline: [],
  isDemoData: true,
  integrity: { checksum: 'a'.repeat(64), status: 'VERIFIED' },
  tags: [],
});

const defaultState = () => ({
  investigationId: null,
  items: [],
  selectedItem: null,
  selectedItemId: null,
  loading: false,
  error: null,
  searchQuery: '',
  filters: {},
  sortBy: 'observedAt' as const,
  sortOrder: 'desc' as const,
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  facets: null,
  coverage: [],
  relationshipSupport: [],
  findingSupport: [],
  entitySummaries: [],
  collections: [],
  chain: null,
  chainVerification: null,
  chainLoading: false,
  chainError: null,
  chainAvailable: false,
});

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('evidence store — API mode (Phase 17.6)', () => {
  beforeEach(() => {
    useEvidenceStore.setState(defaultState() as never, false);
    jest.clearAllMocks();
    mockedApi.loadEvidenceSearch.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      facets: {
        evidenceTypes: {},
        statuses: {},
        sources: {},
        entities: {},
      },
    } as never);
    mockedApi.mapEvidenceItem.mockReturnValue(mappedItem() as never);
    mockedApi.getEvidenceById.mockResolvedValue(realRow() as never);
  });

  it('loads evidence through the typed /api/v2 adapter in API mode', async () => {
    mockedApi.loadEvidenceSearch.mockResolvedValue({
      items: [{ id: EVIDENCE_ID }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      facets: {
        evidenceTypes: { FIR: 1 },
        statuses: { AVAILABLE: 1 },
        sources: { 'fir_registry.json': 1 },
        entities: {},
      },
    } as never);

    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await Promise.resolve();
    // setInvestigationId calls fetchEvidence internally.
    await useEvidenceStore.getState().fetchEvidence();

    expect(mockedApi.loadEvidenceSearch).toHaveBeenCalledWith(
      INVESTIGATION_ID,
      expect.objectContaining({ investigationId: INVESTIGATION_ID }),
    );
    expect(useEvidenceStore.getState().items).toHaveLength(1);
    expect(useEvidenceStore.getState().total).toBe(1);
    expect(useEvidenceStore.getState().facets?.evidenceTypes.FIR).toBe(1);
  });

  it('resolves selection through getEvidenceById scoped to the investigation', async () => {
    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEvidenceStore.getState().fetchEvidence();

    useEvidenceStore.getState().selectItem(EVIDENCE_ID);
    await flush();
    await flush();

    expect(mockedApi.getEvidenceById).toHaveBeenCalledWith(
      EVIDENCE_ID,
      INVESTIGATION_ID,
    );
    expect(mockedApi.mapEvidenceItem).toHaveBeenCalled();
    expect(useEvidenceStore.getState().selectedItem?.id).toBe(EVIDENCE_ID);
    expect(useEvidenceStore.getState().loading).toBe(false);
  });

  it('fetchItem resolves the mapped persisted row', async () => {
    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEvidenceStore.getState().fetchEvidence();

    const item = await useEvidenceStore.getState().fetchItem(EVIDENCE_ID);
    expect(item.id).toBe(EVIDENCE_ID);
    expect(useEvidenceStore.getState().selectedItemId).toBe(EVIDENCE_ID);
  });

  it('surfaces API failures as the error state without mock fallback', async () => {
    mockedApi.loadEvidenceSearch.mockRejectedValue(
      new Error('fetch failed') as never,
    );

    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEvidenceStore.getState().fetchEvidence();

    expect(useEvidenceStore.getState().loading).toBe(false);
    expect(useEvidenceStore.getState().error).toContain('fetch failed');
    // No silent fallback: items must not be populated from the mock universe.
    expect(useEvidenceStore.getState().items).toEqual([]);
  });

  it('surfaces selection failures as the error state without mock fallback', async () => {
    mockedApi.getEvidenceById.mockRejectedValue(
      new Error('not found') as never,
    );

    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEvidenceStore.getState().fetchEvidence();

    useEvidenceStore.getState().selectItem(EVIDENCE_ID);
    await flush();
    await flush();

    expect(useEvidenceStore.getState().loading).toBe(false);
    expect(useEvidenceStore.getState().error).toContain('not found');
    expect(useEvidenceStore.getState().selectedItem).toBeNull();
  });

  it('keeps coverage, support, entity summaries and collections honestly empty in API mode', async () => {
    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEvidenceStore.getState().fetchEvidence();

    await useEvidenceStore.getState().fetchCoverage();
    await useEvidenceStore.getState().fetchRelationshipSupport();
    await useEvidenceStore.getState().fetchFindingSupport();
    await useEvidenceStore.getState().fetchEntitySummaries(['ent-1']);
    await useEvidenceStore.getState().fetchCollections();

    expect(useEvidenceStore.getState().coverage).toEqual([]);
    expect(useEvidenceStore.getState().relationshipSupport).toEqual([]);
    expect(useEvidenceStore.getState().findingSupport).toEqual([]);
    expect(useEvidenceStore.getState().entitySummaries).toEqual([]);
    expect(useEvidenceStore.getState().collections).toEqual([]);
    // Never fabricated, and never routed to the mock evidence service.
    expect(useEvidenceStore.getState().error).toBeNull();
  });

  it('clears state and reloads through the API on investigation switch', async () => {
    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEvidenceStore.getState().fetchEvidence();
    useEvidenceStore.getState().selectItem(EVIDENCE_ID);
    await flush();
    await flush();
    expect(useEvidenceStore.getState().selectedItem).not.toBeNull();

    mockedApi.loadEvidenceSearch.mockClear();
    useEvidenceStore.getState().setInvestigationId('another-inv');
    await useEvidenceStore.getState().fetchEvidence();

    expect(useEvidenceStore.getState().investigationId).toBe('another-inv');
    expect(mockedApi.loadEvidenceSearch).toHaveBeenCalledWith(
      'another-inv',
      expect.anything(),
    );
    expect(useEvidenceStore.getState().selectedItem).toBeNull();
  });

  it('clear resets to the initial empty state', () => {
    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    useEvidenceStore.getState().clear();
    expect(useEvidenceStore.getState().investigationId).toBeNull();
    expect(useEvidenceStore.getState().items).toEqual([]);
    expect(useEvidenceStore.getState().selectedItem).toBeNull();
  });

  describe('custody chain slice (Phase 18.2)', () => {
    const chainEntry = (sequenceNumber: number) => ({
      id: `chain-${sequenceNumber}`,
      evidence_id: EVIDENCE_ID,
      investigation_id: INVESTIGATION_ID,
      sequence_number: sequenceNumber,
      action: 'evidence_created',
      payload_hash: 'p'.repeat(64),
      metadata_hash: 'm'.repeat(64),
      previous_entry_hash: sequenceNumber === 1 ? null : `h${sequenceNumber - 1}`,
      entry_hash: `h${sequenceNumber}`,
      actor_id: null,
      actor_email: 'Inspector Mehta',
      details: { source: 'api_create' },
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

    beforeEach(() => {
      mockedApi.getEvidenceChain.mockResolvedValue([
        chainEntry(1),
        chainEntry(2),
      ] as never);
      mockedApi.getEvidenceChainVerification.mockResolvedValue(verification as never);
      mockedApi.recordEvidenceChainVerification.mockResolvedValue(verification as never);
    });

    it('fetchChain loads chain + read-only verification scoped to the investigation', async () => {
      useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
      await useEvidenceStore.getState().fetchChain(EVIDENCE_ID);

      expect(mockedApi.getEvidenceChain).toHaveBeenCalledWith(
        EVIDENCE_ID,
        INVESTIGATION_ID,
      );
      expect(mockedApi.getEvidenceChainVerification).toHaveBeenCalledWith(
        EVIDENCE_ID,
        INVESTIGATION_ID,
      );
      expect(useEvidenceStore.getState().chain).toHaveLength(2);
      expect(useEvidenceStore.getState().chainVerification?.status).toBe('VALID');
      expect(useEvidenceStore.getState().chainAvailable).toBe(true);
      expect(useEvidenceStore.getState().chainLoading).toBe(false);
    });

    it('fetchChain surfaces a missing-chain read as a non-blocking empty state', async () => {
      mockedApi.getEvidenceChainVerification.mockRejectedValue(
        new Error('integrity check impossible') as never,
      );
      mockedApi.getEvidenceChain.mockRejectedValue(
        new Error('no chain') as never,
      );

      useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
      await useEvidenceStore.getState().fetchChain(EVIDENCE_ID);

      expect(useEvidenceStore.getState().chain).toBeNull();
      expect(useEvidenceStore.getState().chainVerification).toBeNull();
      expect(useEvidenceStore.getState().chainAvailable).toBe(false);
      // Informational failure must not poison the evidence error state, and
      // never fabricates a chain.
      expect(useEvidenceStore.getState().error).toBeNull();
      expect(useEvidenceStore.getState().chainError).toContain('no chain');
    });

    it('fetchChain resets the whole chain slice when any read fails', async () => {
      mockedApi.getEvidenceChainVerification.mockRejectedValue(
        new Error('verifier down') as never,
      );
      mockedApi.getEvidenceChain.mockResolvedValue([chainEntry(1)] as never);

      useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
      await useEvidenceStore.getState().fetchChain(EVIDENCE_ID);

      // Atomic contract: partial failure leaves no half-verified chain state.
      expect(useEvidenceStore.getState().chain).toBeNull();
      expect(useEvidenceStore.getState().chainVerification).toBeNull();
      expect(useEvidenceStore.getState().chainAvailable).toBe(false);
      expect(useEvidenceStore.getState().chainError).toContain('verifier down');
      expect(mockedApi.getEvidenceChain).toHaveBeenCalled();
    });

    it('verifyChain records an audited verification via POST and never a GET', async () => {
      mockedApi.recordEvidenceChainVerification.mockResolvedValue({
        ...verification,
        status: 'TAMPERED',
        valid: false,
      } as never);

      useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
      await useEvidenceStore.getState().verifyChain(EVIDENCE_ID);

      expect(mockedApi.recordEvidenceChainVerification).toHaveBeenCalledWith(
        EVIDENCE_ID,
        INVESTIGATION_ID,
      );
      expect(mockedApi.getEvidenceChainVerification).not.toHaveBeenCalled();
      expect(useEvidenceStore.getState().chainVerification?.status).toBe('TAMPERED');
    });

    it('resets the chain when switching evidence selection', async () => {
      useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
      await useEvidenceStore.getState().fetchChain(EVIDENCE_ID);
      expect(useEvidenceStore.getState().chain).not.toBeNull();

      useEvidenceStore.getState().selectItem('another-evidence');
      await flush();
      expect(useEvidenceStore.getState().chain).toBeNull();
      expect(useEvidenceStore.getState().chainVerification).toBeNull();
    });

    it('clear resets the chain slice', async () => {
      useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
      await useEvidenceStore.getState().fetchChain(EVIDENCE_ID);
      expect(useEvidenceStore.getState().chainAvailable).toBe(true);

      useEvidenceStore.getState().clear();
      expect(useEvidenceStore.getState().chain).toBeNull();
      expect(useEvidenceStore.getState().chainVerification).toBeNull();
      expect(useEvidenceStore.getState().chainAvailable).toBe(false);
    });
  });
});