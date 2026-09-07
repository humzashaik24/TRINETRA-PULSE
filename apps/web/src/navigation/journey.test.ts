import {
  journeyHref,
  parseJourneyPayload,
  mergeJourneyPayload,
  payloadFromContext,
  focusLabel,
  DEMO_INVESTIGATION_ID,
  DEMO_JOURNEY,
  JOURNEY_QUERY,
} from '@/navigation/journey';

// ============================================================
// PHASE 13 — JOURNEY NAVIGATION CONTRACT
// ============================================================

describe('journeyHref', () => {
  it('returns the path unchanged when no payload', () => {
    expect(journeyHref('/networks/NET-001')).toBe('/networks/NET-001');
    expect(journeyHref('/networks/NET-001', null)).toBe('/networks/NET-001');
  });

  it('appends investigation/focus/section as query params', () => {
    const href = journeyHref('/networks/NET-001', {
      investigation: 'inv-006',
      focus: 'ent-person-001',
    });
    expect(href).toContain('/networks/NET-001?');
    expect(href).toContain(`${JOURNEY_QUERY.investigation}=inv-006`);
    expect(href).toContain(`${JOURNEY_QUERY.focus}=ent-person-001`);
  });

  it('preserves existing query strings', () => {
    const href = journeyHref('/investigations/inv-006?tab=evidence', {
      investigation: 'inv-006',
    });
    expect(href).toContain('tab=evidence');
    expect(href).toContain(`${JOURNEY_QUERY.investigation}=inv-006`);
  });
});

describe('parseJourneyPayload', () => {
  it('parses a query string into a typed payload', () => {
    const p = parseJourneyPayload('i=inv-006&focus=ent-person-001&section=network');
    expect(p).toEqual({
      investigation: 'inv-006',
      focus: 'ent-person-001',
      section: 'network',
    });
  });

  it('returns empty object for a bare query', () => {
    expect(parseJourneyPayload('')).toEqual({});
  });

  it('accepts a URLSearchParams instance', () => {
    const p = parseJourneyPayload(new URLSearchParams('i=inv-006'));
    expect(p.investigation).toBe('inv-006');
  });
});

describe('mergeJourneyPayload', () => {
  it('returns null when both are empty', () => {
    expect(mergeJourneyPayload(null, undefined)).toBeNull();
  });

  it('merges base and over, later wins', () => {
    const merged = mergeJourneyPayload(
      { investigation: 'inv-001', focus: 'a' },
      { focus: 'b' }
    );
    expect(merged).toEqual({ investigation: 'inv-001', focus: 'b' });
  });
});

describe('payloadFromContext', () => {
  it('carries the focused id for entity contexts', () => {
    const p = payloadFromContext({
      type: 'entity',
      id: 'ent-person-001',
      name: 'Rahul Kumar',
    } as never);
    expect(p?.focus).toBe('ent-person-001');
  });

  it('returns null for unknown contexts', () => {
    expect(payloadFromContext(null)).toBeNull();
  });
});

describe('DEMO_JOURNEY', () => {
  it('points investigate() at the canonical demo investigation', () => {
    expect(DEMO_JOURNEY.investigate().payload.investigation).toBe(DEMO_INVESTIGATION_ID);
  });

  it('builds entity journey payloads', () => {
    const t = DEMO_JOURNEY.entity('ent-person-001');
    expect(t.focus).toBe('entity');
    expect(t.payload.focus).toBe('ent-person-001');
    expect(t.payload.investigation).toBe(DEMO_INVESTIGATION_ID);
  });
});

describe('focusLabel', () => {
  it('returns human labels for known focus kinds', () => {
    expect(focusLabel('entity')).toBe('Entity');
    expect(focusLabel('network')).toBe('Network');
    expect(focusLabel(undefined)).toBe('Object');
  });
});