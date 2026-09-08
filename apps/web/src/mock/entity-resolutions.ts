import type { EntityResolution } from '@trinetra-pulse/types';

// ============================================================
// MOCK — ENTITY RESOLUTIONS
// Explainable resolution records with explicit signals.
// ============================================================

interface Seed {
  id: string;
  entityAId: string;
  entityBId: string;
  entityAName: string;
  entityBName: string;
  entityADisplayValue: string;
  entityBDisplayValue: string;
  entityAType: EntityResolution['entityAType'];
  entityBType: EntityResolution['entityBType'];
  similarity: number;
  confidence: number;
  state: EntityResolution['state'];
  recommendation: EntityResolution['recommendation'];
  summaryReason: string;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewReason?: string;
  createdAt: string;
  updatedAt: string;
}

const signalsForPersonMatch = (source: string): EntityResolution['signals'] => [
  {
    id: 'sig-name',
    signal: 'value_similarity',
    displayLabel: 'Name similarity',
    value: '94%',
    weight: 0.4,
    source,
    match: true,
    rawValueA: 'Rahul Kumar',
    rawValueB: 'R. Kumar',
  },
  {
    id: 'sig-phone',
    signal: 'shared_phone',
    displayLabel: 'Shared phone',
    value: 'Exact match',
    weight: 0.3,
    source,
    match: true,
    rawValueA: '+91 98765 43210',
    rawValueB: '+91 98765 43210',
  },
  {
    id: 'sig-loc',
    signal: 'shared_location',
    displayLabel: 'Shared location',
    value: 'Same location',
    weight: 0.2,
    source,
    match: true,
    rawValueA: 'Chennai',
    rawValueB: 'Chennai',
  },
  {
    id: 'sig-src',
    signal: 'source_consistency',
    displayLabel: 'Source consistency',
    value: '3 records',
    weight: 0.1,
    source: 'FIR-2026-001 / CDR Extract',
    match: null,
  },
];

