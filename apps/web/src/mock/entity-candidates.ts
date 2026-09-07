import type { CandidateStatus, EntityCandidate, ExtractionMethod, ResolutionState } from '@trinetra-pulse/types';

// ============================================================
// MOCK — ENTITY CANDIDATES
// Extracted-but-not-yet-confirmed entity mentions.
// ============================================================

interface Seed {
  id: string;
  entityType: EntityCandidate['entityType'];
  rawValue: string;
  displayValue?: string;
  source: string;
  sourceRecord: string;
  sourceDocument?: string;
  datasetId: string;
  datasetName: string;
  confidence: number;
  extractionMethod: ExtractionMethod;
  attributes?: Record<string, unknown>;
  status: CandidateStatus;
  resolutionState?: ResolutionState;
  resolvedEntityId?: string;
  createdAt: string;
}

const build = (s: Seed): EntityCandidate => {
  // Lightweight normalization approximation for the mock layer.
  const lower = s.rawValue.toLowerCase().replace(/[^a-z0-9+\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    id: s.id,
    entityType: s.entityType,
    rawValue: s.rawValue,
    normalizedValue: lower,
    displayValue: s.displayValue ?? s.rawValue,
    source: s.source,
    sourceRecord: s.sourceRecord,
    sourceDocument: s.sourceDocument,
    datasetId: s.datasetId,
    datasetName: s.datasetName,
    confidence: s.confidence,
    extractionMethod: s.extractionMethod,
    attributes: s.attributes ?? {},
    status: s.status,
    resolutionState: s.resolutionState,
    resolvedEntityId: s.resolvedEntityId,
    createdAt: s.createdAt,
  };
};

export const mockEntityCandidates: EntityCandidate[] = [
  build({
    id: 'cand-001',
    entityType: 'person',
    rawValue: 'Rahul Kumar',
    source: 'FIR-2026-001',
    sourceRecord: 'FIR-2026-001 / R2',
    sourceDocument: 'FIR-2026-001 Scan',
    datasetId: 'ds-001',
    datasetName: 'FIR Records - Pune District',
    confidence: 0.94,
    extractionMethod: 'STRUCTURED_MAPPING',
    attributes: {
      full_name: 'Rahul Kumar',
      phone: '+91 98765 43210',
      location: 'Chennai',
      address: '42, Nungambakkam High Rd, Chennai',
    },
    status: 'ACCEPTED',
    resolutionState: 'CONFIRMED',
    resolvedEntityId: 'ent-person-001',
    createdAt: '2026-08-18T10:12:00Z',
  }),
  build({
    id: 'cand-002',
    entityType: 'person',
    rawValue: 'R. Kumar',
    displayValue: 'R. Kumar',
    source: 'CDR Extract - Operation clean',
    sourceRecord: 'cdr_extract.csv #2241',
    datasetId: 'ds-002',
    datasetName: 'CDR Extract - Operation clean',
    confidence: 0.79,
    extractionMethod: 'REGEX',
    attributes: {
      full_name: 'R. Kumar',
      phone: '+91 98765 43210',
      location: 'Chennai',
    },
    status: 'PENDING',
    resolutionState: 'NEEDS_REVIEW',
    createdAt: '2026-08-22T12:20:00Z',
  }),
  build({
    id: 'cand-003',
    entityType: 'phone',
    rawValue: '09876543210',
    displayValue: '+91 98765 43210',
    source: 'Bank Transaction Log',
    sourceRecord: 'transactions_flagged_aug2026.xlsx row 481',
    datasetId: 'ds-003',
    datasetName: 'Bank Transaction Log',
    confidence: 0.97,
    extractionMethod: 'STRUCTURED_MAPPING',
    attributes: {
      phone_number: '09876543210',
      holder: 'Rahul Kumar',
    },
    status: 'ACCEPTED',
    resolutionState: 'CONFIRMED',
    resolvedEntityId: 'ent-phone-001',
    createdAt: '2026-08-23T09:00:00Z',
  }),
  build({
    id: 'cand-004',
    entityType: 'vehicle',
    rawValue: 'mh14 bx 2231',
    displayValue: 'MH 14 BX 2231',
    source: 'Vehicle Tracking Data',
    sourceRecord: 'vehicle_tracking_mh.csv row 1202',
    datasetId: 'ds-004',
    datasetName: 'Vehicle Tracking Data',
    confidence: 0.93,
    extractionMethod: 'REGEX',
    attributes: {
      vehicle_number: 'mh14 bx 2231',
      owner: 'Rahul Kumar',
      location: 'Chennai',
    },
    status: 'ACCEPTED',
    resolutionState: 'CONFIRMED',
    resolvedEntityId: 'ent-vehicle-001',
    createdAt: '2026-08-18T10:25:00Z',
  }),
  build({
    id: 'cand-005',
    entityType: 'organization',
    rawValue: 'Mumbai Trading Corporation',
    displayValue: 'Mumbai Trading Corp',
    source: 'FIR-2026-001',
    sourceRecord: 'FIR-2026-001 / R9',
    datasetId: 'ds-001',
    datasetName: 'FIR Records - Pune District',
    confidence: 0.86,
    extractionMethod: 'RULE_BASED',
    attributes: {
      legal_name: 'Mumbai Trading Corporation Pvt Ltd',
      location: 'Mumbai',
    },
    status: 'PENDING',
    createdAt: '2026-08-20T13:10:00Z',
  }),
  build({
    id: 'cand-006',
    entityType: 'person',
    rawValue: 'Priya Sharma',
    source: 'FIR-2026-001',
    sourceRecord: 'FIR-2026-001 / R5',
    datasetId: 'ds-001',
    datasetName: 'FIR Records - Pune District',
    confidence: 0.95,
    extractionMethod: 'STRUCTURED_MAPPING',
    attributes: {
      full_name: 'Priya Sharma',
      phone: '+91 90210 11345',
      organization: 'Mumbai Trading Corp',
    },
    status: 'ACCEPTED',
    resolutionState: 'CONFIRMED',
    resolvedEntityId: 'ent-person-002',
    createdAt: '2026-08-18T10:14:00Z',
  }),
  build({
    id: 'cand-007',
    entityType: 'account',
    rawValue: '773100294567',
    displayValue: '7731 0029 4567',
    source: 'Bank Transaction Log',
    sourceRecord: 'transactions_flagged_aug2026.xlsx row 132',
    datasetId: 'ds-003',
    datasetName: 'Bank Transaction Log',
    confidence: 0.98,
    extractionMethod: 'STRUCTURED_MAPPING',
    attributes: {
      account_number: '773100294567',
      bank: 'HDFC Bank',
      holder: 'Rahul Kumar',
    },
    status: 'ACCEPTED',
    resolutionState: 'CONFIRMED',
    resolvedEntityId: 'ent-account-001',
    createdAt: '2026-08-20T10:00:00Z',
  }),
  build({
    id: 'cand-008',
    entityType: 'transaction',
    rawValue: 'TXN-2026-0482',
    source: 'Bank Transaction Log',
    sourceRecord: 'transactions_flagged_aug2026.xlsx row 132',
    datasetId: 'ds-003',
    datasetName: 'Bank Transaction Log',
    confidence: 0.99,
    extractionMethod: 'STRUCTURED_MAPPING',
    attributes: {
      transaction_id: 'TXN-2026-0482',
      amount: '480000',
      date: '2026-02-14',
    },
    status: 'ACCEPTED',
    resolutionState: 'CONFIRMED',
    resolvedEntityId: 'ent-txn-001',
    createdAt: '2026-08-20T11:00:00Z',
  }),
  build({
    id: 'cand-009',
    entityType: 'location',
    rawValue: 'Chennai',
    source: 'Cell Tower Data',
    sourceRecord: 'celltower_pune_mumbai.json bucket 4',
    datasetId: 'ds-006',
    datasetName: 'Cell Tower Data',
    confidence: 0.9,
    extractionMethod: 'RULE_BASED',
    attributes: {
      city: 'Chennai',
      locality: 'Nungambakkam',
    },
    status: 'PENDING',
    createdAt: '2026-08-21T14:30:00Z',
  }),
  build({
    id: 'cand-010',
    entityType: 'person',
    rawValue: 'Vikram Patel',
    source: 'CDR Extract - Operation clean',
    sourceRecord: 'cdr_extract.csv #4470',
    datasetId: 'ds-002',
    datasetName: 'CDR Extract - Operation clean',
    confidence: 0.88,
    extractionMethod: 'REGEX',
    attributes: {
      full_name: 'Vikram Patel',
      phone: '+91 98111 22334',
      location: 'Pune',
    },
    status: 'REVIEWED',
    resolutionState: 'PROBABLE',
    resolvedEntityId: 'ent-person-003',
    createdAt: '2026-08-19T08:40:00Z',
  }),
  build({
    id: 'cand-011',
    entityType: 'person',
    rawValue: 'Amit Singh',
    source: 'Vehicle Tracking Data',
    sourceRecord: 'vehicle_tracking_mh.csv row 331',
    datasetId: 'ds-004',
    datasetName: 'Vehicle Tracking Data',
    confidence: 0.7,
    extractionMethod: 'RULE_BASED',
    attributes: {
      full_name: 'Amit Singh',
      location: 'Pune',
    },
    status: 'REVIEWED',
    resolutionState: 'POSSIBLE',
    resolvedEntityId: 'ent-person-004',
    createdAt: '2026-08-20T11:30:00Z',
  }),
  build({
    id: 'cand-012',
    entityType: 'document',
    rawValue: 'FIR-2026-001 Scan',
    source: 'FIR Records - Pune District',
    sourceRecord: 'fir_pune_q1_2026.csv row 1',
    datasetId: 'ds-001',
    datasetName: 'FIR Records - Pune District',
    confidence: 0.96,
    extractionMethod: 'STRUCTURED_MAPPING',
    attributes: {
      document_type: 'FIR',
      case: 'FIR-2026-001',
    },
    status: 'ACCEPTED',
    resolutionState: 'CONFIRMED',
    resolvedEntityId: 'ent-doc-001',
    createdAt: '2026-08-18T09:05:00Z',
  }),
  build({
    id: 'cand-013',
    entityType: 'person',
    rawValue: 'Meera Reddy',
    source: 'Witness Statements',
    sourceRecord: 'ws_batch3_014.txt',
    sourceDocument: 'Witness Statement 014',
    datasetId: 'ds-005',
    datasetName: 'Witness Statements',
    confidence: 0.81,
    extractionMethod: 'NLP',
    attributes: {
      full_name: 'Meera Reddy',
      location: 'Chennai',
    },
    status: 'ACCEPTED',
    resolutionState: 'CONFIRMED',
    resolvedEntityId: 'ent-person-005',
    createdAt: '2026-08-21T09:00:00Z',
  }),
];

export const mockCandidateById: Map<string, EntityCandidate> = new Map(
  mockEntityCandidates.map((c) => [c.id, c])
);