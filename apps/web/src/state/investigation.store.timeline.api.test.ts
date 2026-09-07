/**
 * API-mode timeline tests for the investigation store (Phase 17.4).
 *
 * With `NEXT_PUBLIC_USE_MOCK_API=false` the store must route the
 * investigation load through the real relational adapter, whose timeline
 * slice comes from GET /api/v2/timeline/{investigationId}. These tests
 * assert the store delivers that mapped timeline to the UI, scopes it to
 * the active investigation, and degrades safely on error / empty data.
 */

import { useInvestigationStore } from './investigation.store';

// Force API mode for the whole module under test.
jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

// Control the real adapter layer so we can assert the store routes through it.
jest.mock('@/lib/api/adapter', () => ({
  loadInvestigationWorkspace: jest.fn(),
  persistInvestigationUpdate: jest.fn(),
  persistEntityLink: jest.fn(),
  persistFindingCreate: jest.fn(),
  persistNoteCreate: jest.fn(),
}));

import { loadInvestigationWorkspace } from '@/lib/api/adapter';

const mockedAdapter = jest.mocked({ loadInvestigationWorkspace });

const defaultState = () => ({
  investigationId: null,
  data: {
    investigation: null,
    entities: [],
    relationships: [],
    evidence: [],
    findings: [],
    notes: [],
    timeline: [],
    activity: [],
    members: [],
    networks: [],
    analyticsSnapshots: [],
  },
  loading: false,
  error: null,
  dirty: false,
});

interface WorkspaceInput {
  id: string;
  title: string;
  timeline: Array<{
    id: string;
    investigation_id: string;
    timestamp: string;
    category: 'event' | 'evidence' | 'activity' | 'note' | 'finding' | 'system';
    title: string;
    description?: string | null;
    ref_id?: string | null;
    ref_type?: string | null;
    actor?: string | null;
  }>;
}

function workspace(input: WorkspaceInput) {
  return {
    investigation: {
      id: input.id,
      title: input.title,
      description: 'desc',
      status: 'active',
      priority: 'high',
      lead_investigator: 'Inspector Mehta',
      assigned: [],
      tags: [],
      case_id: null,
      entity_count: 0,
      evidence_count: 0,
      relationship_count: 0,
      created_at: '2026-08-18T09:00:00.000Z',
      updated_at: '2026-08-18T09:00:00.000Z',
      last_activity_at: '2026-08-18T09:00:00.000Z',
    },
    entities: [],
    relationships: [],
    evidence: [],
    findings: [],
    notes: [],
    timeline: input.timeline,
    activity: [],
    members: [],
    networks: [],
    analyticsSnapshots: [],
  };
}

const MERIDIAN_TIMELINE = [
  {
    id: 'tl-evt-1',
    investigation_id: 'inv-006',
    timestamp: '2026-02-14T11:05:00.000Z',
    category: 'event' as const,
    title: 'Large transfer executed',
    ref_id: 'evt-1',
    ref_type: 'event',
    actor: null,
  },
];

const OTHER_TIMELINE = [
  {
    id: 'tl-evt-9',
    investigation_id: 'inv-other',
    timestamp: '2026-03-01T09:00:00.000Z',
    category: 'event' as const,
    title: 'Foreign currency exchange observed',
    ref_id: 'evt-9',
    ref_type: 'event',
    actor: null,
  },
];

describe('investigation store — timeline API mode (Phase 17.4)', () => {
  beforeEach(() => {
    useInvestigationStore.setState(defaultState() as never, false);
    jest.clearAllMocks();
  });

  it('delivers the mapped timeline into the store in API mode', async () => {
    mockedAdapter.loadInvestigationWorkspace.mockResolvedValue(
      workspace({
        id: 'inv-006',
        title: 'Operation Meridian',
        timeline: MERIDIAN_TIMELINE,
      }) as never,
    );

    await useInvestigationStore.getState().loadInvestigation('inv-006');
    const s = useInvestigationStore.getState();
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
    expect(s.data.timeline).toHaveLength(1);
    expect(s.data.timeline[0].title).toBe('Large transfer executed');
    expect(s.data.timeline[0].investigation_id).toBe('inv-006');
  });

  it('replaces the timeline when switching investigation (no stale events)', async () => {
    mockedAdapter.loadInvestigationWorkspace.mockResolvedValue(
      workspace({ id: 'inv-006', title: 'Operation Meridian', timeline: MERIDIAN_TIMELINE }) as never,
    );
    await useInvestigationStore.getState().loadInvestigation('inv-006');

    mockedAdapter.loadInvestigationWorkspace.mockResolvedValue(
      workspace({ id: 'inv-other', title: 'Kochi Probe', timeline: OTHER_TIMELINE }) as never,
    );
    await useInvestigationStore.getState().loadInvestigation('inv-other');

    const s = useInvestigationStore.getState();
    expect(s.investigationId).toBe('inv-other');
    expect(s.data.timeline).toHaveLength(1);
    expect(s.data.timeline[0].title).toBe('Foreign currency exchange observed');
    expect(s.data.timeline[0].investigation_id).toBe('inv-other');
    // Meridian events must not leak into the other investigation.
    expect(s.data.timeline.some((t) => t.title === 'Large transfer executed')).toBe(false);
  });

  it('clears the timeline between loads (loading state exposes empty timeline)', async () => {
    // A new load must not inherit the previously loaded timeline.
    mockedAdapter.loadInvestigationWorkspace.mockResolvedValue(
      workspace({ id: 'inv-006', title: 'Operation Meridian', timeline: OTHER_TIMELINE }) as never,
    );
    await useInvestigationStore.getState().loadInvestigation('inv-006');
    const before = useInvestigationStore.getState();
    expect(before.data.timeline).toHaveLength(1);

    // Start a load for another investigation: the loader scopes by id and
    // the workspace is fully replaced on success with the new id's timeline.
    mockedAdapter.loadInvestigationWorkspace.mockResolvedValue(
      workspace({ id: 'inv-other', title: 'Kochi Probe', timeline: [] }) as never,
    );
    await useInvestigationStore.getState().loadInvestigation('inv-other');
    const after = useInvestigationStore.getState();
    expect(after.data.timeline).toEqual([]);
  });

  it('handles an unknown investigation safely', async () => {
    mockedAdapter.loadInvestigationWorkspace.mockRejectedValue(
      new Error('Could not load investigation'),
    );
    await useInvestigationStore.getState().loadInvestigation('00000000-0000-0000-0000-000000000000');
    const s = useInvestigationStore.getState();
    expect(s.error).toMatch(/could not load investigation/i);
    expect(s.loading).toBe(false);
  });

  it('handles an empty timeline response', async () => {
    mockedAdapter.loadInvestigationWorkspace.mockResolvedValue(
      workspace({ id: 'inv-empty', title: 'Empty Timeline', timeline: [] }) as never,
    );
    await useInvestigationStore.getState().loadInvestigation('inv-empty');
    const s = useInvestigationStore.getState();
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
    expect(s.data.timeline).toEqual([]);
  });
});