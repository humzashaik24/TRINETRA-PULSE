/**
 * API-mode integration tests for the investigation workspace store (Phase 15).
 *
 * With `NEXT_PUBLIC_USE_MOCK_API=false` the store must route the investigation
 * workflow through the real relational adapter (`@/lib/api/adapter`), which in
 * turn drives the FastAPI `/api/v2` client. These tests force API mode and
 * assert the store calls the real adapter read/write paths (not the mock
 * services) — covering the persisted backend integration end-to-end at the
 * store boundary.
 */

import { useInvestigationStore } from '@/state/investigation.store';
import type { InvestigationUpdate } from '@trinetra-pulse/types';

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

import {
  loadInvestigationWorkspace,
  persistInvestigationUpdate,
  persistFindingCreate,
  persistNoteCreate,
  persistEntityLink,
} from '@/lib/api/adapter';

const mockedAdapter = jest.mocked({
  loadInvestigationWorkspace,
  persistInvestigationUpdate,
  persistFindingCreate,
  persistNoteCreate,
  persistEntityLink,
});

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

const workspace = () => ({
  investigation: {
    id: '6c887c98-939a-50ce-ac27-f58376941de2',
    title: 'Operation Meridian',
    description: 'Demo dataset',
    status: 'active',
    priority: 'high',
    lead_investigator: 'Inspector Mehta',
    assigned: ['Inspector Mehta'],
    tags: ['import', 'meridian', 'demo'],
    case_id: null,
    entity_count: 6,
    evidence_count: 4,
    relationship_count: 4,
    created_at: '2026-08-18T09:00:00.000Z',
    updated_at: '2026-08-18T09:00:00.000Z',
    last_activity_at: '2026-08-18T09:00:00.000Z',
  },
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
});

describe('investigation store — API mode (Phase 15)', () => {
  beforeEach(() => {
    useInvestigationStore.setState(defaultState() as never, false);
    jest.clearAllMocks();
    mockedAdapter.loadInvestigationWorkspace.mockResolvedValue(
      workspace() as never,
    );
  });

  it('loads the workspace through the real relational adapter in API mode', async () => {
    await useInvestigationStore.getState().loadInvestigation(
      '6c887c98-939a-50ce-ac27-f58376941de2',
    );
    expect(mockedAdapter.loadInvestigationWorkspace).toHaveBeenCalledWith(
      '6c887c98-939a-50ce-ac27-f58376941de2',
    );
    const after = useInvestigationStore.getState();
    expect(after.loading).toBe(false);
    expect(after.error).toBeNull();
    expect(after.data.investigation?.id).toBe(
      '6c887c98-939a-50ce-ac27-f58376941de2',
    );
    expect(after.data.investigation?.title).toBe('Operation Meridian');
  });

  it('persists an investigation meta update through the adapter', async () => {
    mockedAdapter.persistInvestigationUpdate.mockResolvedValue(
      workspace().investigation as never,
    );
    useInvestigationStore.setState({
      investigationId: '6c887c98-939a-50ce-ac27-f58376941de2',
      data: workspace() as never,
      dirty: false,
    });
    const patch: InvestigationUpdate = { title: 'Operation Meridian v2' };
    useInvestigationStore
      .getState()
      .updateInvestigationMeta(patch);
    expect(mockedAdapter.persistInvestigationUpdate).toHaveBeenCalledWith(
      '6c887c98-939a-50ce-ac27-f58376941de2',
      patch,
    );
  });

  it('persists a finding through the adapter in API mode', () => {
    useInvestigationStore.setState({
      investigationId: '6c887c98-939a-50ce-ac27-f58376941de2',
      data: workspace() as never,
    });
    useInvestigationStore.getState().addFinding({
      title: 'New observation',
      description: 'An analytical observation.',
      category: 'association',
      confidence: 'medium',
      created_by: 'Analyst Singh',
    });
    expect(mockedAdapter.persistFindingCreate).toHaveBeenCalledWith(
      '6c887c98-939a-50ce-ac27-f58376941de2',
      expect.objectContaining({ title: 'New observation' }),
    );
  });

  it('persists a note through the adapter in API mode', () => {
    useInvestigationStore.setState({
      investigationId: '6c887c98-939a-50ce-ac27-f58376941de2',
      data: workspace() as never,
    });
    useInvestigationStore.getState().addNote({
      author: 'Inspector Mehta',
      body: 'Working note',
      category: 'scope',
    });
    expect(mockedAdapter.persistNoteCreate).toHaveBeenCalledWith(
      '6c887c98-939a-50ce-ac27-f58376941de2',
      expect.objectContaining({ body: 'Working note', author: 'Inspector Mehta' }),
    );
  });

  it('persists an entity link through the adapter in API mode', () => {
    useInvestigationStore.setState({
      investigationId: '6c887c98-939a-50ce-ac27-f58376941de2',
      data: workspace() as never,
    });
    useInvestigationStore.getState().linkEntity({
      entity_id: 'ent-person-005',
      name: 'Meera Reddy',
      entity_type: 'person',
      role: 'Referenced',
      association_confidence: 0.5,
      linked_by: 'Inspector Mehta',
    });
    expect(mockedAdapter.persistEntityLink).toHaveBeenCalledWith(
      expect.objectContaining({
        investigation_id: '6c887c98-939a-50ce-ac27-f58376941de2',
        entity_id: 'ent-person-005',
      }),
    );
  });

  it('surfaces the error when the real adapter load fails', async () => {
    mockedAdapter.loadInvestigationWorkspace.mockRejectedValue(
      new Error('Could not load investigation'),
    );
    await useInvestigationStore
      .getState()
      .loadInvestigation('6c887c98-939a-50ce-ac27-f58376941de2');
    const after = useInvestigationStore.getState();
    expect(after.loading).toBe(false);
    expect(after.error).toMatch(/could not load investigation/i);
  });

  it('discards a stale workspace when a newer load superseded it mid-flight', async () => {
    let releaseFirst!: () => void;
    mockedAdapter.loadInvestigationWorkspace
      .mockImplementationOnce(
        () => new Promise((res) => { releaseFirst = () => res({ ...workspace(), investigation: { ...workspace().investigation, title: 'STALE CASE' } } as never); }),
      )
      .mockResolvedValueOnce(workspace() as never);

    const first = useInvestigationStore.getState().loadInvestigation('investigation-a');
    const second = useInvestigationStore.getState().loadInvestigation('investigation-b');
    await second;
    releaseFirst();
    await first;

    const after = useInvestigationStore.getState();
    expect(after.investigationId).toBe('investigation-b');
    expect(after.loading).toBe(false);
    expect(after.error).toBeNull();
    expect(after.data.investigation?.title).not.toBe('STALE CASE');
  });
});
