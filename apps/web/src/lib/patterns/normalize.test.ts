/**
 * Phase C — tests for the deterministic pattern normalization layer.
 *
 * The layer is the single adapter between the authoritative backend detection
 * result and the workspace contract. These tests pin the sourcing rules: real
 * metadata → real metrics (never invented), real persisted rows → real refs,
 * and the mock fixtures → preserved fixture output.
 */

import {
  metadataToMetrics,
  patternArtifactFromDetection,
  normalizePatternDetection,
  mockPatternsToArtifacts,
  artifactTimeAgo,
} from './normalize';
import type {
  PatternContextRows,
} from './normalize';
import type { PatternDetectionResponse, SuspiciousPattern } from '@trinetra-pulse/types';

jest.mock('@/lib/format', () => ({
  formatRelativeTime: jest.fn((iso: string | undefined, now = Date.now()) =>
    iso ? `ago:${iso}` : 'now'),
}));

// ---------------------------------------------------------------------------
// metadataToMetrics
// ---------------------------------------------------------------------------

describe('metadataToMetrics', () => {
  it('derives deterministic labeled rows from the network-hub metadata', () => {
    const metrics = metadataToMetrics({
      degree: 14,
      normalized_degree: 1.0,
      average_degree: 3.429,
    });

    expect(metrics).toEqual({
      Degree: '14',
      'Normalized degree': '1',
      'Average degree': '3.429',
    });
  });

  it('orders numeric-scalar keys deterministically regardless of input order', () => {
    const a = metadataToMetrics({ neighbor_count: 4, connected_groups: 3, degree: 2 });
    const b = metadataToMetrics({ degree: 2, connected_groups: 3, neighbor_count: 4 });
    expect(a).toEqual(b);
    expect(Object.keys(a)).toEqual(['Degree', 'Neighbors', 'Connected groups']);
  });

  it('counts array metadata and formats booleans honestly', () => {
    const metrics = metadataToMetrics({
      shared_phone_ids: ['p1', 'p2'],
      rapid_switching_supported: false,
      phone_count: 2,
    });

    expect(metrics['Phones']).toBe('2');
    expect(metrics['Shared phones']).toBe('2');
    expect(metrics['Rapid switching']).toBe('No');
  });

  it('formats observed amounts and window range from real values', () => {
    const metrics = metadataToMetrics({
      total_observed_amount: 1250000.5,
      window: { from: '2026-08-01T00:00:00Z', to: '2026-08-31T00:00:00Z' },
    });

    expect(metrics['Observed amount']).toBe('1,250,000.5');
    expect(metrics['Window']).toBe('2026-08-01 → 2026-08-31');
  });

  it('never emits rows for unknown keys', () => {
    const metrics = metadataToMetrics({ something_unmodeled: 7 });
    expect(Object.keys(metrics)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// patternArtifactFromDetection / normalizePatternDetection
// ---------------------------------------------------------------------------

const ROWS: PatternContextRows = {
  entities: [
    { id: 'e-1', name: 'Arjun Kapoor', entity_type: 'person' },
    { id: 'e-2', name: 'Mumbai Trading Corp', entity_type: 'organization' },
  ],
  evidence: [
    { id: 'ev-1', title: 'Call Detail Records' },
    { id: 'missing-evidence', title: undefined },
  ],
  relationships: [
    { id: 'r-1', source_entity_id: 'e-1', target_entity_id: 'e-2', relationship_type: 'owns' },
    { id: 'r-missing', source_entity_id: 'e-1', target_entity_id: 'unknown-target' },
  ],
};

const DETECTION: PatternDetectionResponse = {
  investigation_id: 'inv-1',
  patterns: [
    {
      id: 'pat-hub',
      investigation_id: 'inv-1',
      pattern_type: 'NETWORK_HUB',
      severity: 'MEDIUM',
      confidence: 0.99,
      title: 'High-connectivity network hub',
      description: 'Observed hub.',
      entity_ids: ['e-1'],
      relationship_ids: ['r-1'],
      evidence_ids: ['ev-1', 'missing-evidence'],
      event_ids: [],
      metadata: { degree: 14, total_observed_amount: 1250000.5 },
      detected_at: '2026-09-05T00:00:00Z',
    },
  ],
};

describe('patternArtifactFromDetection', () => {
  it('maps the backend term verbatim as the typeLabel', () => {
    const artifact = patternArtifactFromDetection(DETECTION.patterns[0], ROWS);
    expect(artifact.pattern_type).toBe('NETWORK_HUB');
    expect(artifact.typeLabel).toBe('NETWORK_HUB');
  });

  it('resolves entity refs to persisted names and types', () => {
    const artifact = patternArtifactFromDetection(DETECTION.patterns[0], ROWS);
    expect(artifact.entityRefs).toEqual([{ id: 'e-1', name: 'Arjun Kapoor', type: 'person' }]);
  });

  it('resolves evidence refs and falls back to the raw id when the row is absent', () => {
    const artifact = patternArtifactFromDetection(DETECTION.patterns[0], ROWS);
    expect(artifact.evidenceRefs).toEqual([
      { id: 'ev-1', title: 'Call Detail Records' },
      { id: 'missing-evidence', title: 'missing-evidence' },
    ]);
  });

  it('resolves relationship refs with entity names and relationship type', () => {
    const artifact = patternArtifactFromDetection(DETECTION.patterns[0], ROWS);
    expect(artifact.relationshipRefs).toEqual([
      { id: 'r-1', sourceName: 'Arjun Kapoor', targetName: 'Mumbai Trading Corp', type: 'owns' },
    ]);
  });

  it('keeps unknown ids as honest id-only refs', () => {
    const artifact = patternArtifactFromDetection(
      { ...DETECTION.patterns[0], entity_ids: ['ghost'], relationship_ids: ['ghost-rel'], evidence_ids: ['ghost-ev'] },
      ROWS,
    );
    expect(artifact.entityRefs).toEqual([{ id: 'ghost', name: 'ghost', type: 'person' }]);
    expect(artifact.evidenceRefs).toEqual([{ id: 'ghost-ev', title: 'ghost-ev' }]);
    expect(artifact.relationshipRefs).toEqual([{ id: 'ghost-rel' }]);
  });

  it('derives timeAgo from the real detected_at', () => {
    const artifact = patternArtifactFromDetection(DETECTION.patterns[0], ROWS, Date.UTC(2026, 8, 8));
    expect(artifact.timeAgo).toBe('ago:2026-09-05T00:00:00Z');
  });
});

describe('normalizePatternDetection', () => {
  it('is deterministic: same input always yields the same output', () => {
    const a = normalizePatternDetection(DETECTION, ROWS);
    const b = normalizePatternDetection(DETECTION, ROWS);
    expect(a).toEqual(b);
    expect(a).toHaveLength(1);
  });

  it('returns an empty array for an empty detection response', () => {
    expect(
      normalizePatternDetection({ investigation_id: 'inv-1', patterns: [] }, ROWS),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// artifactTimeAgo
// ---------------------------------------------------------------------------

describe('artifactTimeAgo', () => {
  it('delegates to the relative time formatter with a real timestamp', () => {
    expect(artifactTimeAgo('2026-09-05T00:00:00Z', 1000)).toBe('ago:2026-09-05T00:00:00Z');
  });
});

// ---------------------------------------------------------------------------
// mockPatternsToArtifacts — preserved fixture output
// ---------------------------------------------------------------------------

const MOCK_PATTERN: SuspiciousPattern = {
  id: 'pat-mock',
  type: 'communication_spike',
  typeLabel: 'Communication Spike',
  title: 'Communication spike around key figures',
  description: 'Fixture description.',
  entities: [
    { id: 'ent-a', name: 'Alpha Contact', type: 'person' },
  ],
  entityCount: 1,
  confidence: 0.88,
  severity: 'high',
  metrics: { Calls: '220', Location: 'Dehradun' },
  timestamp: '2026-08-14T06:22:00Z',
  timeAgo: '2 days ago',
  status: 'new',
};

describe('mockPatternsToArtifacts', () => {
  it('carries the fixture label, status, metrics and timeAgo through verbatim', () => {
    const [artifact] = mockPatternsToArtifacts([MOCK_PATTERN]);

    expect(artifact.id).toBe('pat-mock');
    expect(artifact.typeLabel).toBe('Communication Spike');
    expect(artifact.status).toBe('new');
    expect(artifact.metrics).toEqual({ Calls: '220', Location: 'Dehradun' });
    expect(artifact.timeAgo).toBe('2 days ago');
    expect(artifact.severity).toBe('high');
  });

  it('maps fixture entities into navigable refs', () => {
    const [artifact] = mockPatternsToArtifacts([MOCK_PATTERN]);
    expect(artifact.entityRefs).toEqual([{ id: 'ent-a', name: 'Alpha Contact', type: 'person' }]);
    expect(artifact.entity_ids).toEqual(['ent-a']);
  });

  it('leaves evidence and relationship refs honestly empty (fixtures carry none)', () => {
    const [artifact] = mockPatternsToArtifacts([MOCK_PATTERN]);
    expect(artifact.evidenceRefs).toEqual([]);
    expect(artifact.relationshipRefs).toEqual([]);
  });
});