const build = (s: Seed): EntityResolution => ({
  id: s.id,
  entityAId: s.entityAId,
  entityBId: s.entityBId,
  entityAName: s.entityAName,
  entityBName: s.entityBName,
  entityADisplayValue: s.entityADisplayValue,
  entityBDisplayValue: s.entityBDisplayValue,
  entityAType: s.entityAType,
  entityBType: s.entityBType,
  similarity: s.similarity,
  confidence: s.confidence,
  state: s.state,
  recommendation: s.recommendation,
  signals: signalsForPersonMatch('FIR-2026-001 / CDR Extract - Operation clean'),
  summaryReason: s.summaryReason,
  evidence: ['FIR-2026-001 / R2', 'cdr_extract.csv #2241', 'Bank Transaction Log'],
  createdBy: 'System',
  reviewedBy: s.reviewedBy,
  reviewedAt: s.reviewedAt,
  reviewReason: s.reviewReason,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

const buildOrg = (s: Seed): EntityResolution => ({
  ...build(s),
  signals: [
    {
      id: 'sig-value',
      signal: 'value_similarity',
      displayLabel: 'Value similarity',
      value: 'Exact match',
      weight: 0.5,
      source: 'FIR-2026-001',
      match: true,
      rawValueA: 'Mumbai Trading Corporation',
      rawValueB: 'Mumbai Trading Corp',
    },
    {
      id: 'sig-loc',
      signal: 'shared_location',
      displayLabel: 'Shared location',
      value: 'Same location',
      weight: 0.3,
      source: 'FIR-2026-001',
      match: true,
      rawValueA: 'Mumbai',
      rawValueB: 'Mumbai',
    },
  ],
  summaryReason: s.summaryReason,
});

export const mockEntityResolutions: EntityResolution[] = [
  build({
    id: 'res-001',
    entityAId: 'cand-001',
    entityBId: 'cand-002',
    entityAName: 'Rahul Kumar',
    entityBName: 'R. Kumar',
    entityADisplayValue: 'Rahul Kumar',
    entityBDisplayValue: 'R. Kumar',
    entityAType: 'person',
    entityBType: 'person',
    similarity: 0.87,
    confidence: 0.88,
    state: 'NEEDS_REVIEW',
    recommendation: 'MERGE',
    summaryReason: 'Strong overlap (87%) — 3 supporting signals, 0 conflicting. Analyst confirmation required before merge.',
    createdBy: 'System',
    createdAt: '2026-08-22T12:25:00Z',
    updatedAt: '2026-08-26T08:05:00Z',
  }),
  buildOrg({
    id: 'res-002',
    entityAId: 'cand-005',
    entityBId: 'ent-org-001',
    entityAName: 'Mumbai Trading Corporation',
    entityBName: 'Mumbai Trading Corp',
    entityADisplayValue: 'Mumbai Trading Corp',
    entityBDisplayValue: 'Mumbai Trading Corp',
    entityAType: 'organization',
    entityBType: 'organization',
    similarity: 0.92,
    confidence: 0.93,
    state: 'CONFIRMED',
    recommendation: 'MERGE',
    summaryReason: 'Normalized organization values match; same location confirmed.',
    createdBy: 'System',
    reviewedBy: 'analyst-kd',
    reviewedAt: '2026-08-23T10:15:00Z',
    reviewReason: 'Legal suffix normalization check passed.',
    createdAt: '2026-08-20T13:15:00Z',
    updatedAt: '2026-08-23T10:15:00Z',
  }),
  build({
    id: 'res-003',
    entityAId: 'cand-004',
    entityBId: 'ent-vehicle-001',
    entityAName: 'mh14 bx 2231',
    entityBName: 'MH 14 BX 2231',
    entityADisplayValue: 'MH 14 BX 2231',
    entityBDisplayValue: 'MH 14 BX 2231',
    entityAType: 'vehicle',
    entityBType: 'vehicle',
    similarity: 0.95,
    confidence: 0.95,
    state: 'CONFIRMED',
    recommendation: 'MERGE',
    summaryReason: 'Registration normalized to MH14BX2231; shared owner recorded.',
    createdBy: 'System',
    reviewedBy: 'analyst-kd',
    reviewedAt: '2026-08-24T11:00:00Z',
    reviewReason: 'Registration + owner consistency verified.',
    createdAt: '2026-08-18T10:27:00Z',
    updatedAt: '2026-08-24T11:00:00Z',
  }),
  build({
    id: 'res-004',
    entityAId: 'cand-007',
    entityBId: 'ent-account-001',
    entityAName: '773100294567',
    entityBName: '7731 0029 4567',
    entityADisplayValue: '7731 0029 4567',
    entityBDisplayValue: '7731 0029 4567',
    entityAType: 'account',
    entityBType: 'account',
    similarity: 0.97,
    confidence: 0.97,
    state: 'CONFIRMED',
    recommendation: 'MERGE',
    summaryReason: 'Account number exact match across normalized digits.',
    createdBy: 'System',
    reviewedBy: 'analyst-kd',
    reviewedAt: '2026-08-25T09:30:00Z',
    reviewReason: 'Exact numeric match confirmed.',
    createdAt: '2026-08-20T10:10:00Z',
    updatedAt: '2026-08-25T09:30:00Z',
  }),
  build({
    id: 'res-005',
    entityAId: 'cand-013',
    entityBId: 'ent-person-005',
    entityAName: 'Meera Reddy',
    entityBName: 'Meera Reddy',
    entityADisplayValue: 'Meera Reddy',
    entityBDisplayValue: 'Meera Reddy',
    entityAType: 'person',
    entityBType: 'person',
    similarity: 0.9,
    confidence: 0.91,
    state: 'PROBABLE',
    recommendation: 'MERGE',
    summaryReason: 'NLP extraction matches confirmed profile; shared location.',
    createdBy: 'System',
    createdAt: '2026-08-21T09:02:00Z',
    updatedAt: '2026-08-23T11:30:00Z',
  }),
  build({
    id: 'res-006',
    entityAId: 'ent-person-006',
    entityBId: 'ent-person-001',
    entityAName: 'R. Kumar',
    entityBName: 'Rahul Kumar',
    entityADisplayValue: 'R. Kumar',
    entityBDisplayValue: 'Rahul Kumar',
    entityAType: 'person',
    entityBType: 'person',
    similarity: 0.86,
    confidence: 0.87,
    state: 'NEEDS_REVIEW',
    recommendation: 'MERGE',
    summaryReason: 'Candidate profile R. Kumar shares phone and location with confirmed entity Rahul Kumar.',
    createdBy: 'System',
    createdAt: '2026-08-26T08:00:00Z',
    updatedAt: '2026-08-26T08:00:00Z',
  }),
];

export const mockResolutionById: Map<string, EntityResolution> = new Map(
  mockEntityResolutions.map((r) => [r.id, r])
);