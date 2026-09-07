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

// ============================================================
// PHASE 20 — LINKAGE CANDIDATES (real /api/v2 shape)
// Deterministic engine output (entity-resolution-v1) for the
// Operation Meridian universe: only genuine overlaps, never
// invented entities.
// ============================================================

import type {
  EntityResolutionCandidate,
  MatchFeature,
  ResolutionSourceRef,
} from '@trinetra-pulse/types';

const INV_006 = '6c887c98-939a-50ce-ac27-f58376941de2';
const VERSION = 'entity-resolution-v1';

interface CandidateSeed {
  id: string;
  entityId1: string;
  entityId2: string;
  entityName1: string;
  entityName2: string;
  entityType1: string;
  entityType2: string;
  confidence: EntityResolutionCandidate['confidence'];
  linkageScore: number;
  method: EntityResolutionCandidate['resolution_method'];
  features: MatchFeature[];
  contradictions: EntityResolutionCandidate['contradictions'];
  sources: ResolutionSourceRef[];
  evidence: string[];
  state: EntityResolutionCandidate['verification_state'];
}

function phoneFeature(v1: string, v2: string): MatchFeature {
  return {
    feature: 'PHONE_EXACT',
    label: 'Exact phone',
    matched: true,
    value: 'Exact match',
    weight: 0.7,
    value_1: v1,
    value_2: v2,
    normalized_1: v1.replace(/\D/g, ''),
    normalized_2: v2.replace(/\D/g, ''),
    source_1: null,
    source_2: null,
  };
}

function nameFeature(v1: string, v2: string, key: 'NAME_EXACT'): MatchFeature {
  return {
    feature: key,
    label: 'Exact normalized name',
    matched: true,
    value: 'Exact match',
    weight: 0.4,
    value_1: v1,
    value_2: v2,
    normalized_1: v1.trim().toLowerCase(),
    normalized_2: v2.trim().toLowerCase(),
    source_1: null,
    source_2: null,
  };
}

function nameEditFeature(v1: string, v2: string): MatchFeature {
  return {
    feature: 'NAME_SIMILARITY',
    label: 'Name similarity',
    matched: true,
    value: 'High similarity',
    weight: 0.15,
    value_1: v1,
    value_2: v2,
    normalized_1: v1.trim().toLowerCase(),
    normalized_2: v2.trim().toLowerCase(),
    source_1: null,
    source_2: null,
  };
}

const sourceFir = (entity: string): ResolutionSourceRef => ({
  source_dataset: 'FIR-2026-001',
  source_record: null,
  source_type: 'document',
  original_value: entity,
  normalized_value: entity.trim().toLowerCase(),
  dataset_id: null,
  evidence_refs: ['fir-2026-001-r2'],
});

const sourceCdr = (entity: string): ResolutionSourceRef => ({
  source_dataset: 'CDR Extract',
  source_record: 'cdr_extract.csv #2241',
  source_type: 'structured_mapping',
  original_value: entity,
  normalized_value: entity.trim().toLowerCase(),
  dataset_id: null,
  evidence_refs: ['cdr-extract-2026-02'],
});

const sourceBank = (entity: string): ResolutionSourceRef => ({
  source_dataset: 'Bank Transaction Log',
  source_record: 'btr-2026-001 hdfc#1122',
  source_type: 'structured_mapping',
  original_value: entity,
  normalized_value: entity.trim().toLowerCase(),
  dataset_id: null,
  evidence_refs: ['btr-2026-001'],
});

