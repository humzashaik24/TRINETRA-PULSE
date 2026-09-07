import { resolveInspectorContext } from '@/services/inspector.service';
import { mockEvidenceById } from '@/mock/evidence-intelligence';
import { mockEntityEvidence } from '@/mock/entity-evidence';
import { mockInvestigationById } from '@/mock/investigations';

// ============================================================
// PHASE 13 — INVESTIGATION → INSPECTOR DATA CONSISTENCY
// ============================================================
// Guards the two broken-link fixes that Phase 13 repaired:
//  1. Evidence references on investigation records (ev-001 …) AND
//     the evidence-intelligence universe (ev-intel-001 …) must both
//     resolve inside the Context Inspector.
//  2. Investigation findings (inf-006-*) must resolve as findings.
// ============================================================

const DEMO = 'inv-006';
const record = mockInvestigationById.get(DEMO)!;

describe('investigation evidence resolves via the inspector', () => {
  it('resolves every evidence_id referenced by the demo investigation', async () => {
    const evidenceIds = record.evidence.map((e) => e.evidence_id);
    expect(evidenceIds.length).toBeGreaterThan(0);

    for (const id of evidenceIds) {
      const resolution = await resolveInspectorContext({
        type: 'evidence',
        id,
        title: 'demo evidence',
        investigationId: DEMO,
      });
      expect(resolution.status).toBe('ready');
      if (resolution.status === 'ready') {
        expect(resolution.view.kind).toBe('evidence');
        expect(resolution.view.id).toBe(id);
      }
    }
  });

  it('carries investigation scope + linked entities onto the view', async () => {
    // Use an evidence-intelligence item (ev-intel-*) which carries the
    // full Phase 12 scope data, exactly like the AI source-chip path.
    const intelId = mockEvidenceById.keys().next().value as string;
    const resolution = await resolveInspectorContext({
      type: 'evidence',
      id: intelId,
      title: 'demo evidence',
      investigationId: DEMO,
    });
    expect(resolution.status).toBe('ready');
    if (resolution.status !== 'ready') return;
    const view = resolution.view as { title?: string; linkedEntities?: unknown[]; linkedFindings?: unknown[] };
    expect(view.title).toBeDefined();
    expect(Array.isArray(view.linkedEntities)).toBe(true);
    expect(Array.isArray(view.linkedFindings)).toBe(true);
  });
});

describe('evidence-intelligence evidence resolves via the inspector', () => {
  it('resolves a sample of the ev-intel-* universe through the AI source path', async () => {
    const sample = [...mockEvidenceById.keys()].slice(0, 8);
    for (const id of sample) {
      const resolution = await resolveInspectorContext({
        type: 'evidence',
        id,
        investigationId: DEMO,
      });
      expect(resolution.status).toBe('ready');
      if (resolution.status === 'ready') {
        expect((resolution.view as { evidenceType?: string }).evidenceType).toBeDefined();
      }
    }
  });
});

describe('investigation findings resolve via the inspector', () => {
  it('resolves the recorded findings (inf-006-*) instead of failing', async () => {
    const findingIds = record.findings.map((f) => f.id);
    expect(findingIds.length).toBeGreaterThan(0);

    for (const id of findingIds) {
      const resolution = await resolveInspectorContext({
        type: 'finding',
        id,
        investigationId: DEMO,
      });
      expect(resolution.status).toBe('ready');
      if (resolution.status !== 'ready') return;
      expect(resolution.view.kind).toBe('finding');
    }
  });
});

describe('demo evidence namespace is not accidentally duplicated', () => {
  it('keeps the two evidence namespaces distinct for scoping', () => {
    const legacy = new Set(mockEntityEvidence.map((e) => e.id));
    const intel = new Set(mockEvidenceById.keys());
    // No id collision between the canonical ev-* and ev-intel-* sets.
    for (const id of legacy) {
      expect(intel.has(id)).toBe(false);
    }
  });
});