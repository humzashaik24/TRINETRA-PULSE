import {
  useShellStore,
  INSPECTOR_DEFAULT_WIDTH,
  INSPECTOR_MIN_WIDTH,
} from '@/state/shell.store';

// ============================================================
// PHASE 3.5 — SHELL + CONTEXT SYSTEM (store)
// ============================================================

beforeEach(() => {
  useShellStore.setState(
    {
      railExpanded: true,
      inspectorOpen: false,
      inspectorStatus: 'closed',
      inspectorContext: null,
      inspectorWidth: INSPECTOR_DEFAULT_WIDTH,
      inspectorRatio: 0.3,
      viewport: 'desktop',
    },
    false
  );
});

describe('shell store — inspector lifecycle', () => {
  it('starts closed with defaults', () => {
    const s = useShellStore.getState();
    expect(s.inspectorOpen).toBe(false);
    expect(s.inspectorStatus).toBe('closed');
    expect(s.inspectorContext).toBeNull();
    expect(s.inspectorWidth).toBe(INSPECTOR_DEFAULT_WIDTH);
    expect(s.viewport).toBe('desktop');
  });

  it('selectContext opens the inspector and keeps context', () => {
    const ctx = { type: 'entity' as const, id: 'ent-person-001', name: 'Rahul Kumar' };
    useShellStore.getState().selectContext(ctx);
    const s = useShellStore.getState();
    expect(s.inspectorOpen).toBe(true);
    expect(s.inspectorStatus).toBe('opening');
    expect(s.inspectorContext).toEqual(ctx);
  });

  it('closeInspector closes without clearing the context', () => {
    useShellStore
      .getState()
      .selectContext({ type: 'dataset', id: 'ds-001', name: 'CDR' });
    useShellStore.getState().closeInspector();
    const s = useShellStore.getState();
    expect(s.inspectorOpen).toBe(false);
    expect(s.inspectorStatus).toBe('closing');
    expect(s.inspectorContext).toEqual({ type: 'dataset', id: 'ds-001', name: 'CDR' });
  });

  it('openInspector re-opens the existing context', () => {
    useShellStore
      .getState()
      .selectContext({ type: 'finding', id: 'sp-001', title: 'Spike' });
    useShellStore.getState().closeInspector();
    useShellStore.getState().openInspector();
    const s = useShellStore.getState();
    expect(s.inspectorOpen).toBe(true);
    expect(s.inspectorStatus).toBe('opening');
    expect(s.inspectorContext?.id).toBe('sp-001');
  });

  it('clearContext forgets the selection', () => {
    useShellStore
      .getState()
      .selectContext({ type: 'entity', id: 'ent-1' });
    useShellStore.getState().clearContext();
    const s = useShellStore.getState();
    expect(s.inspectorOpen).toBe(false);
    expect(s.inspectorContext).toBeNull();
    expect(s.inspectorStatus).toBe('closed');
  });

  it('updateContext swaps the focused object without closing', () => {
    useShellStore.getState().selectContext({ type: 'entity', id: 'ent-1', name: 'A' });
    useShellStore.getState().updateContext({ type: 'entity', id: 'ent-2', name: 'B' });
    const s = useShellStore.getState();
    expect(s.inspectorOpen).toBe(true);
    expect(s.inspectorContext).toEqual({ type: 'entity', id: 'ent-2', name: 'B' });
  });
});

describe('shell store — sizing & rail', () => {
  it('tracks inspector width and reset restores default', () => {
    useShellStore.getState().setInspectorWidth(480);
    expect(useShellStore.getState().inspectorWidth).toBe(480);
    useShellStore.getState().resetInspectorSize();
    expect(useShellStore.getState().inspectorWidth).toBe(INSPECTOR_DEFAULT_WIDTH);
  });

  it('clamps nothing in the store (component clamps) but keeps ratio', () => {
    useShellStore.getState().setInspectorRatio(0.5);
    expect(useShellStore.getState().inspectorRatio).toBe(0.5);
  });

  it('toggleRail flips expanded state', () => {
    expect(useShellStore.getState().railExpanded).toBe(true);
    useShellStore.getState().toggleRail();
    expect(useShellStore.getState().railExpanded).toBe(false);
    useShellStore.getState().toggleRail();
    expect(useShellStore.getState().railExpanded).toBe(true);
  });
});

describe('shell store — viewport', () => {
  it('switches viewport modes', () => {
    useShellStore.getState().setViewport('tablet');
    expect(useShellStore.getState().viewport).toBe('tablet');
    useShellStore.getState().setViewport('mobile');
    expect(useShellStore.getState().viewport).toBe('mobile');
    useShellStore.getState().setViewport('desktop');
    expect(useShellStore.getState().viewport).toBe('desktop');
  });
});

describe('geometry tokens', () => {
  it('exposes sane panel geometry', () => {
    expect(INSPECTOR_MIN_WIDTH).toBeGreaterThanOrEqual(280);
    expect(useShellStore.getState().inspectorOpen).toBe(false);
  });
});