const buildCandidate = (s: CandidateSeed): EntityResolutionCandidate => ({
  id: s.id,
  investigation_id: INV_006,
  entity_id_1: s.entityId1,
  entity_id_2: s.entityId2,
  entity_1_name: s.entityName1,
  entity_2_name: s.entityName2,
  entity_1_type: s.entityType1,
  entity_2_type: s.entityType2,
  confidence: s.confidence,
  linkage_score: s.linkageScore,
  resolution_version: VERSION,
  resolution_method: s.method,
  matched_features: s.features,
  contradictions: s.contradictions,
  source_refs: s.sources,
  matching_attributes: s.features,
  evidence: s.evidence,
  verification_state: s.state,
  last_evaluated_at: '2026-09-06T09:00:00Z',
  verified_by: null,
  verified_at: null,
  rejection_reason: null,
  metadata: { tier: s.linkageScore >= 0.8 ? 'TIER1_STRONG_IDENTIFIER' : 'TIER3_NAME_ATTRIBUTE_SIMILARITY' },
  created_at: '2026-09-06T09:00:00Z',
  updated_at: '2026-09-06T09:00:00Z',
});

export const mockEntityResolutionCandidates: EntityResolutionCandidate[] = [
  buildCandidate({
    id: 'res-p20-001',
    entityId1: 'ent-person-001',
    entityId2: 'ent-phone-001',
    entityName1: 'Rahul Kumar',
    entityName2: '+91 98765 43210',
    entityType1: 'person',
    entityType2: 'phone',
    confidence: 'HIGH',
    linkageScore: 0.85,
    method: 'auto',
    features: [
      phoneFeature('+91 98765 43210', '+91 98765 43210'),
      nameFeature('Rahul Kumar', 'Rahul Kumar', 'NAME_EXACT'),
    ],
    contradictions: [],
    sources: [sourceFir('Rahul Kumar'), sourceCdr('+91 98765 43210')],
    evidence: ['FIR-2026-001 / R2', 'cdr_extract.csv #2241'],
    state: 'auto_resolved',
  }),
  buildCandidate({
    id: 'res-p20-002',
    entityId1: 'ent-person-001',
    entityId2: 'ent-account-001',
    entityName1: 'Rahul Kumar',
    entityName2: '7731 0029 4567',
    entityType1: 'person',
    entityType2: 'account',
    confidence: 'LOW',
    linkageScore: 0.27,
    method: 'auto',
    features: [nameFeature('Rahul Kumar', 'Rahul Kumar', 'NAME_EXACT')],
    contradictions: [],
    sources: [sourceFir('Rahul Kumar'), sourceBank('Rahul Kumar')],
    evidence: ['FIR-2026-001 / R2', 'btr-2026-001'],
    state: 'possible',
  }),
  buildCandidate({
    id: 'res-p20-003',
    entityId1: 'ent-phone-001',
    entityId2: 'ent-account-001',
    entityName1: '+91 98765 43210',
    entityName2: '7731 0029 4567',
    entityType1: 'phone',
    entityType2: 'account',
    confidence: 'LOW',
    linkageScore: 0.27,
    method: 'auto',
    features: [nameFeature('Rahul Kumar', 'Rahul Kumar', 'NAME_EXACT')],
    contradictions: [],
    sources: [sourceCdr('Rahul Kumar'), sourceBank('Rahul Kumar')],
    evidence: ['cdr_extract.csv #2241', 'btr-2026-001'],
    state: 'possible',
  }),
  buildCandidate({
    id: 'res-p20-004',
    entityId1: 'ent-person-006',
    entityId2: 'ent-person-001',
    entityName1: 'R. Kumar',
    entityName2: 'Rahul Kumar',
    entityType1: 'person',
    entityType2: 'person',
    confidence: 'HIGH',
    linkageScore: 0.85,
    method: 'auto',
    features: [
      phoneFeature('+91 98765 43210', '+91 98765 43210'),
      nameEditFeature('R. Kumar', 'Rahul Kumar'),
    ],
    contradictions: [],
    sources: [sourceCdr('R. Kumar'), sourceFir('Rahul Kumar')],
    evidence: ['cdr_extract.csv #2241', 'FIR-2026-001 / R2'],
    state: 'auto_resolved',
  }),
];