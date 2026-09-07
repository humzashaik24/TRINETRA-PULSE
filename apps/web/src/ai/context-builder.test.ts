import { buildInvestigationContext, CONTEXT_BUDGETS, limit } from './context-builder';

const baseBundle = {
  investigation: {
    id: 'inv-1',
    title: 'Op Meridian',
    status: 'active',
    priority: 'high',
    description: 'Test case',
    entityCount: 4,
    relationshipCount: 3,
    evidenceCount: 2,
  },
  relationships: Array.from({ length: 20 }, (_, i) => ({
    id: `rel-${i}`,
    sourceName: `A${i}`,
    targetName: `B${i}`,
    type: 'knows',
    confidence: 0.8,
    sourceEntityId: `s-${i}`,
    targetEntityId: `t-${i}`,
  })),
  evidence: Array.from({ length: 20 }, (_, i) => ({
    id: `ev-${i}`,
    title: `Evidence ${i}`,
    summary: 'recorded observation',
    evidenceType: 'document',
  })),
  findings: Array.from({ length: 20 }, (_, i) => ({
    id: `fd-${i}`,
    title: `Finding ${i}`,
    description: 'analytical',
    category: 'general',
    confidence: 'medium',
  })),
};

describe('context-builder', () => {
  it('builds investigation + entity context with references', () => {
    const ctx = buildInvestigationContext(
      { investigationId: 'inv-1', entityId: 'ent-1' },
      {
        bundle: {
          ...baseBundle,
          entity: {
            id: 'ent-1',
            name: 'Rahul',
            entityType: 'person',
            resolutionState: 'resolved',
            confidence: 0.9,
            connectionsCount: 7,
          },
        },
      }
    );
    expect(ctx.investigation?.sourceId).toBe('inv-1');
    expect(ctx.entity?.sourceId).toBe('ent-1');
    expect(ctx.entity?.label).toBe('Rahul');
    expect(ctx.investigation?.references[0].sourceType).toBe('Investigation');
  });

  it('applies deterministic budget truncation and flags it', () => {
    const ctx = buildInvestigationContext(
      { investigationId: 'inv-1' },
      { bundle: baseBundle }
    );
    expect(ctx.relationships?.length).toBeLessThanOrEqual(CONTEXT_BUDGETS.relationships);
    expect(ctx.evidence?.length).toBeLessThanOrEqual(CONTEXT_BUDGETS.evidence);
    expect(ctx.truncated).toBe(true);
    expect(ctx.note).toBe('Response based on the currently available context.');
  });

  it('does NOT flag truncation when nothing exceeds budget', () => {
    const ctx = buildInvestigationContext(
      { investigationId: 'inv-1' },
      {
        bundle: {
          investigation: baseBundle.investigation,
          relationships: [baseBundle.relationships[0]],
        },
      }
    );
    expect(ctx.truncated).toBe(false);
  });

  it('keeps summaries within the char budget', () => {
    const ctx = buildInvestigationContext({ investigationId: 'inv-1' }, { bundle: baseBundle });
    for (const src of [
      ctx.investigation!,
      ...(ctx.relationships ?? []),
      ...(ctx.evidence ?? []),
    ]) {
      expect(src.summary.length).toBeLessThanOrEqual(CONTEXT_BUDGETS.summaryChars + 1);
    }
  });

  it('limit returns first N items deterministically', () => {
    expect(limit([1, 2, 3, 4, 5], 2)).toEqual([1, 2]);
  });
});
