import { routeQuery, classifyType } from './query-router';

// ============================================================
// PHASE 21 — BLOCKCHAIN ANCHOR QUERY ROUTING
// ============================================================

describe('query-router BLOCKCHAIN_ANCHOR', () => {
  it.each([
    ['is this evidence anchored on-chain?'],
    ['what is the blockchain anchor digest for this evidence'],
    ['is the custody chain immutable and tamper-evident'],
    ['what is the on-chain integrity state'],
  ])('routes "%s" to BLOCKCHAIN_ANCHOR', (text) => {
    expect(routeQuery({ text, scope: {} }).type).toBe('BLOCKCHAIN_ANCHOR');
  });

  it('keeps plain evidence summaries on EVIDENCE_SUMMARY', () => {
    expect(routeQuery({ text: 'summarize the evidence', scope: {} }).type).toBe(
      'EVIDENCE_SUMMARY'
    );
  });

  it('classifyType routes anchor questions', () => {
    expect(classifyType('is this evidence anchored on-chain')).toBe('BLOCKCHAIN_ANCHOR');
  });
});