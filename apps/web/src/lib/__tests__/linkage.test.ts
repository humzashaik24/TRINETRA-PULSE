import type { EntityIntelligence } from '@trinetra-pulse/types';
import {
  LINKAGE_ALGORITHM_VERSION,
  blockingKeysFor,
  buildLinkageCandidates,
} from '../linkage';

// ============================================================
// LINKAGE ENGINE TESTS (Phase 20, client mirror of entity-resolution-v1)
// ============================================================

const INV = 'inv-006';

function entity(over: Partial<EntityIntelligence> & { id: string }): EntityIntelligence {
  return {
    entityType: over.entityType ?? 'person',
    name: over.name ?? over.id,
    canonicalName: over.name?.toLowerCase() ?? over.id,
    displayName: over.name ?? over.id,
    description: '',
    resolutionState: 'POSSIBLE',
    confidence: 0.5,
    sourcesCount: 1,
    connectionsCount: 0,
    eventsCount: 0,
    evidenceCount: 0,
    activityCount: 0,
    isVerified: false,
    isFlagged: false,
    aliases: [],
    attributes: {},
    createdAt: '2026-08-24T10:15:00Z',
    updatedAt: '2026-08-24T10:15:00Z',
    ...over,
  };
}

const rahul = entity({
  id: 'ent-person-001',
  name: 'Rahul Kumar',
  attributes: { full_name: 'Rahul Kumar', phone: '+91 98765 43210' },
});

const phone = entity({
  id: 'ent-phone-001',
  entityType: 'phone',
  name: '+91 98765 43210',
  attributes: { phone_number: '+91 98765 43210', holder: 'Rahul Kumar' },
});

const account = entity({
  id: 'ent-account-001',
  entityType: 'account',
  name: '7731 0029 4567',
  attributes: { account_number: '773100294567', holder: 'Rahul Kumar' },
});

const priya = entity({
  id: 'ent-person-002',
  name: 'Priya Sharma',
  attributes: { full_name: 'Priya Sharma', phone: '+91 90210 11345' },
});

describe('blockingKeysFor', () => {
  it('emits identifier and name keys', () => {
    const keys = blockingKeysFor(rahul);
    expect(keys.has('PHONE_EXACT:919876543210')).toBe(true);
    expect(keys.has('name:rahul kumar')).toBe(true);
  });

  it('emits holder key as a name-recognized attribute', () => {
    expect(blockingKeysFor(phone).has('name:rahul kumar')).toBe(true);
  });
});

describe('buildLinkageCandidates', () => {
  it('is deterministic (same input → same candidates)', () => {
    const a = buildLinkageCandidates([rahul, phone, account], INV);
    const b = buildLinkageCandidates([rahul, phone, account], INV);
    expect(a).toEqual(b);
  });

  it('produces the expected real pairs for the Operation Meridian universe', () => {
    const candidates = buildLinkageCandidates([rahul, phone, account], INV);
    const pairIds = candidates
      .map((c) => `${c.entity_id_1}::${c.entity_id_2}`)
      .sort();
    expect(pairIds).toEqual([
      'ent-account-001::ent-person-001',
      'ent-account-001::ent-phone-001',
      'ent-person-001::ent-phone-001',
    ]);
  });

  it('marks strong identifier overlaps as auto_resolved HIGH', () => {
    const candidates = buildLinkageCandidates([rahul, phone, account], INV);
    const personPhone = candidates.find(
      (c) => c.entity_id_1 === 'ent-person-001' && c.entity_id_2 === 'ent-phone-001'
    );
    expect(personPhone?.verification_state).toBe('auto_resolved');
    expect(personPhone?.confidence).toBe('HIGH');
    expect(personPhone?.linkage_score).toBeGreaterThanOrEqual(0.8);
  });

  it('does not fabricate pairs without shared blocking keys', () => {
    const candidates = buildLinkageCandidates([rahul, priya], INV);
    expect(candidates).toHaveLength(0);
  });

  it('annotates matched features and contradiction-free evidence', () => {
    const candidates = buildLinkageCandidates([rahul, phone, account], INV);
    const personPhone = candidates.find(
      (c) =>
        (c.entity_id_1 === 'ent-person-001' && c.entity_id_2 === 'ent-phone-001') ||
        (c.entity_id_1 === 'ent-phone-001' && c.entity_id_2 === 'ent-person-001')
    )!;
    const features = personPhone.matched_features.map((f) => f.feature);
    expect(features).toContain('PHONE_EXACT');
    expect(features).toContain('NAME_EXACT');
    expect(personPhone.resolution_version).toBe(LINKAGE_ALGORITHM_VERSION);
    expect(personPhone.investigation_id).toBe(INV);
  });
});
