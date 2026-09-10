import { presentationPatterns, suspiciousPatterns } from '@/mock/patterns';
import {
  HIDDEN_INVESTIGATION_IDS,
  isPresentationInvestigation,
  mockInvestigationById,
} from '@/mock/investigations';
import { listEvidence } from '@/services/evidence.service';

// ============================================================
// PRESENTATION LOCK — REGRESSION GUARDS
// ============================================================
// Locks the demo presentation to the single Operation Trinetra
// Nexus universe: user-facing pattern surfaces expose only the
// Nexus patterns, the legacy Operation Meridian investigation is
// hidden from all presentation surfaces, and the Nexus evidence
// anchor resolves to its 7 evidence items (never empty).
// ============================================================

describe('patterns presentation lock', () => {
  it('exposes exactly the 5 Nexus patterns to presentation surfaces', () => {
    expect(presentationPatterns).toHaveLength(5);
    for (const p of presentationPatterns) {
      expect(p.id).toMatch(/^nsp-\d+$/);
    }
  });

  it('keeps the legacy inspector patterns after the Nexus set', () => {
    expect(suspiciousPatterns.length).toBeGreaterThan(presentationPatterns.length);
    expect(suspiciousPatterns.slice(0, presentationPatterns.length)).toEqual(
      presentationPatterns
    );
    expect(suspiciousPatterns.some((p) => p.id === 'sp-001')).toBe(true);
  });

  it('keeps Nexus pattern ids deterministic and free of duplicates', () => {
    const ids = presentationPatterns.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('single-demo-investigation lock', () => {
  it('hides the legacy Operation Meridian investigation', () => {
    expect(HIDDEN_INVESTIGATION_IDS.has('inv-006')).toBe(true);
    expect(isPresentationInvestigation('inv-006')).toBe(false);
  });

  it('keeps the Operation Trinetra Nexus investigation visible', () => {
    expect(isPresentationInvestigation('inv-demo-nexus')).toBe(true);
  });

  it('treats unknown ids as visible rather than hiding them', () => {
    expect(isPresentationInvestigation('inv-unknown-123')).toBe(true);
  });

  it('keeps the Nexus demo investigation registered and consistent', () => {
    const record = mockInvestigationById.get('inv-demo-nexus');
    expect(record).toBeDefined();
    expect(record!.investigation.title).toBe('Operation Trinetra Nexus');
  });
});

describe('Nexus evidence anchor', () => {
  it('resolves to exactly the 7 Nexus evidence items (never empty)', async () => {
    const result = await listEvidence({
      investigationId: 'inv-demo-nexus',
      pageSize: 100,
    });
    expect(result.total).toBe(7);
    expect(result.items).toHaveLength(7);
    for (const item of result.items) {
      expect(item.investigationId).toBe('inv-demo-nexus');
      expect(item.id).toMatch(/^ev-nexus-\d+$/);
    }
  });
});