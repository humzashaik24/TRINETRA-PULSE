/**
 * Phase C — API-mode tests for the patterns store.
 *
 * Forces `isMockData` to false and pins the contract of the investigation-
 * scoped patterns load: canonical id resolution, the real backend detection
 * endpoint, best-effort enrichment refs, explicit error state on detection
 * failure, honest empty state, and the stale-guard across investigation
 * switches.
 */

import { usePatternsStore } from './patterns.store';
import type { PatternDetectionResponse } from '@trinetra-pulse/types';
import type { RealEntity } from '@/lib/api/investigations';

// ---------------------------------------------------------------------------
// MOCKS
// ---------------------------------------------------------------------------

jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

jest.mock('@/lib/api/patterns', () => ({
  getInvestigationPatterns: jest.fn(),
}));

jest.mock('@/lib/api/resolve-investigation', () => ({
  resolveInvestigationId: jest.fn((id: string) => Promise.resolve(id)),
}));

jest.mock('@/lib/api/entities', () => ({
  listInvestigationEntities: jest.fn(),
}));

jest.mock('@/lib/api/investigations', () => ({
  listEvidenceForInvestigation: jest.fn(),
  listRelationshipsForInvestigation: jest.fn(),
}));

import { getInvestigationPatterns } from '@/lib/api/patterns';
import { resolveInvestigationId } from '@/lib/api/resolve-investigation';
import { listInvestigationEntities } from '@/lib/api/entities';
import {
  listEvidenceForInvestigation,
  listRelationshipsForInvestigation,
} from '@/lib/api/investigations';

const mockedGetPatterns = jest.mocked(getInvestigationPatterns);
const mockedResolve = jest.mocked(resolveInvestigationId);
const mockedEntities = jest.mocked(listInvestigationEntities);
const mockedEvidence = jest.mocked(listEvidenceForInvestigation);
const mockedRelationships = jest.mocked(listRelationshipsForInvestigation);

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

const DETECTION: PatternDetectionResponse = {
  investigation_id: 'inv-uuid',
  patterns: [
    {
      id: 'pat-1',
      investigation_id: 'inv-uuid',
      pattern_type: 'NETWORK_HUB',
      severity: 'HIGH',
      confidence: 0.95,
      title: 'High-connectivity network hub',
      description: 'Observed hub.',
      entity_ids: ['ent-1'],
      relationship_ids: [],
      evidence_ids: [],
      event_ids: [],
      metadata: { degree: 12 },
      detected_at: '2026-09-05T00:00:00Z',
    },
    {
      id: 'pat-2',
      investigation_id: 'inv-uuid',
      pattern_type: 'BURNER_SIM',
      severity: 'LOW',
      confidence: 0.6,
      title: 'Potential phone switching pattern',
      description: 'Observed switching.',
      entity_ids: [],
      relationship_ids: [],
      evidence_ids: [],
      event_ids: [],
      metadata: {},
      detected_at: '2026-09-06T00:00:00Z',
    },
  ],
};

const EMPTY_DETECTION: PatternDetectionResponse = {
  investigation_id: 'inv-uuid',
  patterns: [],
};

