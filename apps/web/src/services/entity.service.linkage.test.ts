import {
  confirmEntityResolutions,
  evaluateInvestigationResolutions,
  fetchEntityResolutions,
  fetchInvestigationResolutions,
  rejectEntityResolutions,
} from './entity.service';

// ============================================================
// ENTITY SERVICE — Phase 20 linkage functions
// ============================================================

const INV = '6c887c98-939a-50ce-ac27-f58376941de2';
const ACTOR = 'analyst@trinetra.local';

describe('entity.service — linkage (Phase 20)', () => {
  it('fetches resolutions scoped to a single entity', async () => {
    const list = await fetchEntityResolutions('ent-phone-001');
    expect(list.length).toBeGreaterThan(0);
    for (const c of list) {
      expect(c.entity_id_1 === 'ent-phone-001' || c.entity_id_2 === 'ent-phone-001').toBe(true);
    }
  });

  it('fetches resolutions scoped to an investigation', async () => {
    const list = await fetchInvestigationResolutions(INV);
    expect(list.length).toBeGreaterThan(0);
    for (const c of list) expect(c.investigation_id).toBe(INV);
  });

  it('re-runs the engine and returns evaluation metadata', async () => {
    const result = await evaluateInvestigationResolutions(INV, ACTOR);
    expect(result.algorithm_version).toBe('entity-resolution-v1');
    expect(result.evaluated_pairs).toBeGreaterThan(0);
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  it('confirm marks the entity resolutions confirmed and records the actor', async () => {
    const updated = await confirmEntityResolutions('ent-phone-001', ACTOR, 'Primary device of subject');
    expect(updated.length).toBeGreaterThan(0);
    for (const c of updated) {
      expect(c.verification_state).toBe('confirmed');
      expect(c.verified_by).toBe(ACTOR);
    }
  });

  it('reject marks resolutions rejected with a reason', async () => {
    const updated = await rejectEntityResolutions('ent-person-006', ACTOR, 'No independent corroboration');
    const pending = updated.filter((c) => c.entity_id_1 === 'ent-person-006' || c.entity_id_2 === 'ent-person-006');
    for (const c of pending) {
      expect(c.verification_state).toBe('rejected');
      expect(c.rejection_reason).toBe('No independent corroboration');
    }
  });
});
