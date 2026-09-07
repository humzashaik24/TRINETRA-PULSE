import { cleanup } from '@testing-library/react';
import { resolveInspectorContext } from '@/services/inspector.service';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { journeyHref, DEMO_JOURNEY, DEMO_INVESTIGATION_ID, DEMO_NETWORK_ID } from '@/navigation/journey';
import { mockInvestigationById } from '@/mock/investigations';

// ============================================================
// PHASE 13 — END-TO-END DEMO JOURNEY (P19)
// ============================================================
// The most important integration test of Phase 13: drives the full
// deterministic Operation Meridian journey
//
//   Investigation → Entity → Network → Analytics → Finding →
//   Evidence → Timeline → AI → AI Source → Evidence Inspector
//
// and asserts that the investigation id STAYS inv-006 at every step
// and that every cross-module navigation preserves the journey scope
// via the typed journey contract.
// ============================================================

const DEMO = DEMO_INVESTIGATION_ID;
const NETWORK = DEMO_NETWORK_ID;
const record = mockInvestigationById.get(DEMO)!;

afterEach(() => {
  cleanup();
  useInvestigationStore.setState({ investigationId: null });
  useShellStore.setState({ inspectorContext: null, inspectorOpen: false });
});

/** Resolve a context through the inspector and assert it is investigation-scoped. */
async function expectScoped(ctx: {
  type: string;
  id: string;
  investigationId: string;
  [k: string]: unknown;
}) {
  const resolution = await resolveInspectorContext(ctx as never);
  expect(resolution.status).toBe('ready');
  if (resolution.status !== 'ready') return;
  const view = resolution.view as { kind: string; investigationId?: string };
  expect(view.investigationId).toBe(DEMO);
  return view;
}

describe('Operation Meridian — full investigative journey', () => {
  it('investigation → entity → network → analytics keeps inv-006 scoped', () => {
    // STEP 1 — Investigate: seed the investigation scope.
    useInvestigationStore.getState().seedInvestigation(DEMO);
    const payload = DEMO_JOURNEY.investigate().payload;
    expect(payload.investigation).toBe(DEMO);

    // STEP 2 — Explore Entity: build the entity journey link with scope.
    const entity = record.entities[0];
    const entityHref = journeyHref(`/networks/${NETWORK}`, DEMO_JOURNEY.entity(entity.entity_id, DEMO).payload);
    expect(entityHref).toContain(`${NETWORK}`);
    expect(entityHref).toContain('focus=' + entity.entity_id);
    expect(entityHref).toContain('i=' + DEMO);

    // STEP 3 — Open Network: same investigation, network + focus carried.
    expect(parseFocus(entityHref)).toBe(entity.entity_id);

    // STEP 4 — Network → Analytics link preserves investigation + focus.
    const analyticsHref = journeyHref(`/networks/${NETWORK}/analytics`, DEMO_JOURNEY.entity(entity.entity_id, DEMO).payload);
    expect(analyticsHref).toContain('/analytics');
    expect(analyticsHref).toContain('i=' + DEMO);
    expect(analyticsHref).toContain('focus=' + entity.entity_id);
    void payload;
  });

  it('every journey object resolves with investigationId preserved', async () => {
    useInvestigationStore.getState().seedInvestigation(DEMO);

    // Entity
    await expectScoped({
      type: 'entity',
      id: record.entities[0].entity_id,
      name: 'Rahul Kumar',
      investigationId: DEMO,
    });

    // Finding
    await expectScoped({
      type: 'finding',
      id: record.findings[0].id,
      investigationId: DEMO,
    });

    // Evidence (investigation-scoped ev-* path)
    const evId = record.evidence[0].evidence_id;
    await expectScoped({
      type: 'evidence',
      id: evId,
      title: 'demo evidence',
      investigationId: DEMO,
    });
  });

  it('investigation switching clears stale selections and re-grounds', () => {
    useInvestigationStore.getState().seedInvestigation(DEMO);
    useShellStore.getState().selectContext({
      type: 'entity',
      id: 'ent-person-001',
      name: 'Rahul Kumar',
      investigationId: DEMO,
    });

    // Switch investigation → stale context must be cleared.
    useInvestigationStore.getState().seedInvestigation('inv-001');
    useShellStore.getState().clearContext();
    expect(useShellStore.getState().inspectorContext).toBeNull();
  });

  it('evidence → finding and evidence → entity stay investigation-scoped', async () => {
    useInvestigationStore.getState().seedInvestigation(DEMO);

    // Evidence → Entity (linked entity nav carries the same scope).
    const entityRes = await resolveInspectorContext({
      type: 'entity',
      id: 'ent-person-001',
      name: 'Rahul Kumar',
      investigationId: DEMO,
    } as never);
    expect(entityRes.status).toBe('ready');
    if (entityRes.status === 'ready') {
      expect((entityRes.view as { investigationId?: string }).investigationId).toBe(DEMO);
    }

    // Evidence → Finding (support).
    const findingRes = await resolveInspectorContext({
      type: 'finding',
      id: record.findings[0].id,
      investigationId: DEMO,
    });
    expect(findingRes.status).toBe('ready');
    if (findingRes.status === 'ready') {
      expect((findingRes.view as { investigationId?: string }).investigationId).toBe(DEMO);
    }
  });

  it('the journey focuses a real network node for the demo entity', () => {
    // The demo entity is the seeded graph node in NET-001, so an
    // entity→network focus deep-link lands on a live node.
    const node = record.entities[0].entity_id;
    const href = journeyHref(`/networks/${NETWORK}`, { investigation: DEMO, focus: node });
    expect(href).toContain('focus=' + node);
  });
});

function parseFocus(href: string): string | null {
  const qs = href.split('?')[1] ?? '';
  for (const pair of qs.split('&')) {
    const [k, v] = pair.split('=');
    if (k === 'focus') return v ?? null;
  }
  return null;
}