function resetStore() {
  usePatternsStore.getState().clear();
  jest.clearAllMocks();
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('patterns store (API mode)', () => {
  beforeEach(() => resetStore());

  it('resolves the canonical id then calls the investigation-scoped endpoint', async () => {
    mockedResolve.mockResolvedValueOnce('inv-uuid');
    mockedGetPatterns.mockResolvedValueOnce(DETECTION);
    mockedEntities.mockResolvedValueOnce([{ id: 'ent-1', name: 'Arjun Kapoor', entity_type: 'person' }] as RealEntity[]);
    mockedEvidence.mockResolvedValueOnce([]);
    mockedRelationships.mockResolvedValueOnce([]);

    await usePatternsStore.getState().load('inv-demo-nexus');

    expect(mockedResolve).toHaveBeenCalledWith('inv-demo-nexus');
    expect(mockedGetPatterns).toHaveBeenCalledWith('inv-uuid');
    const state = usePatternsStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.investigationId).toBe('inv-demo-nexus');
    expect(state.data).toHaveLength(2);
  });

  it('enriches refs from investigation-scoped persisted rows', async () => {
    mockedGetPatterns.mockResolvedValueOnce(DETECTION);
    mockedEntities.mockResolvedValueOnce([{ id: 'ent-1', name: 'Arjun Kapoor', entity_type: 'person' }] as RealEntity[]);
    mockedEvidence.mockResolvedValueOnce([]);
    mockedRelationships.mockResolvedValueOnce([]);

    await usePatternsStore.getState().load('inv-uuid');

    const artifacts = usePatternsStore.getState().data ?? [];
    expect(artifacts[0].entityRefs).toEqual([
      { id: 'ent-1', name: 'Arjun Kapoor', type: 'person' },
    ]);
    expect(artifacts[0].typeLabel).toBe('NETWORK_HUB');
  });

  it('keeps an empty detection response as an honest empty list', async () => {
    mockedGetPatterns.mockResolvedValueOnce(EMPTY_DETECTION);
    mockedEntities.mockResolvedValueOnce([]);
    mockedEvidence.mockResolvedValueOnce([]);
    mockedRelationships.mockResolvedValueOnce([]);

    await usePatternsStore.getState().load('inv-uuid');

    const state = usePatternsStore.getState();
    expect(state.error).toBeNull();
    expect(state.data).toEqual([]);
  });

  it('surfaces an explicit error state when the detection call fails (never a mock fallback)', async () => {
    mockedGetPatterns.mockRejectedValueOnce(new Error('engine unavailable'));
    mockedEntities.mockResolvedValueOnce([]);
    mockedEvidence.mockResolvedValueOnce([]);
    mockedRelationships.mockResolvedValueOnce([]);

    await usePatternsStore.getState().load('inv-uuid');

    const state = usePatternsStore.getState();
    expect(state.data).toBeNull();
    expect(state.error).toBe('engine unavailable');
  });

  it('keeps pattern data even when enrichment rows fail (best-effort refs)', async () => {
    mockedGetPatterns.mockResolvedValueOnce(DETECTION);
    mockedEntities.mockRejectedValueOnce(new Error('entities down'));
    mockedEvidence.mockRejectedValueOnce(new Error('evidence down'));
    mockedRelationships.mockResolvedValueOnce([]);

    await usePatternsStore.getState().load('inv-uuid');

    const state = usePatternsStore.getState();
    expect(state.error).toBeNull();
    expect(state.data).toHaveLength(2);
    const artifact = state.data?.[0];
    // Rows could not be resolved, so refs degrade to honest id-only entries —
    // names are never invented.
    expect(artifact?.entityRefs).toEqual([{ id: 'ent-1', name: 'ent-1', type: 'person' }]);
    expect(artifact?.entity_ids).toEqual(['ent-1']);
  });

  it('discards an in-flight load that resolves after an investigation switch', async () => {
    let resolveA!: () => void;
    const gateA = new Promise<void>((res) => {
      resolveA = res;
    });
    mockedResolve.mockImplementation((id: string) =>
      id === 'inv-a' ? gateA.then(() => 'inv-a-uuid') : Promise.resolve('inv-b-uuid'),
    );
    mockedGetPatterns.mockImplementation((id: string) =>
      Promise.resolve(id === 'inv-a-uuid'
        ? { investigation_id: 'inv-a-uuid', patterns: [DETECTION.patterns[0]] }
        : { investigation_id: 'inv-b-uuid', patterns: [DETECTION.patterns[1]] }),
    );
    mockedEntities.mockResolvedValue([]);
    mockedEvidence.mockResolvedValue([]);
    mockedRelationships.mockResolvedValue([]);

    const { load } = usePatternsStore.getState();
    const promiseA = load('inv-a');
    const promiseB = load('inv-b');
    await promiseB;
    resolveA();
    await promiseA;

    const state = usePatternsStore.getState();
    expect(state.investigationId).toBe('inv-b');
    expect(state.data?.[0].id).toBe('pat-2');
  });

  it('clears data immediately when switching so no stale patterns flash', async () => {
    mockedGetPatterns.mockResolvedValueOnce(DETECTION);
    mockedEntities.mockResolvedValue([]);
    mockedEvidence.mockResolvedValue([]);
    mockedRelationships.mockResolvedValue([]);
    await usePatternsStore.getState().load('inv-a');

    expect(usePatternsStore.getState().data).toHaveLength(2);

    // A new load synchronously clears data before the async work begins.
    const pending = usePatternsStore.getState().load('inv-b');
    expect(usePatternsStore.getState().data).toBeNull();
    await pending;
  });

  it('selects and tracks the live pattern id', async () => {
    mockedGetPatterns.mockResolvedValueOnce(DETECTION);
    mockedEntities.mockResolvedValue([]);
    mockedEvidence.mockResolvedValue([]);
    mockedRelationships.mockResolvedValue([]);
    await usePatternsStore.getState().load('inv-a-uuid');

    usePatternsStore.getState().selectPattern('pat-1');
    expect(usePatternsStore.getState().selectedPatternId).toBe('pat-1');
  });
});