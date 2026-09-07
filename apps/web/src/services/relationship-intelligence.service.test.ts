import {
  getIntelligenceStatusLabel,
  relationshipIntelligenceSnapshot,
} from './relationship-intelligence.service';

// ============================================================
// RELATIONSHIP INTELLIGENCE SERVICE TESTS (Phase 21)
// ============================================================
// The correlation snapshot is a deterministic, pure derivation from the
// existing relationship mocks — one observation per distinct evidence
// reference. Tests assert stable, neutral, non-random behaviour.
// ============================================================

describe('relationshipIntelligenceSnapshot', () => {
  it('derives a single-source relationship as pending corroboration', () => {
    const snap = relationshipIntelligenceSnapshot('rel-003');
    expect(snap).toBeDefined();
    expect(snap!.sourceCount).toBe(1);
    expect(snap!.status).toBe('NEEDS_REVIEW');
    expect(snap!.correlationKey).toBe('');
    expect(relationshipIntelligenceSnapshot('rel-004')!.sourceCount).toBe(1);
  });

  it('marks a relationship observed across distinct evidence references as corroborated', () => {
    const snap = relationshipIntelligenceSnapshot('rel-001');
    expect(snap).toBeDefined();
    expect(snap!.sourceCount).toBeGreaterThanOrEqual(2);
    expect(snap!.correlationKey.startsWith('g-')).toBe(true);
    expect(snap!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('returns undefined for an unknown relationship id', () => {
    expect(relationshipIntelligenceSnapshot('rel-999')).toBeUndefined();
  });

  it('is deterministic across calls (no randomness)', () => {
    const a = relationshipIntelligenceSnapshot('rel-001');
    const b = relationshipIntelligenceSnapshot('rel-001');
    expect(a).toEqual(b);
    expect(a!.confidence).toBeCloseTo(b!.confidence, 5);
  });
});

describe('getIntelligenceStatusLabel', () => {
  it('maps statuses to neutral labels', () => {
    expect(getIntelligenceStatusLabel('NEEDS_REVIEW')).toBe('Needs review');
    expect(getIntelligenceStatusLabel('REVIEWED')).toBe('Reviewed');
    expect(getIntelligenceStatusLabel('DISCARDED')).toBe('Discarded');
  });
});
