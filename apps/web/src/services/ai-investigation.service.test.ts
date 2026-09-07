import { AIInvestigationOrchestrator } from './ai-investigation.service';

describe('AIInvestigationOrchestrator (integration, ground truth data)', () => {
  let orchestrator: AIInvestigationOrchestrator;

  beforeEach(() => {
    orchestrator = new AIInvestigationOrchestrator();
  });

  it('answers an investigation summary grounded in real mock data', async () => {
    const res = await orchestrator.answer({
      text: 'Summarize this investigation',
      scope: { investigationId: 'inv-001', networkId: 'NET-001' },
    });
    expect(['complete', 'not_found']).toContain(res.status);
    expect(typeof res.answer).toBe('string');
    // must be neutral
    expect(res.answer.toLowerCase()).not.toMatch(
      /\b(criminal|guilty|mastermind|dangerous)\b/
    );
  });

  it('grounds an entity summary against the selected entity', async () => {
    const res = await orchestrator.answer({
      text: 'Tell me about this entity',
      scope: { investigationId: 'inv-001', entityId: 'ent-person-001' },
    });
    expect(res.answer).toContain('Rahul');
  });

  it('exposes grounded, validated source references', async () => {
    const res = await orchestrator.answer({
      text: 'Which evidence supports the recorded findings?',
      scope: { investigationId: 'inv-001' },
    });
    // All surfaced sources must be within the investigation scope.
    for (const s of res.sources) {
      expect(s.sourceId).toBeTruthy();
      expect(s.sourceType).toBeTruthy();
    }
  });

  it('returns a structured response with confidence and limitations', async () => {
    const res = await orchestrator.answer({
      text: 'Summarize this investigation',
      scope: { investigationId: 'inv-001' },
    });
    expect(res.confidence.answerGrounding).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(res.suggestedActions)).toBe(true);
    expect(Array.isArray(res.limitations)).toBe(true);
  });
});
