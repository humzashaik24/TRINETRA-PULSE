import { buildContextualPrompts } from '@/ai/contextual-prompts';
import { mockInvestigationById } from '@/mock/investigations';

// ============================================================
// PHASE 13 — CONTEXTUAL AI PROMPTS
// ============================================================

function scope(partial: Partial<{ investigationId: string; networkId: string; entityId: string }>) {
  return {
    investigationId: partial.investigationId,
    networkId: partial.networkId,
    entityId: partial.entityId,
  };
}

describe('buildContextualPrompts', () => {
  it('always returns the deterministic baseline when no scope exists', () => {
    const prompts = buildContextualPrompts({ scope: scope({}) });
    expect(prompts).toContain('Summarize this investigation');
    expect(prompts).toContain('Which evidence supports the recorded findings?');
    expect(prompts.length).toBeGreaterThan(0);
  });

  it('derives an entity-first prompt when an entity is selected', () => {
    const prompts = buildContextualPrompts({
      scope: scope({ investigationId: 'inv-006', entityId: 'ent-person-001' }),
      entityNames: ['Rahul Kumar'],
    });
    expect(prompts[0]).toContain('Rahul Kumar');
    expect(prompts[0]).toContain('known');
  });

  it('derives network prompts when a network is open without a selection', () => {
    const prompts = buildContextualPrompts({
      scope: scope({ investigationId: 'inv-006', networkId: 'NET-001' }),
    });
    expect(prompts.join(' ')).toContain('most connected group');
  });

  it('references real linked objects from the open investigation', () => {
    const inv = mockInvestigationById.get('inv-006')!.investigation;
    const prompts = buildContextualPrompts({
      scope: scope({ investigationId: 'inv-006' }),
      investigation: inv,
    });
    const joint = prompts.join(' ');
    expect(joint).toContain('Operation Meridian');
    expect(joint).toContain('chain of evidence');
  });

  it('does not duplicate prompts', () => {
    const prompts = buildContextualPrompts({ scope: scope({}) });
    const unique = new Set(prompts);
    expect(unique.size).toBe(prompts.length);
  });

  it('does not invent entity names beyond the linked set', () => {
    // Even with a scope entityId, without a real name the prompt keeps
    // the generic reference rather than fabricating a person.
    const prompts = buildContextualPrompts({
      scope: scope({ entityId: 'ent-unknown-999' }),
      entityNames: [],
    });
    expect(prompts[0]).toContain('selected entity');
  });

  it('keeps demo investigation data consistent with the mock universe', () => {
    const record = mockInvestigationById.get('inv-006');
    expect(record).toBeDefined();
    expect(record!.findings.length).toBeGreaterThan(0);
  });
});