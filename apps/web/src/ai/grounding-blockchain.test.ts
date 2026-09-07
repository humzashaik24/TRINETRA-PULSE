import type { AIContext } from '@trinetra-pulse/types';
import { buildAnsweredResponse } from './grounding';

// ============================================================
// PHASE 21 — BLOCKCHAIN ANCHOR GROUNDING
// ============================================================

function integrityRef(evidenceId: string, label: string, overrides: Record<string, string | number | boolean | null> = {}) {
  return {
    id: `evidence-integrity:${evidenceId}`,
    sourceType: 'Evidence' as const,
    sourceId: evidenceId,
    label: `${label} anchor state`,
    relevance: 0.6,
    payload: {
      verificationState: 'VERIFIED',
      isMock: true,
      network: 'trinetra-mock-chain',
      anchorDigest: 'a'.repeat(64),
      custodyChainHash: 'b'.repeat(64),
      checksumPrefixed: `sha256:${'c'.repeat(64)}`,
      ...overrides,
    },
  };
}

function contextWithIntegrity(
  items: { id: string; label: string; title: string; payload?: Record<string, string | number | boolean | null> }[],
): AIContext {
  return {
    scope: { investigationId: 'inv-006' },
    entity: null,
    investigation: null,
    relationships: [],
    network: null,
    analytics: null,
    evidence: items.map((item) => ({
      type: 'Evidence' as const,
      sourceId: item.id,
      label: item.label,
      summary: `${item.title}\nType: FIR`,
      references: [
        {
          id: `Evidence:${item.id}`,
          sourceType: 'Evidence' as const,
          sourceId: item.id,
          label: item.label,
          relevance: 0.6,
        },
        integrityRef(item.id, item.title, item.payload),
      ],
    })),
    findings: [],
    truncated: false,
  };
}

describe('grounding BLOCKCHAIN_ANCHOR', () => {
  it('answers from payload data only, exposing the mock registry', () => {
    const context = contextWithIntegrity([
      { id: 'ev-intel-001', label: 'FIR-2026-001', title: 'FIR primary document' },
      {
        id: 'ev-intel-002',
        label: 'CDR extract',
        title: 'CDR extract',
        payload: { verificationState: 'NOT_ANCHORED' },
      },
    ]);
    const res = buildAnsweredResponse({ queryId: 'qb', type: 'BLOCKCHAIN_ANCHOR', context, refs: {} });
    expect(res.status).toBe('complete');
    expect(res.answer).toContain('2 evidence item(s)');
    expect(res.answer).toContain('1 anchor state is verified');
    expect(res.answer.toLowerCase()).toContain('mock registry');
    expect(res.keyPoints?.length).toBeGreaterThan(0);
    const limitation = res.limitations?.join(' ').toLowerCase() ?? '';
    expect(limitation).toContain('off-chain');
  });

  it('reports mismatch honestly when the state differs', () => {
    const context = contextWithIntegrity([
      {
        id: 'ev-intel-003',
        label: 'Bank statement',
        title: 'Bank statement',
        payload: { verificationState: 'MISMATCH' },
      },
    ]);
    const res = buildAnsweredResponse({ queryId: 'qb', type: 'BLOCKCHAIN_ANCHOR', context, refs: {} });
    expect(res.answer).toContain('1 show a mismatch');
  });

  it('returns not_found when no evidence carries an integrity payload', () => {
    const context = contextWithIntegrity([]);
    const res = buildAnsweredResponse({ queryId: 'qb', type: 'BLOCKCHAIN_ANCHOR', context, refs: {} });
    expect(res.status).toBe('not_found');
  });
});