/**
 * Phase C — mock-mode tests for the patterns store.
 *
 * Forces `isMockData` to true and pins that the store renders the preserved
 * demo fixture output through the mock adapter — no API modules are touched
 * and fixture typeLabel / status / metrics / timeAgo survive verbatim.
 */

import { usePatternsStore } from './patterns.store';
import { presentationPatterns } from '@/mock/patterns';

// ---------------------------------------------------------------------------
// MOCKS
// ---------------------------------------------------------------------------

jest.mock('@/lib/api/config', () => ({
  isMockData: () => true,
}));

function resetStore() {
  usePatternsStore.getState().clear();
}

describe('patterns store (mock mode)', () => {
  beforeEach(() => resetStore());

  it('loads the preserved demo fixtures into artifacts', async () => {
    await usePatternsStore.getState().load('inv-demo-nexus');

    const state = usePatternsStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.data).toHaveLength(presentationPatterns.length);
    expect(state.investigationId).toBe('inv-demo-nexus');
  });

  it('carries the fixture typeLabel, status, metrics and timeAgo through verbatim', async () => {
    await usePatternsStore.getState().load('inv-demo-nexus');

    const fixture = presentationPatterns[0];
    const artifact = usePatternsStore.getState().data?.[0];
    expect(artifact?.typeLabel).toBe(fixture.typeLabel);
    expect(artifact?.status).toBe(fixture.status);
    expect(artifact?.metrics).toEqual(fixture.metrics);
    expect(artifact?.timeAgo).toBe(fixture.timeAgo);
  });

  it('maps fixture entities into navigable entity refs', async () => {
    await usePatternsStore.getState().load('inv-demo-nexus');

    const fixture = presentationPatterns[0];
    const artifact = usePatternsStore.getState().data?.[0];
    expect(artifact?.entityRefs).toHaveLength(fixture.entities.length);
    expect(artifact?.entityRefs[0]).toEqual(fixture.entities[0]);
  });
});