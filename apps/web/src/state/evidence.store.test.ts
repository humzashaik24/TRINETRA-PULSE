import { useEvidenceStore } from './evidence.store';

// Phase 25 compatibility: the real store now imports the on-device whisper
// orchestrator; jest mocks that module (import.meta lives only in worker-url.ts).
jest.mock('@/lib/whisper/local-whisper', () => ({
  detectLocalWhisperCapability: jest.fn(() => ({ supported: true })),
  runLocalWhisper: jest.fn(),
}));

// ============================================================
// EVIDENCE STORE TESTS (Phase 12)
// ============================================================

describe('evidence.store', () => {
  const original = useEvidenceStore.getState();

  beforeEach(() => {
    useEvidenceStore.setState({
      investigationId: null,
      items: [],
      selectedItem: null,
      selectedItemId: null,
      loading: false,
      error: null,
      searchQuery: '',
      filters: {},
      sortBy: 'observedAt',
      sortOrder: 'desc',
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
    });
  });

  afterAll(() => {
    useEvidenceStore.setState(original);
  });

  it('sets the investigation scope and resets state when it changes', async () => {
    const s = useEvidenceStore.getState();
    s.setInvestigationId('inv-006');
    await new Promise((r) => setTimeout(r, 300));
    const after = useEvidenceStore.getState();
    expect(after.investigationId).toBe('inv-006');
    expect(after.items.length).toBeGreaterThan(0);
    expect(after.total).toBeGreaterThan(0);
  });

  it('selects an evidence item by id', async () => {
    const s = useEvidenceStore.getState();
    s.setInvestigationId('inv-006');
    await new Promise((r) => setTimeout(r, 300));
    s.selectItem('ev-intel-001');
    await new Promise((r) => setTimeout(r, 200));
    const after = useEvidenceStore.getState();
    expect(after.selectedItemId).toBe('ev-intel-001');
    expect(after.selectedItem?.evidenceType).toBe('FIR');
  });

  it('clears selection when selecting null', () => {
    const s = useEvidenceStore.getState();
    s.setInvestigationId('inv-006');
    s.selectItem(null);
    expect(useEvidenceStore.getState().selectedItemId).toBeNull();
    expect(useEvidenceStore.getState().selectedItem).toBeNull();
  });

  it('filters by evidence type', async () => {
    useEvidenceStore.getState().setInvestigationId('inv-006');
    await new Promise((r) => setTimeout(r, 300));
    useEvidenceStore.getState().setFilters({ evidenceTypes: ['FIR'] });
    await new Promise((r) => setTimeout(r, 300));
    const after = useEvidenceStore.getState();
    expect(after.items.length).toBeGreaterThan(0);
    for (const item of after.items) expect(item.evidenceType).toBe('FIR');
  });

  it('clears filters and restores the full set', async () => {
    useEvidenceStore.getState().setInvestigationId('inv-006');
    await new Promise((r) => setTimeout(r, 300));
    const before = useEvidenceStore.getState().total;
    useEvidenceStore.getState().setFilters({ evidenceTypes: ['FIR'] });
    await new Promise((r) => setTimeout(r, 300));
    expect(useEvidenceStore.getState().total).toBeLessThan(before);
    useEvidenceStore.getState().clearFilters();
    await new Promise((r) => setTimeout(r, 300));
    expect(useEvidenceStore.getState().total).toBe(before);
  });

  it('clear resets to the initial investigation-less state', () => {
    useEvidenceStore.getState().setInvestigationId('inv-006');
    useEvidenceStore.getState().clear();
    const after = useEvidenceStore.getState();
    expect(after.investigationId).toBeNull();
    expect(after.items).toHaveLength(0);
    expect(after.selectedItemId).toBeNull();
  });

  it('keeps the custody chain honestly absent in mock mode (Phase 18.2)', async () => {
    const s = useEvidenceStore.getState();
    s.setInvestigationId('inv-006');
    await new Promise((r) => setTimeout(r, 300));

    await s.fetchChain('ev-intel-001');
    const after = useEvidenceStore.getState();
    // No fabricated chain for demo rows: never a hash from the mock universe.
    expect(after.chain).toBeNull();
    expect(after.chainVerification).toBeNull();
    expect(after.chainAvailable).toBe(false);
  });
});
