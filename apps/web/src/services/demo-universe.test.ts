import { resolveInspectorContext } from '@/services/inspector.service';
import { mockEntityProfileById } from '@/mock/entity-profiles';
import { mockEvidenceById } from '@/mock/evidence-intelligence';
import { mockInvestigationById } from '@/mock/investigations';
import { networkClean } from '@/mock/networks/network-clean';

// ============================================================
// PHASE 13 — DEMO UNIVERSE DATA-CONSISTENCY AUDIT
// ============================================================
// Guards the cohesion guarantee of the demonstration journey: every
// identifier the UI can summon via the Context Inspector must resolve
// to a live record, and every network node that carries a canonical
// entity profile must ground through the inspector so cross-module
// focus (from the network page into the entity view) never dangles.
//
// NOTE: the knowledge graph intentionally contains more nodes than the
// canonical entity-profile universe — graph-only nodes exist with a
// label/type but no standalone intelligence profile. They are surfaced
// from graph hints rather than the profile store. The audit therefore
// asserts that (a) every investigation-owned reference resolves, and
// (b) every profile-backed network node resolves.
// ============================================================

const DEMO = 'inv-006';
const record = mockInvestigationById.get(DEMO)!;

describe('demo investigation references resolve', () => {
  it('every recorded evidence id resolves to a ready evidence view', async () => {
    for (const e of record.evidence) {
      const resolution = await resolveInspectorContext({
        type: 'evidence',
        id: e.evidence_id,
        title: 'demo evidence',
        investigationId: DEMO,
      });
      expect(resolution.status).toBe('ready');
      if (resolution.status !== 'ready') continue;
      expect(resolution.view.kind).toBe('evidence');
      expect(resolution.view.id).toBe(e.evidence_id);
    }
  });

  it('every recorded finding id resolves to a ready finding view', async () => {
    for (const f of record.findings) {
      const resolution = await resolveInspectorContext({
        type: 'finding',
        id: f.id,
        investigationId: DEMO,
      });
      expect(resolution.status).toBe('ready');
      if (resolution.status !== 'ready') continue;
      expect(resolution.view.kind).toBe('finding');
    }
  });

  it('every recorded entity id has a live canonical profile', () => {
    for (const ent of record.entities) {
      expect(mockEntityProfileById.has(ent.entity_id)).toBe(true);
    }
  });
});

describe('network graph grounds through the inspector', () => {
  it('every profile-backed NET-001 node resolves to a ready entity view', async () => {
    const backed = networkClean.nodes.filter((n) => mockEntityProfileById.has(n.entityId));
    expect(backed.length).toBeGreaterThan(0);
    for (const node of backed) {
      const resolution = await resolveInspectorContext({
        type: 'entity',
        id: node.entityId,
        name: node.label,
      });
      expect(resolution.status).toBe('ready');
      if (resolution.status !== 'ready') continue;
      expect(resolution.view.kind).toBe('entity');
    }
  });

  it('every network node entityId is either profile-backed or a distinct graph node', () => {
    const ids = new Set(networkClean.nodes.map((n) => n.entityId));
    for (const node of networkClean.nodes) {
      if (mockEntityProfileById.has(node.entityId)) continue;
      // Graph-only node: id uniqueness still holds, and it has a resolvable label.
      expect(node.label).toBeTruthy();
      expect(ids.size).toBe(networkClean.nodes.length);
    }
  });

  it('internal graph node ids never collide with canonical entity ids', () => {
    for (const node of networkClean.nodes) {
      expect(node.id).not.toBe(node.entityId);
    }
  });
});

describe('cross-module focus identifiers are unique per contract', () => {
  it('the legacy and intelligence evidence namespaces do not collide', () => {
    // Guarded indirectly: ev-* vs ev-intel-* must remain distinct so the
    // evidenceView resolver can disambiguate by namespace (ev-intel-* first).
    const intel = new Set(mockEvidenceById.keys());
    for (const id of intel) {
      expect(id.startsWith('ev-intel-')).toBe(true);
    }
  });

  it('demo investigation id and network id are stable journey targets', () => {
    expect(record.investigation.id).toBe('inv-006');
    expect(networkClean.id).toBe('NET-001');
  });
});
