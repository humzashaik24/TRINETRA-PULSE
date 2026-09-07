import type {
  EvidenceItem,
  EvidenceType,
  EvidenceStatus,
  ExtractionMethod,
  EvidenceProvenance,
  EvidenceMetadata,
  EvidenceSnippet,
  EvidenceLink,
  EvidenceTimelineEvent,
  EvidenceSupport,
  EvidenceCoverage,
  EvidenceSearchResult,
  EvidenceSearchFilters,
  EvidenceSearchParams,
  EvidenceSource,
  EvidenceCollection,
  EvidenceRetrievalResult,
  EvidenceRetrievalParams,
  RelationshipEvidenceSupport,
  FindingEvidenceSupport,
  EventEvidenceSupport,
  EntityEvidenceSummary,
} from '@trinetra-pulse/types';

// ============================================================
// PHASE 12 — MOCK EVIDENCE INTELLIGENCE
// ============================================================
// Deterministic evidence universe for INV-006 / Operation Meridian.
// Each evidence item references valid canonical entity, relationship,
// finding and event IDs from the existing mock modules.
//
// The evidence universe covers all types (DOCUMENT, FIR, REPORT,
// COMMUNICATION, TRANSACTION, VEHICLE, LOCATION, IMAGE, RECORD)
// with varied statuses and extraction methods. All data is labelled
// isDemoData: true.
//
// Evidence IDs: ev-intel-001 .. ev-intel-032
// ============================================================

const iso = (d: string) => new Date(d).toISOString();

// ------------------------------------------------------------
// Helper: provenance builder
// ------------------------------------------------------------

const prov = (
  source: string,
  sourceId: string,
  datasetId: string | undefined,
  observedAt: string,
  createdAt: string,
  version = 1,
  location?: string,
  pageSection?: string,
  recordIdentifier?: string,
  hash?: string
): EvidenceProvenance => ({
  source,
  sourceId,
  datasetId,
  observedAt: iso(observedAt),
  createdAt: iso(createdAt),
  version,
  reviewState: 'PENDING',
  location,
  pageSection,
  recordIdentifier,
  hash,
});

// ------------------------------------------------------------
// Helper: link builder
// ------------------------------------------------------------

const link = (
  targetId: string,
  targetType: EvidenceLink['targetType'],
  relationType: EvidenceLink['relationType'],
  confidence: number,
  extractionMethod: ExtractionMethod,
  timestamp: string,
  note?: string
): EvidenceLink => ({
  targetId,
  targetType,
  relationType,
  confidence,
  extractionMethod,
  timestamp: iso(timestamp),
  provenance: prov('system', 'system', undefined, timestamp, timestamp),
  note,
});

// ------------------------------------------------------------
// Helper: timeline event
// ------------------------------------------------------------

const tlEvent = (
  id: string,
  evidenceId: string,
  eventType: EvidenceTimelineEvent['eventType'],
  title: string,
  actor: string,
  timestamp: string
): EvidenceTimelineEvent => ({
  id,
  evidenceId,
  eventType,
  title,
  actor,
  timestamp: iso(timestamp),
});

// ============================================================
// MOCK EVIDENCE ITEMS
// ============================================================

export const mockEvidenceItems: EvidenceItem[] = [
  // --------------------------------------------------------
  // FIR Document
  // --------------------------------------------------------
  {
    id: 'ev-intel-001',
    title: 'FIR-2026-001 — Primary case document',
    description:
      'First Information Report filed at Pune City Police Station naming Rahul Kumar and others in connection with suspected import irregularities. Foundational document for Operation Meridian.',
    evidenceType: 'FIR',
    status: 'VERIFIED',
    investigationId: 'inv-006',
    datasetId: 'ds-001',
    datasetName: 'FIR Records - Pune District',
    documentId: 'ent-doc-001',
    sourceRecord: 'FIR-2026-001',
    sourceName: 'FIR Records - Pune District',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.97,
    observedAt: '2026-02-05T09:00:00Z',
    createdAt: '2026-08-18T09:15:00Z',
    updatedAt: '2026-08-18T09:15:00Z',
    provenance: prov(
      'FIR Records - Pune District',
      'FIR-2026-001',
      'ds-001',
      '2026-02-05T09:00:00Z',
      '2026-08-18T09:15:00Z',
      1,
      'Pune City Police Station',
      'Page 1–3',
      'FIR-2026-001',
      'sha256:a1b2c3d4e5f6'
    ),
    metadata: {
      mimeType: 'application/pdf',
      fileSize: 245760,
      pageCount: 3,
      document: {
        documentType: 'FIR',
        author: 'Sub-Inspector Patil',
        issuer: 'Pune City Police Station',
        classification: 'OFFICIAL',
      },
    },
    snippet: {
      text: 'FIR No. 2026/001 under Sections 420, 468, 471 IPC. Named accused: Rahul Kumar s/o Mahesh Kumar, age 38, resident of Pune. Alleged offences relating to fraudulent import documentation and forged certificates.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'IDENTIFIES', 0.97, 'STRUCTURED_MAPPING', '2026-02-05T09:00:00Z', 'Named accused in FIR'),
      link('ent-person-003', 'entity', 'MENTIONS', 0.85, 'STRUCTURED_MAPPING', '2026-02-05T09:00:00Z', 'Referenced as associate'),
      link('ent-case-001', 'entity', 'REFERENCES', 0.99, 'STRUCTURED_MAPPING', '2026-02-05T09:00:00Z', 'Primary case document'),
      link('inf-006-1', 'finding', 'SUPPORTS', 0.9, 'MANUAL', '2026-08-24T09:00:00Z', 'Supports device association finding'),
      link('event-003', 'event', 'REFERENCES', 0.95, 'STRUCTURED_MAPPING', '2026-02-05T09:00:00Z', 'Summoned event'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-001', 'ev-intel-001', 'created', 'FIR ingested into system', 'system', '2026-08-18T09:15:00Z'),
      tlEvent('evt-002', 'ev-intel-001', 'linked', 'Linked to Rahul Kumar', 'Inspector Mehta', '2026-08-18T09:16:00Z'),
      tlEvent('evt-003', 'ev-intel-001', 'reviewed', 'Verified by Inspector Mehta', 'Inspector Mehta', '2026-08-20T10:00:00Z'),
    ],
    isDemoData: true,
    tags: ['fir', 'primary', 'case-document', 'rahul-kumar'],
  },

  // --------------------------------------------------------
  // CDR Communication Records
  // --------------------------------------------------------
  {
    id: 'ev-intel-002',
    title: 'CDR extract — primary device subscriber',
    description:
      'Call detail record extract from Operation Clean CDR dataset. Subscriber records associate +91 98765 43210 with Rahul Kumar.',
    evidenceType: 'COMMUNICATION',
    status: 'VERIFIED',
    investigationId: 'inv-006',
    datasetId: 'ds-002',
    datasetName: 'CDR Extract - Operation Clean',
    sourceRecord: 'cdr_extract.csv #2241',
    sourceName: 'CDR Extract - Operation Clean',
    extractionMethod: 'REGEX',
    extractionConfidence: 0.95,
    observedAt: '2026-02-18T12:20:00Z',
    createdAt: '2026-08-19T09:20:00Z',
    updatedAt: '2026-08-19T09:20:00Z',
    provenance: prov(
      'CDR Extract - Operation Clean',
      'cdr_extract.csv #2241',
      'ds-002',
      '2026-02-18T12:20:00Z',
      '2026-08-19T09:20:00Z',
      1,
      undefined,
      undefined,
      'CDR-2241',
      'sha256:b2c3d4e5f6a7'
    ),
    metadata: {
      participants: [
        { role: 'sender', identifier: '+91 98765 43210', name: 'Rahul Kumar' },
        { role: 'recipient', identifier: '+91 99212 55667', name: 'Vikram Patel' },
      ],
    },
    snippet: {
      text: 'CDR extract row 2241: Subscriber +91 98765 43210, registered name Rahul Kumar, 29 outgoing calls in 90-minute window to +91 99212 55667 on 2026-02-18.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'IDENTIFIES', 0.95, 'REGEX', '2026-02-18T12:20:00Z', 'Subscriber identified'),
      link('ent-phone-001', 'entity', 'REFERENCES', 0.98, 'REGEX', '2026-02-18T12:20:00Z', 'Primary device'),
      link('ent-person-003', 'entity', 'MENTIONS', 0.82, 'REGEX', '2026-02-18T12:20:00Z', 'Recipient number'),
      link('rel-001', 'relationship', 'SUPPORTS', 0.95, 'REGEX', '2026-02-18T12:20:00Z', 'Supports USES relationship'),
      link('rel-003', 'relationship', 'SUPPORTS', 0.8, 'RULE_BASED', '2026-02-18T12:20:00Z', 'Supports KNOWS relationship'),
      link('inf-006-1', 'finding', 'SUPPORTS', 0.92, 'ANALYTICAL', '2026-08-24T09:00:00Z', 'Primary evidence for device association finding'),
      link('event-004', 'event', 'REFERENCES', 0.91, 'REGEX', '2026-02-18T14:00:00Z', 'Communication spike event'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-004', 'ev-intel-002', 'created', 'CDR extract ingested', 'system', '2026-08-19T09:20:00Z'),
      tlEvent('evt-005', 'ev-intel-002', 'linked', 'Linked to primary device', 'Analyst Singh', '2026-08-19T09:25:00Z'),
    ],
    isDemoData: true,
    tags: ['cdr', 'communication', 'subscriber', 'rahul-kumar'],
  },

  // --------------------------------------------------------
  // Bank Transaction Log
  // --------------------------------------------------------
  {
    id: 'ev-intel-003',
    title: 'Bank transaction — flagged transfer',
    description:
      'Transaction record from bank log. Account 773100294567 linked to Rahul Kumar flagged for ₹4,80,000 transfer to corporate account 884511900221.',
    evidenceType: 'TRANSACTION',
    status: 'VERIFIED',
    investigationId: 'inv-006',
    datasetId: 'ds-003',
    datasetName: 'Bank Transaction Log',
    sourceRecord: 'transactions_flagged_aug2026.xlsx row 132',
    sourceName: 'Bank Transaction Log',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.98,
    observedAt: '2026-02-14T11:05:00Z',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
    provenance: prov(
      'Bank Transaction Log',
      'transactions_flagged_aug2026.xlsx row 132',
      'ds-003',
      '2026-02-14T11:05:00Z',
      '2026-08-20T10:00:00Z',
      1,
      undefined,
      undefined,
      'TXN-2026-0482',
      'sha256:c3d4e5f6a7b8'
    ),
    metadata: {
      financial: {
        amount: 480000,
        currency: 'INR',
        senderAccount: '773100294567',
        receiverAccount: '884511900221',
        reference: 'TXN-2026-0482',
      },
    },
    snippet: {
      text: 'Transaction TXN-2026-0482: ₹4,80,000.00 transferred from account 773100294567 (Rahul Kumar) to account 884511900221 (Mumbai Trading Corp) on 2026-02-14 at 11:05 IST. Flagged: round amount above pattern threshold.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'IDENTIFIES', 0.98, 'STRUCTURED_MAPPING', '2026-02-14T11:05:00Z', 'Sender identified'),
      link('ent-account-001', 'entity', 'REFERENCES', 0.99, 'STRUCTURED_MAPPING', '2026-02-14T11:05:00Z', 'Source account'),
      link('ent-txn-001', 'entity', 'REFERENCES', 0.99, 'STRUCTURED_MAPPING', '2026-02-14T11:05:00Z', 'Transaction record'),
      link('ent-org-001', 'entity', 'MENTIONS', 0.95, 'STRUCTURED_MAPPING', '2026-02-14T11:05:00Z', 'Destination company'),
      link('rel-008', 'relationship', 'SUPPORTS', 0.99, 'STRUCTURED_MAPPING', '2026-02-14T11:05:00Z', 'Supports SENT_TRANSACTION relationship'),
      link('inf-006-2', 'finding', 'SUPPORTS', 0.88, 'ANALYTICAL', '2026-08-25T10:00:00Z', 'Supports company relationship finding'),
      link('event-002', 'event', 'REFERENCES', 0.98, 'STRUCTURED_MAPPING', '2026-02-14T11:05:00Z', 'Large transfer event'),
      link('event-009', 'event', 'REFERENCES', 0.99, 'STRUCTURED_MAPPING', '2026-02-14T11:05:00Z', 'Suspicious transfer flagged'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-006', 'ev-intel-003', 'created', 'Transaction ingested', 'system', '2026-08-20T10:00:00Z'),
      tlEvent('evt-007', 'ev-intel-003', 'linked', 'Linked to Rahul Kumar and Mumbai Trading Corp', 'Inspector Mehta', '2026-08-20T10:05:00Z'),
    ],
    isDemoData: true,
    tags: ['transaction', 'financial', 'flagged', 'rahul-kumar', 'mumbai-trading-corp'],
  },

  // --------------------------------------------------------
  // Vehicle Registration
  // --------------------------------------------------------
  {
    id: 'ev-intel-004',
    title: 'Vehicle registration — MH 14 BX 2231',
    description:
      'Vehicle registration database entry for MH 14 BX 2231 registered under Rahul Kumar.',
    evidenceType: 'VEHICLE',
    status: 'VERIFIED',
    investigationId: 'inv-006',
    datasetId: 'ds-004',
    datasetName: 'Vehicle Tracking Data',
    sourceRecord: 'vehicle_tracking_mh.csv row 1202',
    sourceName: 'Vehicle Tracking Data',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.96,
    observedAt: '2026-01-15T00:00:00Z',
    createdAt: '2026-08-18T10:25:00Z',
    updatedAt: '2026-08-18T10:25:00Z',
    provenance: prov(
      'Vehicle Tracking Data',
      'vehicle_tracking_mh.csv row 1202',
      'ds-004',
      '2026-01-15T00:00:00Z',
      '2026-08-18T10:25:00Z',
      1,
      'MH RTO',
      undefined,
      'MH-14-BX-2231',
      'sha256:d4e5f6a7b8c9'
    ),
    metadata: {
      vehicle: {
        registrationNumber: 'MH 14 BX 2231',
        make: 'Maruti Suzuki',
        model: 'Swift Dzire',
        year: 2021,
        color: 'White',
      },
    },
    snippet: {
      text: 'Vehicle MH 14 BX 2231, Maruti Swift Dzire 2021, White, registered to Rahul Kumar, Pune address.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'IDENTIFIES', 0.96, 'STRUCTURED_MAPPING', '2026-01-15T00:00:00Z', 'Owner identified'),
      link('ent-vehicle-001', 'entity', 'REFERENCES', 0.99, 'STRUCTURED_MAPPING', '2026-01-15T00:00:00Z', 'Vehicle record'),
      link('rel-002', 'relationship', 'SUPPORTS', 0.96, 'STRUCTURED_MAPPING', '2026-01-15T00:00:00Z', 'Supports OWNS relationship'),
      link('event-005', 'event', 'REFERENCES', 0.88, 'STRUCTURED_MAPPING', '2026-02-18T23:20:00Z', 'Cross-city movement'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-008', 'ev-intel-004', 'created', 'Vehicle registration ingested', 'system', '2026-08-18T10:25:00Z'),
      tlEvent('evt-009', 'ev-intel-004', 'linked', 'Linked to Rahul Kumar', 'Analyst Singh', '2026-08-18T10:30:00Z'),
    ],
    isDemoData: true,
    tags: ['vehicle', 'registration', 'rahul-kumar'],
  },

  // --------------------------------------------------------
  // GST Registration Record
  // --------------------------------------------------------
  {
    id: 'ev-intel-005',
    title: 'GST registration — Mumbai Trading Corp',
    description:
      'GST registration record for Mumbai Trading Corp confirming active registration and entity details.',
    evidenceType: 'RECORD',
    status: 'VERIFIED',
    investigationId: 'inv-006',
    datasetId: 'ds-005',
    datasetName: 'GST Registry Extract',
    sourceRecord: 'gst_registry.json #MTC-001',
    sourceName: 'GST Registry Extract',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.94,
    observedAt: '2026-02-11T10:00:00Z',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
    provenance: prov(
      'GST Registry Extract',
      'gst_registry.json #MTC-001',
      'ds-005',
      '2026-02-11T10:00:00Z',
      '2026-08-20T10:00:00Z',
      1,
      undefined,
      undefined,
      'GST-MTC-001',
      'sha256:e5f6a7b8c9d0'
    ),
    metadata: {
      document: {
        documentType: 'GST Registration',
        issuer: 'GSTN',
        classification: 'PUBLIC',
      },
    },
    snippet: {
      text: 'Mumbai Trading Corp, GSTIN 27AABCM1234F1Z5, registered address Mumbai, status Active, date of registration 2019-03-15.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-org-001', 'entity', 'IDENTIFIES', 0.94, 'STRUCTURED_MAPPING', '2026-02-11T10:00:00Z', 'Company identified'),
      link('inf-006-2', 'finding', 'SUPPORTS', 0.85, 'MANUAL', '2026-08-25T10:00:00Z', 'Supports company relationship finding'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-010', 'ev-intel-005', 'created', 'GST record ingested', 'system', '2026-08-20T10:00:00Z'),
    ],
    isDemoData: true,
    tags: ['gst', 'record', 'organization', 'mumbai-trading-corp'],
  },

  // --------------------------------------------------------
  // Cell Tower Aggregation
  // --------------------------------------------------------
  {
    id: 'ev-intel-006',
    title: 'Cell tower aggregation — Chennai hub',
    description:
      'Tower aggregation data showing multiple target devices co-located at Chennai hub within a 2-hour window.',
    evidenceType: 'LOCATION',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-006',
    datasetName: 'Cell Tower Aggregation',
    sourceRecord: 'tower_agg_chennai_20260219.csv',
    sourceName: 'Cell Tower Aggregation',
    extractionMethod: 'ANALYTICAL',
    extractionConfidence: 0.86,
    observedAt: '2026-02-19T18:40:00Z',
    createdAt: '2026-08-21T08:00:00Z',
    updatedAt: '2026-08-21T08:00:00Z',
    provenance: prov(
      'Cell Tower Aggregation',
      'tower_agg_chennai_20260219.csv',
      'ds-006',
      '2026-02-19T18:40:00Z',
      '2026-08-21T08:00:00Z',
      1,
      'Chennai Hub Tower',
      undefined,
      'TOWER-CHN-0219',
      'sha256:f6a7b8c9d0e1'
    ),
    metadata: {
      geographic: {
        latitude: 13.0827,
        longitude: 80.2707,
        address: 'Chennai Hub Tower, T. Nagar',
        area: 'Chennai',
      },
    },
    snippet: {
      text: 'Tower CHN-T-042: 4 unique IMSIs detected within 2-hour window on 2026-02-19 18:40–20:40. Two IMSIs match known target devices.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-location-001', 'entity', 'REFERENCES', 0.86, 'ANALYTICAL', '2026-02-19T18:40:00Z', 'Chennai location'),
      link('ent-person-001', 'entity', 'MENTIONS', 0.8, 'ANALYTICAL', '2026-02-19T18:40:00Z', 'Device co-location'),
      link('event-001', 'event', 'REFERENCES', 0.86, 'ANALYTICAL', '2026-02-19T18:40:00Z', 'Coordination meeting event'),
      link('event-006', 'event', 'REFERENCES', 0.86, 'ANALYTICAL', '2026-02-19T18:40:00Z', 'Meeting — Chennai Hub'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-011', 'ev-intel-006', 'created', 'Tower aggregation computed', 'system', '2026-08-21T08:00:00Z'),
    ],
    isDemoData: true,
    tags: ['location', 'tower', 'chennai', 'co-location'],
  },

  // --------------------------------------------------------
  // CDR Frequency Analysis
  // --------------------------------------------------------
  {
    id: 'ev-intel-007',
    title: 'CDR frequency cluster — Rahul–Vikram',
    description:
      'Frequency analysis of CDR records showing high-frequency contact pattern between Rahul Kumar and Vikram Patel.',
    evidenceType: 'COMMUNICATION',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-002',
    datasetName: 'CDR Extract - Operation Clean',
    sourceRecord: 'cdr_frequency_cluster_7.csv',
    sourceName: 'CDR Extract - Operation Clean',
    extractionMethod: 'ANALYTICAL',
    extractionConfidence: 0.84,
    observedAt: '2026-02-17T20:15:00Z',
    createdAt: '2026-08-22T09:00:00Z',
    updatedAt: '2026-08-22T09:00:00Z',
    provenance: prov(
      'CDR Extract - Operation Clean',
      'cdr_frequency_cluster_7.csv',
      'ds-002',
      '2026-02-17T20:15:00Z',
      '2026-08-22T09:00:00Z',
      1,
      undefined,
      undefined,
      'CDR-CLUSTER-7',
      'sha256:a7b8c9d0e1f2'
    ),
    metadata: {},
    snippet: {
      text: 'Frequency cluster 7: +91 98765 43210 ↔ +91 99212 55667, 47 calls in 14 days, average 3.4 calls/day, peak window 20:00–22:00 IST.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'MENTIONS', 0.84, 'ANALYTICAL', '2026-02-17T20:15:00Z', 'Caller'),
      link('ent-person-003', 'entity', 'MENTIONS', 0.84, 'ANALYTICAL', '2026-02-17T20:15:00Z', 'Recipient'),
      link('rel-003', 'relationship', 'SUPPORTS', 0.84, 'ANALYTICAL', '2026-02-17T20:15:00Z', 'Supports KNOWS relationship'),
      link('event-008', 'event', 'REFERENCES', 0.84, 'ANALYTICAL', '2026-02-17T20:15:00Z', 'Repeated contact event'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-012', 'ev-intel-007', 'created', 'Frequency analysis computed', 'system', '2026-08-22T09:00:00Z'),
    ],
    isDemoData: true,
    tags: ['cdr', 'frequency', 'communication', 'rahul-kumar', 'vikram-patel'],
  },

  // --------------------------------------------------------
  // Witness Statement
  // --------------------------------------------------------
  {
    id: 'ev-intel-008',
    title: 'Witness statement 014 — import observation',
    description:
      'Witness statement recorded during the earlier probe describing import observation at Pune warehouse.',
    evidenceType: 'DOCUMENT',
    status: 'REQUIRES_REVIEW',
    investigationId: 'inv-006',
    sourceRecord: 'WS-014-2026',
    sourceName: 'Witness Statements Collection',
    extractionMethod: 'MANUAL',
    extractionConfidence: 0.72,
    observedAt: '2026-06-03T09:00:00Z',
    createdAt: '2026-08-23T10:00:00Z',
    updatedAt: '2026-08-23T10:00:00Z',
    provenance: prov(
      'Witness Statements Collection',
      'WS-014-2026',
      undefined,
      '2026-06-03T09:00:00Z',
      '2026-08-23T10:00:00Z',
      1,
      'Pune Warehouse',
      undefined,
      'WS-014',
      'sha256:b8c9d0e1f2a3'
    ),
    metadata: {
      document: {
        documentType: 'Witness Statement',
        author: 'Unknown witness',
        classification: 'CONFIDENTIAL',
      },
    },
    snippet: {
      text: 'Statement describes regular evening activity at Pune warehouse involving white sedan (matching MH 14 BX 2231 description) and 2–3 individuals.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'MENTIONS', 0.65, 'MANUAL', '2026-06-03T09:00:00Z', 'Vehicle description matches'),
      link('ent-vehicle-001', 'entity', 'MENTIONS', 0.6, 'MANUAL', '2026-06-03T09:00:00Z', 'Vehicle description'),
      link('ent-location-002', 'entity', 'REFERENCES', 0.7, 'MANUAL', '2026-06-03T09:00:00Z', 'Pune location'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-013', 'ev-intel-008', 'created', 'Statement recorded', 'Inspector Mehta', '2026-06-03T09:00:00Z'),
      tlEvent('evt-014', 'ev-intel-008', 'reviewed', 'Pending review', 'system', '2026-08-23T10:00:00Z'),
    ],
    isDemoData: true,
    tags: ['witness', 'document', 'warehouse', 'vehicle'],
  },

  // --------------------------------------------------------
  // Image — surveillance photo
  // --------------------------------------------------------
  {
    id: 'ev-intel-009',
    title: 'Surveillance photo — Pune warehouse',
    description:
      'Photograph taken during surveillance of the Pune warehouse showing vehicle MH 14 BX 2231.',
    evidenceType: 'IMAGE',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    sourceRecord: 'SURV-PUNE-2026-003',
    sourceName: 'Surveillance Records',
    extractionMethod: 'MANUAL',
    extractionConfidence: 0.88,
    observedAt: '2026-08-10T17:30:00Z',
    createdAt: '2026-08-24T08:00:00Z',
    updatedAt: '2026-08-24T08:00:00Z',
    provenance: prov(
      'Surveillance Records',
      'SURV-PUNE-2026-003',
      undefined,
      '2026-08-10T17:30:00Z',
      '2026-08-24T08:00:00Z',
      1,
      'Pune Warehouse',
      undefined,
      'SURV-003',
      'sha256:c9d0e1f2a3b4'
    ),
    metadata: {
      mimeType: 'image/jpeg',
      fileSize: 2048576,
      dimensions: { width: 4032, height: 3024 },
    },
    snippet: {
      text: 'Surveillance photograph showing white sedan (MH 14 BX 2231) parked outside Pune warehouse at 17:30 IST.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-vehicle-001', 'entity', 'REFERENCES', 0.88, 'MANUAL', '2026-08-10T17:30:00Z', 'Vehicle visible'),
      link('ent-location-002', 'entity', 'REFERENCES', 0.9, 'MANUAL', '2026-08-10T17:30:00Z', 'Location'),
      link('ev-intel-008', 'evidence', 'CONTEXTUAL', 0.75, 'MANUAL', '2026-08-24T08:00:00Z', 'Corroborates witness statement'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-015', 'ev-intel-009', 'created', 'Photo captured', 'Analyst Singh', '2026-08-10T17:30:00Z'),
      tlEvent('evt-016', 'ev-intel-009', 'linked', 'Linked to vehicle and location', 'Analyst Singh', '2026-08-24T08:05:00Z'),
    ],
    isDemoData: true,
    tags: ['image', 'surveillance', 'vehicle', 'warehouse'],
  },

  // --------------------------------------------------------
  // Additional CDR — outgoing spike
  // --------------------------------------------------------
  {
    id: 'ev-intel-010',
    title: 'CDR outgoing spike — 29 calls in 90 minutes',
    description:
      'Communication records showing unusual outgoing call spike from primary device.',
    evidenceType: 'COMMUNICATION',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-002',
    datasetName: 'CDR Extract - Operation Clean',
    sourceRecord: 'cdr_extract.csv #4401-4430',
    sourceName: 'CDR Extract - Operation Clean',
    extractionMethod: 'ANALYTICAL',
    extractionConfidence: 0.91,
    observedAt: '2026-02-18T14:00:00Z',
    createdAt: '2026-08-24T09:00:00Z',
    updatedAt: '2026-08-24T09:00:00Z',
    provenance: prov(
      'CDR Extract - Operation Clean',
      'cdr_extract.csv #4401-4430',
      'ds-002',
      '2026-02-18T14:00:00Z',
      '2026-08-24T09:00:00Z',
      1,
      undefined,
      undefined,
      'CDR-SPIKE-4401',
      'sha256:d0e1f2a3b4c5'
    ),
    metadata: {
      participants: [
        { role: 'sender', identifier: '+91 98765 43210', name: 'Rahul Kumar' },
      ],
    },
    snippet: {
      text: '29 outgoing calls from +91 98765 43210 between 14:00–15:30 IST on 2026-02-18. Calls to 2 known numbers. Unusual pattern flagged by CDR monitor.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'MENTIONS', 0.91, 'ANALYTICAL', '2026-02-18T14:00:00Z', 'Source device'),
      link('ent-phone-001', 'entity', 'REFERENCES', 0.95, 'ANALYTICAL', '2026-02-18T14:00:00Z', 'Primary device'),
      link('event-004', 'event', 'REFERENCES', 0.91, 'ANALYTICAL', '2026-02-18T14:00:00Z', 'Communication spike event'),
      link('inf-006-1', 'finding', 'SUPPORTS', 0.85, 'ANALYTICAL', '2026-08-24T09:00:00Z', 'Supports device association finding'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-017', 'ev-intel-010', 'created', 'Spike analysis computed', 'system', '2026-08-24T09:00:00Z'),
    ],
    isDemoData: true,
    tags: ['cdr', 'spike', 'communication', 'rahul-kumar'],
  },

  // --------------------------------------------------------
  // Bank transaction — secondary transfer
  // --------------------------------------------------------
  {
    id: 'ev-intel-011',
    title: 'Bank transaction — secondary transfer to Patel',
    description:
      'Smaller bank transfer from Rahul Kumar to Vikram Patel, flagged by pattern analysis.',
    evidenceType: 'TRANSACTION',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-003',
    datasetName: 'Bank Transaction Log',
    sourceRecord: 'transactions_flagged_aug2026.xlsx row 201',
    sourceName: 'Bank Transaction Log',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.92,
    observedAt: '2026-02-20T09:15:00Z',
    createdAt: '2026-08-24T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    provenance: prov(
      'Bank Transaction Log',
      'transactions_flagged_aug2026.xlsx row 201',
      'ds-003',
      '2026-02-20T09:15:00Z',
      '2026-08-24T10:00:00Z',
      1,
      undefined,
      undefined,
      'TXN-2026-0512',
      'sha256:e1f2a3b4c5d6'
    ),
    metadata: {
      financial: {
        amount: 75000,
        currency: 'INR',
        senderAccount: '773100294567',
        receiverAccount: '556789123456',
        reference: 'TXN-2026-0512',
      },
    },
    snippet: {
      text: 'Transaction TXN-2026-0512: ₹75,000 transferred from 773100294567 to 556789123456 (Vikram Patel) on 2026-02-20.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'IDENTIFIES', 0.92, 'STRUCTURED_MAPPING', '2026-02-20T09:15:00Z', 'Sender'),
      link('ent-person-003', 'entity', 'MENTIONS', 0.88, 'STRUCTURED_MAPPING', '2026-02-20T09:15:00Z', 'Receiver'),
      link('rel-003', 'relationship', 'SUPPORTS', 0.7, 'STRUCTURED_MAPPING', '2026-02-20T09:15:00Z', 'Financial link supports KNOWS'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-018', 'ev-intel-011', 'created', 'Transaction ingested', 'system', '2026-08-24T10:00:00Z'),
    ],
    isDemoData: true,
    tags: ['transaction', 'financial', 'rahul-kumar', 'vikram-patel'],
  },

  // --------------------------------------------------------
  // Vehicle GPS tracking
  // --------------------------------------------------------
  {
    id: 'ev-intel-012',
    title: 'GPS tracking — Pune to Chennai route',
    description:
      'Vehicle GPS tracking data showing Pune → Chennai overnight run by MH 14 BX 2231.',
    evidenceType: 'VEHICLE',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-004',
    datasetName: 'Vehicle Tracking Data',
    sourceRecord: 'vehicle_gps_log_20260218.csv',
    sourceName: 'Vehicle Tracking Data',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.88,
    observedAt: '2026-02-18T23:20:00Z',
    createdAt: '2026-08-25T08:00:00Z',
    updatedAt: '2026-08-25T08:00:00Z',
    provenance: prov(
      'Vehicle Tracking Data',
      'vehicle_gps_log_20260218.csv',
      'ds-004',
      '2026-02-18T23:20:00Z',
      '2026-08-25T08:00:00Z',
      1,
      'Enroute Pune–Chennai',
      undefined,
      'GPS-2231-0218',
      'sha256:f2a3b4c5d6e7'
    ),
    metadata: {
      vehicle: {
        registrationNumber: 'MH 14 BX 2231',
      },
      geographic: {
        latitude: 15.3173,
        longitude: 75.7139,
        address: 'Enroute NH48',
        area: 'Belgaum',
      },
    },
    snippet: {
      text: 'GPS log 2026-02-18: MH 14 BX 2231 departed Pune 22:45, passed Belgaum 02:30, arrived Chennai 07:15 next day.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-vehicle-001', 'entity', 'REFERENCES', 0.88, 'STRUCTURED_MAPPING', '2026-02-18T23:20:00Z', 'Vehicle tracked'),
      link('ent-person-001', 'entity', 'MENTIONS', 0.82, 'STRUCTURED_MAPPING', '2026-02-18T23:20:00Z', 'Owner'),
      link('event-005', 'event', 'REFERENCES', 0.88, 'STRUCTURED_MAPPING', '2026-02-18T23:20:00Z', 'Cross-city movement event'),
      link('ent-location-001', 'entity', 'REFERENCES', 0.75, 'STRUCTURED_MAPPING', '2026-02-19T07:15:00Z', 'Chennai destination'),
      link('ent-location-002', 'entity', 'REFERENCES', 0.8, 'STRUCTURED_MAPPING', '2026-02-18T22:45:00Z', 'Pune origin'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-019', 'ev-intel-012', 'created', 'GPS log ingested', 'system', '2026-08-25T08:00:00Z'),
    ],
    isDemoData: true,
    tags: ['vehicle', 'gps', 'tracking', 'movement', 'pune', 'chennai'],
  },

  // --------------------------------------------------------
  // Network analysis report
  // --------------------------------------------------------
  {
    id: 'ev-intel-013',
    title: 'Network analysis — Operation Clean community',
    description:
      'Community detection analysis report identifying the primary network cluster around Rahul Kumar.',
    evidenceType: 'REPORT',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    sourceRecord: 'NET-001-community-analysis',
    sourceName: 'Network Analysis Engine',
    extractionMethod: 'ANALYTICAL',
    extractionConfidence: 0.85,
    observedAt: '2026-08-23T09:05:00Z',
    createdAt: '2026-08-25T09:00:00Z',
    updatedAt: '2026-08-25T09:00:00Z',
    provenance: prov(
      'Network Analysis Engine',
      'NET-001-community-analysis',
      undefined,
      '2026-08-23T09:05:00Z',
      '2026-08-25T09:00:00Z',
      1,
      undefined,
      undefined,
      'NET-RPT-001',
      'sha256:a3b4c5d6e7f8'
    ),
    metadata: {
      document: {
        documentType: 'Analysis Report',
        issuer: 'Network Analysis Engine',
      },
    },
    snippet: {
      text: 'Community detection: 1 connected component, 6 nodes, 5 relationships. Top connected entity: ent-person-001 (Rahul Kumar) with 4 direct connections.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'REFERENCES', 0.85, 'ANALYTICAL', '2026-08-23T09:05:00Z', 'Central entity'),
      link('ent-org-001', 'entity', 'REFERENCES', 0.8, 'ANALYTICAL', '2026-08-23T09:05:00Z', 'Community member'),
      link('ent-person-003', 'entity', 'REFERENCES', 0.74, 'ANALYTICAL', '2026-08-23T09:05:00Z', 'Community member'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-020', 'ev-intel-013', 'created', 'Analysis report generated', 'system', '2026-08-25T09:00:00Z'),
    ],
    isDemoData: true,
    tags: ['network', 'analysis', 'community', 'report'],
  },

  // --------------------------------------------------------
  // Report — import documentation review
  // --------------------------------------------------------
  {
    id: 'ev-intel-014',
    title: 'Import documentation review — Meridian Freight',
    description:
      'Review report of import documentation linked to Meridian Freight showing discrepancies.',
    evidenceType: 'REPORT',
    status: 'REQUIRES_REVIEW',
    investigationId: 'inv-006',
    sourceRecord: 'IMPORT-REVIEW-2026-001',
    sourceName: 'Import Documentation Review',
    extractionMethod: 'MANUAL',
    extractionConfidence: 0.78,
    observedAt: '2026-08-20T14:00:00Z',
    createdAt: '2026-08-25T11:00:00Z',
    updatedAt: '2026-08-25T11:00:00Z',
    provenance: prov(
      'Import Documentation Review',
      'IMPORT-REVIEW-2026-001',
      undefined,
      '2026-08-20T14:00:00Z',
      '2026-08-25T11:00:00Z',
      1,
      undefined,
      undefined,
      'IMPORT-REV-001',
      'sha256:b4c5d6e7f8a9'
    ),
    metadata: {
      document: {
        documentType: 'Review Report',
        issuer: 'Analyst Singh',
        classification: 'INTERNAL',
      },
    },
    snippet: {
      text: 'Import documentation review: 3 shipments to Mumbai Trading Corp show inconsistent declared values. Cross-reference with bank transfers pending.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-org-001', 'entity', 'REFERENCES', 0.78, 'MANUAL', '2026-08-20T14:00:00Z', 'Company under review'),
      link('ent-person-001', 'entity', 'MENTIONS', 0.7, 'MANUAL', '2026-08-20T14:00:00Z', 'Linked person'),
      link('inf-006-2', 'finding', 'SUPPORTS', 0.75, 'MANUAL', '2026-08-25T11:00:00Z', 'Supports company relationship finding'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-021', 'ev-intel-014', 'created', 'Review report filed', 'Analyst Singh', '2026-08-25T11:00:00Z'),
      tlEvent('evt-022', 'ev-intel-014', 'reviewed', 'Pending review', 'system', '2026-08-25T11:00:00Z'),
    ],
    isDemoData: true,
    tags: ['import', 'report', 'review', 'meridian', 'mumbai-trading-corp'],
  },

  // --------------------------------------------------------
  // Document — forged certificate scan
  // --------------------------------------------------------
  {
    id: 'ev-intel-015',
    title: 'Forged certificate scan — import license',
    description:
      'Scanned copy of import license purportedly issued to Mumbai Trading Corp showing potential forgery markers.',
    evidenceType: 'DOCUMENT',
    status: 'REQUIRES_REVIEW',
    investigationId: 'inv-006',
    sourceRecord: 'DOC-FORGE-2026-001',
    sourceName: 'Document Forensics',
    extractionMethod: 'MANUAL',
    extractionConfidence: 0.68,
    observedAt: '2026-08-15T11:00:00Z',
    createdAt: '2026-08-25T14:00:00Z',
    updatedAt: '2026-08-25T14:00:00Z',
    provenance: prov(
      'Document Forensics',
      'DOC-FORGE-2026-001',
      undefined,
      '2026-08-15T11:00:00Z',
      '2026-08-25T14:00:00Z',
      1,
      undefined,
      'Page 1',
      'IMPORT-LIC-2026-441',
      'sha256:c5d6e7f8a9b0'
    ),
    metadata: {
      mimeType: 'image/tiff',
      fileSize: 5242880,
      pageCount: 2,
      document: {
        documentType: 'Import License',
        issuer: 'Unknown',
        classification: 'SUSPECT',
      },
    },
    snippet: {
      text: 'Import License 2026-441: Mumbai Trading Corp, issued 2026-01-10. Document shows watermarks inconsistent with known templates. Font anomalies detected.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-org-001', 'entity', 'REFERENCES', 0.68, 'MANUAL', '2026-08-15T11:00:00Z', 'Issued to company'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-023', 'ev-intel-015', 'created', 'Document scanned', 'Analyst Singh', '2026-08-25T14:00:00Z'),
      tlEvent('evt-024', 'ev-intel-015', 'reviewed', 'Pending forensic review', 'system', '2026-08-25T14:00:00Z'),
    ],
    isDemoData: true,
    tags: ['document', 'forgery', 'import', 'license', 'mumbai-trading-corp'],
  },

  // --------------------------------------------------------
  // Audio — recorded conversation
  // --------------------------------------------------------
  {
    id: 'ev-intel-016',
    title: 'Recorded conversation — warehouse discussion',
    description:
      'Audio recording from surveillance device capturing discussion about import schedule at Pune warehouse.',
    evidenceType: 'AUDIO',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    sourceRecord: 'AUDIO-2026-003',
    sourceName: 'Surveillance Records',
    extractionMethod: 'MANUAL',
    extractionConfidence: 0.7,
    observedAt: '2026-08-12T19:45:00Z',
    createdAt: '2026-08-26T08:00:00Z',
    updatedAt: '2026-08-26T08:00:00Z',
    provenance: prov(
      'Surveillance Records',
      'AUDIO-2026-003',
      undefined,
      '2026-08-12T19:45:00Z',
      '2026-08-26T08:00:00Z',
      1,
      'Pune Warehouse',
      undefined,
      'AUDIO-003',
      'sha256:d6e7f8a9b0c1'
    ),
    metadata: {
      mimeType: 'audio/wav',
      fileSize: 10485760,
      durationSeconds: 340,
    },
    snippet: {
      text: 'Audio recording (5m 40s): Two male voices discussing next shipment schedule. Reference to "Meridian" and "Tuesday delivery" audible.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-location-002', 'entity', 'REFERENCES', 0.7, 'MANUAL', '2026-08-12T19:45:00Z', 'Pune warehouse location'),
      link('ent-org-001', 'entity', 'MENTIONS', 0.65, 'MANUAL', '2026-08-12T19:45:00Z', 'Meridian reference'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-025', 'ev-intel-016', 'created', 'Audio recording captured', 'Analyst Singh', '2026-08-12T19:45:00Z'),
    ],
    isDemoData: true,
    tags: ['audio', 'surveillance', 'warehouse', 'meridian'],
  },

  // --------------------------------------------------------
  // Location log — cell tower
  // --------------------------------------------------------
  {
    id: 'ev-intel-017',
    title: 'Cell tower log — Pune cluster',
    description:
      'Cell tower data showing primary device in Pune cluster during key activity window.',
    evidenceType: 'LOCATION',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-006',
    datasetName: 'Cell Tower Aggregation',
    sourceRecord: 'tower_pune_20260210.csv',
    sourceName: 'Cell Tower Aggregation',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.82,
    observedAt: '2026-02-10T16:00:00Z',
    createdAt: '2026-08-26T09:00:00Z',
    updatedAt: '2026-08-26T09:00:00Z',
    provenance: prov(
      'Cell Tower Aggregation',
      'tower_pune_20260210.csv',
      'ds-006',
      '2026-02-10T16:00:00Z',
      '2026-08-26T09:00:00Z',
      1,
      'Pune Tower Cluster',
      undefined,
      'TOWER-PUNE-0210',
      'sha256:e7f8a9b0c1d2'
    ),
    metadata: {
      geographic: {
        latitude: 18.5204,
        longitude: 73.8567,
        address: 'Pune Tower Cluster, Kothrud',
        area: 'Pune',
      },
    },
    snippet: {
      text: 'Tower PUNE-T-018: Primary device detected in Pune Kothrud cluster 2026-02-10 16:00–18:30. Consistent with warehouse proximity.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'MENTIONS', 0.82, 'STRUCTURED_MAPPING', '2026-02-10T16:00:00Z', 'Device location'),
      link('ent-phone-001', 'entity', 'REFERENCES', 0.85, 'STRUCTURED_MAPPING', '2026-02-10T16:00:00Z', 'Primary device'),
      link('ent-location-002', 'entity', 'REFERENCES', 0.8, 'STRUCTURED_MAPPING', '2026-02-10T16:00:00Z', 'Pune location'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-026', 'ev-intel-017', 'created', 'Tower log ingested', 'system', '2026-08-26T09:00:00Z'),
    ],
    isDemoData: true,
    tags: ['location', 'tower', 'pune', 'device-location'],
  },

  // --------------------------------------------------------
  // Record — company annual filing
  // --------------------------------------------------------
  {
    id: 'ev-intel-018',
    title: 'Company annual filing — Mumbai Trading Corp',
    description:
      'Annual filing record for Mumbai Trading Corp showing directors and financial summary.',
    evidenceType: 'RECORD',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    sourceRecord: 'MCA-FILING-MTC-2025',
    sourceName: 'MCA Registry',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.91,
    observedAt: '2025-12-31T00:00:00Z',
    createdAt: '2026-08-26T10:00:00Z',
    updatedAt: '2026-08-26T10:00:00Z',
    provenance: prov(
      'MCA Registry',
      'MCA-FILING-MTC-2025',
      undefined,
      '2025-12-31T00:00:00Z',
      '2026-08-26T10:00:00Z',
      1,
      undefined,
      undefined,
      'MCA-MTC-2025',
      'sha256:f8a9b0c1d2e3'
    ),
    metadata: {
      document: {
        documentType: 'Annual Filing',
        issuer: 'MCA',
        classification: 'PUBLIC',
      },
      financial: {
        amount: 12500000,
        currency: 'INR',
      },
    },
    snippet: {
      text: 'Mumbai Trading Corp, CIN U51900MH2019PTC123456, annual turnover FY2025: ₹1.25 Cr. Directors: 2 listed.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-org-001', 'entity', 'IDENTIFIES', 0.91, 'STRUCTURED_MAPPING', '2025-12-31T00:00:00Z', 'Company record'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-027', 'ev-intel-018', 'created', 'Filing record ingested', 'system', '2026-08-26T10:00:00Z'),
    ],
    isDemoData: true,
    tags: ['record', 'company', 'filing', 'mumbai-trading-corp'],
  },

  // --------------------------------------------------------
  // Document — email correspondence
  // --------------------------------------------------------
  {
    id: 'ev-intel-019',
    title: 'Email correspondence — import schedule',
    description:
      'Recovered email discussing import schedule between Rahul Kumar and Mumbai Trading Corp.',
    evidenceType: 'COMMUNICATION',
    status: 'REQUIRES_REVIEW',
    investigationId: 'inv-006',
    sourceRecord: 'EMAIL-2026-0089',
    sourceName: 'Communications Recovery',
    extractionMethod: 'MANUAL',
    extractionConfidence: 0.73,
    observedAt: '2026-02-16T09:30:00Z',
    createdAt: '2026-08-26T11:00:00Z',
    updatedAt: '2026-08-26T11:00:00Z',
    provenance: prov(
      'Communications Recovery',
      'EMAIL-2026-0089',
      undefined,
      '2026-02-16T09:30:00Z',
      '2026-08-26T11:00:00Z',
      1,
      undefined,
      undefined,
      'EMAIL-089',
      'sha256:a9b0c1d2e3f4'
    ),
    metadata: {
      participants: [
        { role: 'sender', identifier: 'rahul.kumar@example.net', name: 'Rahul Kumar' },
        { role: 'recipient', identifier: 'admin@mumbai-trading.com', name: 'Mumbai Trading Corp' },
      ],
    },
    snippet: {
      text: 'Email from rahul.kumar@example.net to admin@mumbai-trading.com: "Schedule confirmed for Tuesday. Warehouse will be ready by 18:00. – RK"',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'IDENTIFIES', 0.73, 'MANUAL', '2026-02-16T09:30:00Z', 'Sender email'),
      link('ent-org-001', 'entity', 'REFERENCES', 0.7, 'MANUAL', '2026-02-16T09:30:00Z', 'Recipient company'),
      link('ev-intel-016', 'evidence', 'CONTEXTUAL', 0.65, 'MANUAL', '2026-08-26T11:00:00Z', 'Corroborates audio recording'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-028', 'ev-intel-019', 'created', 'Email recovered', 'Analyst Singh', '2026-08-26T11:00:00Z'),
      tlEvent('evt-029', 'ev-intel-019', 'reviewed', 'Pending review', 'system', '2026-08-26T11:00:00Z'),
    ],
    isDemoData: true,
    tags: ['email', 'communication', 'import', 'rahul-kumar', 'mumbai-trading-corp'],
  },

  // --------------------------------------------------------
  // Image — document scan
  // --------------------------------------------------------
  {
    id: 'ev-intel-020',
    title: 'Invoice scan — shipment #441',
    description:
      'Scanned invoice for shipment #441 linked to Mumbai Trading Corp import records.',
    evidenceType: 'IMAGE',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    sourceRecord: 'INV-SCAN-441',
    sourceName: 'Document Scans Collection',
    extractionMethod: 'MANUAL',
    extractionConfidence: 0.81,
    observedAt: '2026-08-08T14:00:00Z',
    createdAt: '2026-08-26T12:00:00Z',
    updatedAt: '2026-08-26T12:00:00Z',
    provenance: prov(
      'Document Scans Collection',
      'INV-SCAN-441',
      undefined,
      '2026-08-08T14:00:00Z',
      '2026-08-26T12:00:00Z',
      1,
      undefined,
      'Page 1',
      'INV-441',
      'sha256:b0c1d2e3f4a5'
    ),
    metadata: {
      mimeType: 'image/png',
      fileSize: 1024000,
      dimensions: { width: 2480, height: 3508 },
      document: {
        documentType: 'Invoice',
        issuer: 'Mumbai Trading Corp',
      },
    },
    snippet: {
      text: 'Invoice #441, Mumbai Trading Corp to unknown recipient, dated 2026-08-08, amount ₹2,30,000. Items: "industrial components".',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-org-001', 'entity', 'REFERENCES', 0.81, 'MANUAL', '2026-08-08T14:00:00Z', 'Issuing company'),
      link('ev-intel-014', 'evidence', 'CONTEXTUAL', 0.7, 'MANUAL', '2026-08-26T12:00:00Z', 'Related to import review'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-030', 'ev-intel-020', 'created', 'Invoice scanned', 'Analyst Singh', '2026-08-26T12:00:00Z'),
    ],
    isDemoData: true,
    tags: ['invoice', 'image', 'document', 'mumbai-trading-corp', 'import'],
  },

  // --------------------------------------------------------
  // Remaining evidence items for broader coverage
  // --------------------------------------------------------
  {
    id: 'ev-intel-021',
    title: 'Bank statement — account overview',
    description:
      'Full bank statement for account 773100294567 covering the investigation period.',
    evidenceType: 'RECORD',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-003',
    datasetName: 'Bank Transaction Log',
    sourceRecord: 'bank_stmt_773100294567_feb2026.pdf',
    sourceName: 'Bank Transaction Log',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.97,
    observedAt: '2026-02-28T00:00:00Z',
    createdAt: '2026-08-26T13:00:00Z',
    updatedAt: '2026-08-26T13:00:00Z',
    provenance: prov(
      'Bank Transaction Log',
      'bank_stmt_773100294567_feb2026.pdf',
      'ds-003',
      '2026-02-28T00:00:00Z',
      '2026-08-26T13:00:00Z',
      1,
      undefined,
      undefined,
      'STMT-7731-FEB',
      'sha256:c1d2e3f4a5b6'
    ),
    metadata: {
      document: {
        documentType: 'Bank Statement',
        issuer: 'HDFC Bank',
        classification: 'CONFIDENTIAL',
      },
    },
    snippet: {
      text: 'Account 773100294567, February 2026 statement: 12 debits, 8 credits. Total debits ₹7,85,000. Two flagged transactions.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-account-001', 'entity', 'REFERENCES', 0.97, 'STRUCTURED_MAPPING', '2026-02-28T00:00:00Z', 'Account statement'),
      link('ent-person-001', 'entity', 'IDENTIFIES', 0.97, 'STRUCTURED_MAPPING', '2026-02-28T00:00:00Z', 'Account holder'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-031', 'ev-intel-021', 'created', 'Statement ingested', 'system', '2026-08-26T13:00:00Z'),
    ],
    isDemoData: true,
    tags: ['bank', 'statement', 'record', 'rahul-kumar', 'account'],
  },

  // --------------------------------------------------------
  // Video — CCTV still
  // --------------------------------------------------------
  {
    id: 'ev-intel-022',
    title: 'CCTV still — warehouse entrance',
    description:
      'CCTV camera still showing vehicle entering warehouse premises on key date.',
    evidenceType: 'VIDEO',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    sourceRecord: 'CCTV-WH-2026-001',
    sourceName: 'CCTV Records',
    extractionMethod: 'MANUAL',
    extractionConfidence: 0.84,
    observedAt: '2026-08-10T17:15:00Z',
    createdAt: '2026-08-26T14:00:00Z',
    updatedAt: '2026-08-26T14:00:00Z',
    provenance: prov(
      'CCTV Records',
      'CCTV-WH-2026-001',
      undefined,
      '2026-08-10T17:15:00Z',
      '2026-08-26T14:00:00Z',
      1,
      'Pune Warehouse',
      undefined,
      'CCTV-001',
      'sha256:d2e3f4a5b6c7'
    ),
    metadata: {
      mimeType: 'video/mp4',
      fileSize: 52428800,
      durationSeconds: 120,
      dimensions: { width: 1920, height: 1080 },
    },
    snippet: {
      text: 'CCTV footage 2026-08-10 17:15: White sedan (MH 14 BX 2231) enters warehouse gate. Driver exits, enters building.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-vehicle-001', 'entity', 'REFERENCES', 0.84, 'MANUAL', '2026-08-10T17:15:00Z', 'Vehicle visible'),
      link('ent-location-002', 'entity', 'REFERENCES', 0.9, 'MANUAL', '2026-08-10T17:15:00Z', 'Warehouse location'),
      link('ev-intel-009', 'evidence', 'CONTEXTUAL', 0.8, 'MANUAL', '2026-08-26T14:00:00Z', 'Corroborates surveillance photo'),
      link('ev-intel-008', 'evidence', 'SUPPORTS', 0.75, 'MANUAL', '2026-08-26T14:00:00Z', 'Supports witness statement'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-032', 'ev-intel-022', 'created', 'CCTV still captured', 'Analyst Singh', '2026-08-26T14:00:00Z'),
    ],
    isDemoData: true,
    tags: ['video', 'cctv', 'warehouse', 'vehicle'],
  },

  // --------------------------------------------------------
  // Additional evidence items for search/faceting
  // --------------------------------------------------------
  {
    id: 'ev-intel-023',
    title: 'CDR location data — tower handoff',
    description:
      'Cell tower handoff data showing device movement pattern across Pune.',
    evidenceType: 'COMMUNICATION',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-002',
    datasetName: 'CDR Extract - Operation Clean',
    sourceRecord: 'cdr_tower_handoff_20260212.csv',
    sourceName: 'CDR Extract - Operation Clean',
    extractionMethod: 'ANALYTICAL',
    extractionConfidence: 0.79,
    observedAt: '2026-02-12T10:00:00Z',
    createdAt: '2026-08-26T15:00:00Z',
    updatedAt: '2026-08-26T15:00:00Z',
    provenance: prov(
      'CDR Extract - Operation Clean',
      'cdr_tower_handoff_20260212.csv',
      'ds-002',
      '2026-02-12T10:00:00Z',
      '2026-08-26T15:00:00Z',
      1,
      undefined,
      undefined,
      'CDR-HO-0212',
      'sha256:e3f4a5b6c7d8'
    ),
    metadata: {},
    snippet: {
      text: 'Tower handoff 2026-02-12: +91 98765 43210 moved through 3 Pune towers between 10:00–12:00.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'MENTIONS', 0.79, 'ANALYTICAL', '2026-02-12T10:00:00Z', 'Device movement'),
      link('ent-phone-001', 'entity', 'REFERENCES', 0.85, 'ANALYTICAL', '2026-02-12T10:00:00Z', 'Primary device'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-033', 'ev-intel-023', 'created', 'Handoff data computed', 'system', '2026-08-26T15:00:00Z'),
    ],
    isDemoData: true,
    tags: ['cdr', 'location', 'tower', 'handoff'],
  },

  // --------------------------------------------------------
  // Transaction — cash deposit
  // --------------------------------------------------------
  {
    id: 'ev-intel-024',
    title: 'Cash deposit — branch record',
    description:
      'Cash deposit record at Pune branch linked to Rahul Kumar account.',
    evidenceType: 'TRANSACTION',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-003',
    datasetName: 'Bank Transaction Log',
    sourceRecord: 'deposit_slip_20260209.pdf',
    sourceName: 'Bank Transaction Log',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.9,
    observedAt: '2026-02-09T11:30:00Z',
    createdAt: '2026-08-26T16:00:00Z',
    updatedAt: '2026-08-26T16:00:00Z',
    provenance: prov(
      'Bank Transaction Log',
      'deposit_slip_20260209.pdf',
      'ds-003',
      '2026-02-09T11:30:00Z',
      '2026-08-26T16:00:00Z',
      1,
      'HDFC Pune Branch',
      undefined,
      'DEP-2026-0209',
      'sha256:f4a5b6c7d8e9'
    ),
    metadata: {
      financial: {
        amount: 200000,
        currency: 'INR',
        senderAccount: '773100294567',
        reference: 'DEP-2026-0209',
      },
    },
    snippet: {
      text: 'Cash deposit ₹2,00,000 at HDFC Pune Branch on 2026-02-09. Account 773100294567. Teller record.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'IDENTIFIES', 0.9, 'STRUCTURED_MAPPING', '2026-02-09T11:30:00Z', 'Account holder'),
      link('ent-account-001', 'entity', 'REFERENCES', 0.95, 'STRUCTURED_MAPPING', '2026-02-09T11:30:00Z', 'Account'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-034', 'ev-intel-024', 'created', 'Deposit record ingested', 'system', '2026-08-26T16:00:00Z'),
    ],
    isDemoData: true,
    tags: ['transaction', 'cash', 'deposit', 'rahul-kumar'],
  },

  // --------------------------------------------------------
  // Location — cell tower aggregation 2
  // --------------------------------------------------------
  {
    id: 'ev-intel-025',
    title: 'Tower aggregation — Pune night activity',
    description:
      'Tower data showing late-night device activity near warehouse area.',
    evidenceType: 'LOCATION',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-006',
    datasetName: 'Cell Tower Aggregation',
    sourceRecord: 'tower_pune_night_20260215.csv',
    sourceName: 'Cell Tower Aggregation',
    extractionMethod: 'ANALYTICAL',
    extractionConfidence: 0.76,
    observedAt: '2026-02-15T22:00:00Z',
    createdAt: '2026-08-26T17:00:00Z',
    updatedAt: '2026-08-26T17:00:00Z',
    provenance: prov(
      'Cell Tower Aggregation',
      'tower_pune_night_20260215.csv',
      'ds-006',
      '2026-02-15T22:00:00Z',
      '2026-08-26T17:00:00Z',
      1,
      'Pune Warehouse Tower',
      undefined,
      'TOWER-PUNE-NIGHT-0215',
      'sha256:a5b6c7d8e9f0'
    ),
    metadata: {
      geographic: {
        latitude: 18.5074,
        longitude: 73.8077,
        address: 'Pune Warehouse Area',
        area: 'Pune',
      },
    },
    snippet: {
      text: 'Tower PUNE-T-022: Primary device detected near warehouse 22:00–00:30 on 2026-02-15. Late-night activity pattern.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'MENTIONS', 0.76, 'ANALYTICAL', '2026-02-15T22:00:00Z', 'Device detected'),
      link('ent-location-002', 'entity', 'REFERENCES', 0.8, 'ANALYTICAL', '2026-02-15T22:00:00Z', 'Warehouse area'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-035', 'ev-intel-025', 'created', 'Tower aggregation computed', 'system', '2026-08-26T17:00:00Z'),
    ],
    isDemoData: true,
    tags: ['location', 'tower', 'night', 'warehouse'],
  },

  // --------------------------------------------------------
  // Record — property registry
  // --------------------------------------------------------
  {
    id: 'ev-intel-026',
    title: 'Property registry — warehouse lease',
    description:
      'Property registry record showing warehouse lease to a shell entity linked to Mumbai Trading Corp.',
    evidenceType: 'RECORD',
    status: 'REQUIRES_REVIEW',
    investigationId: 'inv-006',
    sourceRecord: 'PROP-REG-WH-2026',
    sourceName: 'Property Registry',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.71,
    observedAt: '2026-01-20T00:00:00Z',
    createdAt: '2026-08-26T18:00:00Z',
    updatedAt: '2026-08-26T18:00:00Z',
    provenance: prov(
      'Property Registry',
      'PROP-REG-WH-2026',
      undefined,
      '2026-01-20T00:00:00Z',
      '2026-08-26T18:00:00Z',
      1,
      'Pune',
      undefined,
      'PROP-WH-001',
      'sha256:b6c7d8e9f0a1'
    ),
    metadata: {
      document: {
        documentType: 'Property Registry',
        issuer: 'Sub-Registrar Office Pune',
      },
    },
    snippet: {
      text: 'Warehouse premises at Pune Industrial Area leased to "Pune Logistics Pvt Ltd" (linked to Mumbai Trading Corp directors).',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-location-002', 'entity', 'REFERENCES', 0.71, 'STRUCTURED_MAPPING', '2026-01-20T00:00:00Z', 'Warehouse location'),
      link('ent-org-001', 'entity', 'MENTIONS', 0.65, 'STRUCTURED_MAPPING', '2026-01-20T00:00:00Z', 'Linked company'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-036', 'ev-intel-026', 'created', 'Registry record ingested', 'system', '2026-08-26T18:00:00Z'),
      tlEvent('evt-037', 'ev-intel-026', 'reviewed', 'Pending review', 'system', '2026-08-26T18:00:00Z'),
    ],
    isDemoData: true,
    tags: ['property', 'registry', 'warehouse', 'lease'],
  },

  // --------------------------------------------------------
  // FIR — supplementary
  // --------------------------------------------------------
  {
    id: 'ev-intel-027',
    title: 'FIR supplementary — additional accused',
    description:
      'Supplementary FIR document listing additional persons of interest.',
    evidenceType: 'FIR',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-001',
    datasetName: 'FIR Records - Pune District',
    sourceRecord: 'FIR-2026-001-SUPP',
    sourceName: 'FIR Records - Pune District',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.88,
    observedAt: '2026-03-10T09:00:00Z',
    createdAt: '2026-08-26T19:00:00Z',
    updatedAt: '2026-08-26T19:00:00Z',
    provenance: prov(
      'FIR Records - Pune District',
      'FIR-2026-001-SUPP',
      'ds-001',
      '2026-03-10T09:00:00Z',
      '2026-08-26T19:00:00Z',
      1,
      'Pune City Police Station',
      'Page 1',
      'FIR-2026-001-SUPP',
      'sha256:c7d8e9f0a1b2'
    ),
    metadata: {
      mimeType: 'application/pdf',
      fileSize: 184320,
      pageCount: 2,
      document: {
        documentType: 'FIR Supplement',
        author: 'Sub-Inspector Patil',
        issuer: 'Pune City Police Station',
      },
    },
    snippet: {
      text: 'Supplementary to FIR 2026/001: additional accused named including persons linked to Mumbai Trading Corp.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-case-001', 'entity', 'REFERENCES', 0.88, 'STRUCTURED_MAPPING', '2026-03-10T09:00:00Z', 'Case supplement'),
      link('ent-person-001', 'entity', 'REFERENCES', 0.85, 'STRUCTURED_MAPPING', '2026-03-10T09:00:00Z', 'Primary accused'),
      link('ev-intel-001', 'evidence', 'CONTEXTUAL', 0.9, 'STRUCTURED_MAPPING', '2026-08-26T19:00:00Z', 'Supplement to primary FIR'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-038', 'ev-intel-027', 'created', 'Supplement ingested', 'system', '2026-08-26T19:00:00Z'),
    ],
    isDemoData: true,
    tags: ['fir', 'supplement', 'case-document'],
  },

  // --------------------------------------------------------
  // Communication — SMS extract
  // --------------------------------------------------------
  {
    id: 'ev-intel-028',
    title: 'SMS extract — confirmation messages',
    description:
      'SMS extract showing confirmation messages between linked persons.',
    evidenceType: 'COMMUNICATION',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    datasetId: 'ds-002',
    datasetName: 'CDR Extract - Operation Clean',
    sourceRecord: 'sms_extract_20260217.csv',
    sourceName: 'CDR Extract - Operation Clean',
    extractionMethod: 'REGEX',
    extractionConfidence: 0.83,
    observedAt: '2026-02-17T08:30:00Z',
    createdAt: '2026-08-26T20:00:00Z',
    updatedAt: '2026-08-26T20:00:00Z',
    provenance: prov(
      'CDR Extract - Operation Clean',
      'sms_extract_20260217.csv',
      'ds-002',
      '2026-02-17T08:30:00Z',
      '2026-08-26T20:00:00Z',
      1,
      undefined,
      undefined,
      'SMS-2026-0217',
      'sha256:d8e9f0a1b2c3'
    ),
    metadata: {
      participants: [
        { role: 'sender', identifier: '+91 98765 43210', name: 'Rahul Kumar' },
        { role: 'recipient', identifier: '+91 99212 55667', name: 'Vikram Patel' },
      ],
    },
    snippet: {
      text: 'SMS 2026-02-17 08:30: +91 98765 43210 → +91 99212 55667: "Confirm Tuesday. 6 PM. – RK"',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'MENTIONS', 0.83, 'REGEX', '2026-02-17T08:30:00Z', 'Sender'),
      link('ent-person-003', 'entity', 'MENTIONS', 0.83, 'REGEX', '2026-02-17T08:30:00Z', 'Recipient'),
      link('rel-003', 'relationship', 'SUPPORTS', 0.75, 'REGEX', '2026-02-17T08:30:00Z', 'Communication link'),
      link('ev-intel-019', 'evidence', 'CONTEXTUAL', 0.7, 'REGEX', '2026-08-26T20:00:00Z', 'Corroborates email schedule'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-039', 'ev-intel-028', 'created', 'SMS extract ingested', 'system', '2026-08-26T20:00:00Z'),
    ],
    isDemoData: true,
    tags: ['sms', 'communication', 'confirmation'],
  },

  // --------------------------------------------------------
  // Document — shipping manifest
  // --------------------------------------------------------
  {
    id: 'ev-intel-029',
    title: 'Shipping manifest — shipment #441',
    description:
      'Shipping manifest for import shipment #441 showing declared contents.',
    evidenceType: 'DOCUMENT',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    sourceRecord: 'SHIP-MANIFEST-441',
    sourceName: 'Shipping Records',
    extractionMethod: 'MANUAL',
    extractionConfidence: 0.8,
    observedAt: '2026-08-08T10:00:00Z',
    createdAt: '2026-08-27T08:00:00Z',
    updatedAt: '2026-08-27T08:00:00Z',
    provenance: prov(
      'Shipping Records',
      'SHIP-MANIFEST-441',
      undefined,
      '2026-08-08T10:00:00Z',
      '2026-08-27T08:00:00Z',
      1,
      undefined,
      undefined,
      'MANIFEST-441',
      'sha256:e9f0a1b2c3d4'
    ),
    metadata: {
      document: {
        documentType: 'Shipping Manifest',
        issuer: 'Meridian Freight',
      },
    },
    snippet: {
      text: 'Manifest 441: Mumbai Trading Corp → Pune, 12 cartons "industrial components", declared value ₹2,30,000. Customs reference: MH-CUST-441.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-org-001', 'entity', 'REFERENCES', 0.8, 'MANUAL', '2026-08-08T10:00:00Z', 'Consignee'),
      link('ev-intel-020', 'evidence', 'CONTEXTUAL', 0.85, 'MANUAL', '2026-08-27T08:00:00Z', 'Matches invoice'),
      link('ev-intel-014', 'evidence', 'SUPPORTS', 0.75, 'MANUAL', '2026-08-27T08:00:00Z', 'Related to import review'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-040', 'ev-intel-029', 'created', 'Manifest ingested', 'Analyst Singh', '2026-08-27T08:00:00Z'),
    ],
    isDemoData: true,
    tags: ['shipping', 'manifest', 'import', 'meridian'],
  },

  // --------------------------------------------------------
  // Image — recovered phone screenshot
  // --------------------------------------------------------
  {
    id: 'ev-intel-030',
    title: 'Phone screenshot — contact list',
    description:
      'Recovered phone screenshot showing contact list with key individuals.',
    evidenceType: 'IMAGE',
    status: 'REQUIRES_REVIEW',
    investigationId: 'inv-006',
    sourceRecord: 'PHONE-RECOVERY-2026-001',
    sourceName: 'Device Recovery',
    extractionMethod: 'MANUAL',
    extractionConfidence: 0.66,
    observedAt: '2026-08-22T10:00:00Z',
    createdAt: '2026-08-27T09:00:00Z',
    updatedAt: '2026-08-27T09:00:00Z',
    provenance: prov(
      'Device Recovery',
      'PHONE-RECOVERY-2026-001',
      undefined,
      '2026-08-22T10:00:00Z',
      '2026-08-27T09:00:00Z',
      1,
      undefined,
      undefined,
      'PHONE-SCR-001',
      'sha256:f0a1b2c3d4e5'
    ),
    metadata: {
      mimeType: 'image/png',
      fileSize: 856320,
      dimensions: { width: 1080, height: 2340 },
    },
    snippet: {
      text: 'Phone screenshot: contact list showing "R.Kumar (Meridian)", "Vikram P.", "Mumbai Trading" with saved numbers.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'REFERENCES', 0.66, 'MANUAL', '2026-08-22T10:00:00Z', 'Contact entry'),
      link('ent-person-003', 'entity', 'REFERENCES', 0.65, 'MANUAL', '2026-08-22T10:00:00Z', 'Contact entry'),
      link('ent-org-001', 'entity', 'REFERENCES', 0.6, 'MANUAL', '2026-08-22T10:00:00Z', 'Company contact'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-041', 'ev-intel-030', 'created', 'Screenshot recovered', 'Analyst Singh', '2026-08-27T09:00:00Z'),
      tlEvent('evt-042', 'ev-intel-030', 'reviewed', 'Pending verification', 'system', '2026-08-27T09:00:00Z'),
    ],
    isDemoData: true,
    tags: ['image', 'phone', 'screenshot', 'contact'],
  },

  // --------------------------------------------------------
  // Report — risk assessment
  // --------------------------------------------------------
  {
    id: 'ev-intel-031',
    title: 'Risk assessment — entity profile',
    description:
      'Automated risk assessment report for Rahul Kumar based on network analysis.',
    evidenceType: 'REPORT',
    status: 'AVAILABLE',
    investigationId: 'inv-006',
    sourceRecord: 'RISK-ENT-001',
    sourceName: 'Risk Engine',
    extractionMethod: 'ANALYTICAL',
    extractionConfidence: 0.87,
    observedAt: '2026-08-26T10:10:00Z',
    createdAt: '2026-08-27T10:00:00Z',
    updatedAt: '2026-08-27T10:00:00Z',
    provenance: prov(
      'Risk Engine',
      'RISK-ENT-001',
      undefined,
      '2026-08-26T10:10:00Z',
      '2026-08-27T10:00:00Z',
      1,
      undefined,
      undefined,
      'RISK-RPT-001',
      'sha256:a1b2c3d4e5f6a7b8'
    ),
    metadata: {
      document: {
        documentType: 'Risk Report',
        issuer: 'Risk Engine',
      },
    },
    snippet: {
      text: 'Risk assessment: Rahul Kumar, score 0.78 (elevated). Factors: FIR association, financial anomalies, network centrality. Confidence: 0.87.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-person-001', 'entity', 'REFERENCES', 0.87, 'ANALYTICAL', '2026-08-26T10:10:00Z', 'Subject of assessment'),
      link('inf-006-1', 'finding', 'SUPPORTS', 0.8, 'ANALYTICAL', '2026-08-27T10:00:00Z', 'Context for findings'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-043', 'ev-intel-031', 'created', 'Risk report generated', 'system', '2026-08-27T10:00:00Z'),
    ],
    isDemoData: true,
    tags: ['report', 'risk', 'assessment', 'rahul-kumar'],
  },

  // --------------------------------------------------------
  // Record — vehicle insurance
  // --------------------------------------------------------
  {
    id: 'ev-intel-032',
    title: 'Vehicle insurance — policy record',
    description:
      'Vehicle insurance policy record for MH 14 BX 2231.',
    evidenceType: 'RECORD',
    status: 'ARCHIVED',
    investigationId: 'inv-006',
    sourceRecord: 'INS-POL-2025-2231',
    sourceName: 'Insurance Registry',
    extractionMethod: 'STRUCTURED_MAPPING',
    extractionConfidence: 0.92,
    observedAt: '2025-04-12T00:00:00Z',
    createdAt: '2026-08-27T11:00:00Z',
    updatedAt: '2026-08-27T11:00:00Z',
    provenance: prov(
      'Insurance Registry',
      'INS-POL-2025-2231',
      undefined,
      '2025-04-12T00:00:00Z',
      '2026-08-27T11:00:00Z',
      1,
      undefined,
      undefined,
      'INS-2231',
      'sha256:b2c3d4e5f6a7b8c9'
    ),
    metadata: {
      document: {
        documentType: 'Insurance Policy',
        issuer: 'ICICI Lombard',
        classification: 'PUBLIC',
      },
    },
    snippet: {
      text: 'Insurance policy INS-2025-2231: MH 14 BX 2231, owner Rahul Kumar, premium ₹12,400, valid 2025-04-12 to 2026-04-11.',
      truncated: false,
      isDemoContent: true,
    },
    links: [
      link('ent-vehicle-001', 'entity', 'REFERENCES', 0.92, 'STRUCTURED_MAPPING', '2025-04-12T00:00:00Z', 'Vehicle record'),
      link('ent-person-001', 'entity', 'IDENTIFIES', 0.92, 'STRUCTURED_MAPPING', '2025-04-12T00:00:00Z', 'Policy holder'),
    ],
    versions: [],
    timeline: [
      tlEvent('evt-044', 'ev-intel-032', 'created', 'Policy record ingested', 'system', '2026-08-27T11:00:00Z'),
      tlEvent('evt-045', 'ev-intel-032', 'status_changed', 'Archived (expired)', 'system', '2026-08-27T11:00:00Z'),
    ],
    isDemoData: true,
    tags: ['vehicle', 'insurance', 'policy', 'record'],
  },
];

// ============================================================
// MOCK EVIDENCE COLLECTIONS
// ============================================================

export const mockEvidenceCollections: EvidenceCollection[] = [
  {
    id: 'ecol-001',
    name: 'Primary financial evidence',
    description: 'Bank transactions and financial records for the investigation.',
    investigationId: 'inv-006',
    evidenceIds: ['ev-intel-003', 'ev-intel-011', 'ev-intel-021', 'ev-intel-024'],
    createdAt: iso('2026-08-20T10:00:00Z'),
    createdBy: 'Inspector Mehta',
    tags: ['financial', 'transactions'],
  },
  {
    id: 'ecol-002',
    name: 'Communication evidence',
    description: 'CDR extracts, SMS records, and email correspondence.',
    investigationId: 'inv-006',
    evidenceIds: ['ev-intel-002', 'ev-intel-007', 'ev-intel-010', 'ev-intel-019', 'ev-intel-023', 'ev-intel-028'],
    createdAt: iso('2026-08-22T09:00:00Z'),
    createdBy: 'Analyst Singh',
    tags: ['communication', 'cdr', 'sms', 'email'],
  },
  {
    id: 'ecol-003',
    name: 'Location and vehicle evidence',
    description: 'Tower aggregations, GPS tracking, and vehicle records.',
    investigationId: 'inv-006',
    evidenceIds: ['ev-intel-004', 'ev-intel-006', 'ev-intel-012', 'ev-intel-017', 'ev-intel-025'],
    createdAt: iso('2026-08-21T08:00:00Z'),
    createdBy: 'Analyst Singh',
    tags: ['location', 'vehicle', 'tracking'],
  },
];

// ============================================================
// MOCK EVIDENCE SEARCH RESULTS
// ============================================================

export const mockEvidenceSearchResult: EvidenceSearchResult = {
  items: mockEvidenceItems.map((e) => ({
    id: e.id,
    title: e.title,
    evidenceType: e.evidenceType,
    status: e.status,
    sourceName: e.sourceName,
    observedAt: e.observedAt,
    investigationId: e.investigationId,
    entityIds: e.links.filter((l) => l.targetType === 'entity').map((l) => l.targetId),
    findingIds: e.links.filter((l) => l.targetType === 'finding').map((l) => l.targetId),
    eventIds: e.links.filter((l) => l.targetType === 'event').map((l) => l.targetId),
    snippet: e.snippet,
    isDemoData: e.isDemoData,
  })),
  total: mockEvidenceItems.length,
  page: 1,
  pageSize: 32,
  totalPages: 1,
  facets: {
    evidenceTypes: {
      DOCUMENT: mockEvidenceItems.filter((e) => e.evidenceType === 'DOCUMENT').length,
      FIR: mockEvidenceItems.filter((e) => e.evidenceType === 'FIR').length,
      REPORT: mockEvidenceItems.filter((e) => e.evidenceType === 'REPORT').length,
      COMMUNICATION: mockEvidenceItems.filter((e) => e.evidenceType === 'COMMUNICATION').length,
      TRANSACTION: mockEvidenceItems.filter((e) => e.evidenceType === 'TRANSACTION').length,
      VEHICLE: mockEvidenceItems.filter((e) => e.evidenceType === 'VEHICLE').length,
      LOCATION: mockEvidenceItems.filter((e) => e.evidenceType === 'LOCATION').length,
      IMAGE: mockEvidenceItems.filter((e) => e.evidenceType === 'IMAGE').length,
      VIDEO: mockEvidenceItems.filter((e) => e.evidenceType === 'VIDEO').length,
      AUDIO: mockEvidenceItems.filter((e) => e.evidenceType === 'AUDIO').length,
      RECORD: mockEvidenceItems.filter((e) => e.evidenceType === 'RECORD').length,
      OTHER: 0,
    },
    statuses: {
      AVAILABLE: mockEvidenceItems.filter((e) => e.status === 'AVAILABLE').length,
      PROCESSING: 0,
      REQUIRES_REVIEW: mockEvidenceItems.filter((e) => e.status === 'REQUIRES_REVIEW').length,
      VERIFIED: mockEvidenceItems.filter((e) => e.status === 'VERIFIED').length,
      UNVERIFIED: 0,
      ARCHIVED: mockEvidenceItems.filter((e) => e.status === 'ARCHIVED').length,
    },
    sources: mockEvidenceItems.reduce(
      (acc, e) => {
        acc[e.sourceName] = (acc[e.sourceName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    entities: mockEvidenceItems.reduce(
      (acc, e) => {
        e.links
          .filter((l) => l.targetType === 'entity')
          .forEach((l) => {
            acc[l.targetId] = (acc[l.targetId] || 0) + 1;
          });
        return acc;
      },
      {} as Record<string, number>
    ),
  },
};

// ============================================================
// MOCK EVIDENCE RELATIONSHIP SUPPORT
// ============================================================

export const mockRelationshipEvidenceSupport: RelationshipEvidenceSupport[] = [
  {
    relationshipId: 'rel-001',
    sourceEntityId: 'ent-person-001',
    targetEntityId: 'ent-phone-001',
    evidenceIds: ['ev-intel-002'],
    supportLevel: 'SUPPORTED',
    directEvidenceCount: 1,
    contextualEvidenceCount: 0,
  },
  {
    relationshipId: 'rel-003',
    sourceEntityId: 'ent-person-001',
    targetEntityId: 'ent-person-003',
    evidenceIds: ['ev-intel-007', 'ev-intel-011', 'ev-intel-028'],
    supportLevel: 'SUPPORTED',
    directEvidenceCount: 2,
    contextualEvidenceCount: 1,
  },
  {
    relationshipId: 'rel-005',
    sourceEntityId: 'ent-person-001',
    targetEntityId: 'ent-org-001',
    evidenceIds: ['ev-intel-005', 'ev-intel-014'],
    supportLevel: 'SUPPORTED',
    directEvidenceCount: 1,
    contextualEvidenceCount: 1,
  },
  {
    relationshipId: 'rel-008',
    sourceEntityId: 'ent-person-001',
    targetEntityId: 'ent-txn-001',
    evidenceIds: ['ev-intel-003'],
    supportLevel: 'SUPPORTED',
    directEvidenceCount: 1,
    contextualEvidenceCount: 0,
  },
  {
    relationshipId: 'rel-002',
    sourceEntityId: 'ent-person-001',
    targetEntityId: 'ent-vehicle-001',
    evidenceIds: ['ev-intel-004'],
    supportLevel: 'SUPPORTED',
    directEvidenceCount: 1,
    contextualEvidenceCount: 0,
  },
];

// ============================================================
// MOCK FINDING EVIDENCE SUPPORT
// ============================================================

export const mockFindingEvidenceSupport: FindingEvidenceSupport[] = [
  {
    findingId: 'inf-006-1',
    evidenceIds: ['ev-intel-001', 'ev-intel-002', 'ev-intel-010'],
    supportLevel: 'SUPPORTED',
    evidenceItems: [
      { evidenceId: 'ev-intel-001', title: 'FIR-2026-001 — Primary case document', evidenceType: 'FIR', relevance: 0.9, provenance: mockEvidenceItems[0].provenance },
      { evidenceId: 'ev-intel-002', title: 'CDR extract — primary device subscriber', evidenceType: 'COMMUNICATION', relevance: 0.95, provenance: mockEvidenceItems[1].provenance },
      { evidenceId: 'ev-intel-010', title: 'CDR outgoing spike — 29 calls in 90 minutes', evidenceType: 'COMMUNICATION', relevance: 0.85, provenance: mockEvidenceItems[9].provenance },
    ],
  },
  {
    findingId: 'inf-006-2',
    evidenceIds: ['ev-intel-003', 'ev-intel-005', 'ev-intel-014'],
    supportLevel: 'PARTIALLY_SUPPORTED',
    evidenceItems: [
      { evidenceId: 'ev-intel-003', title: 'Bank transaction — flagged transfer', evidenceType: 'TRANSACTION', relevance: 0.88, provenance: mockEvidenceItems[2].provenance },
      { evidenceId: 'ev-intel-005', title: 'GST registration — Mumbai Trading Corp', evidenceType: 'RECORD', relevance: 0.85, provenance: mockEvidenceItems[4].provenance },
      { evidenceId: 'ev-intel-014', title: 'Import documentation review — Meridian Freight', evidenceType: 'REPORT', relevance: 0.75, provenance: mockEvidenceItems[13].provenance },
    ],
  },
];

// ============================================================
// MOCK EVENT EVIDENCE SUPPORT
// ============================================================

export const mockEventEvidenceSupport: EventEvidenceSupport[] = [
  {
    eventId: 'event-001',
    evidenceIds: ['ev-intel-006'],
    supportLevel: 'PARTIALLY_SUPPORTED',
    evidenceItems: [
      { evidenceId: 'ev-intel-006', title: 'Cell tower aggregation — Chennai hub', evidenceType: 'LOCATION', relevance: 0.86 },
    ],
  },
  {
    eventId: 'event-002',
    evidenceIds: ['ev-intel-003'],
    supportLevel: 'SUPPORTED',
    evidenceItems: [
      { evidenceId: 'ev-intel-003', title: 'Bank transaction — flagged transfer', evidenceType: 'TRANSACTION', relevance: 0.98 },
    ],
  },
  {
    eventId: 'event-004',
    evidenceIds: ['ev-intel-010'],
    supportLevel: 'SUPPORTED',
    evidenceItems: [
      { evidenceId: 'ev-intel-010', title: 'CDR outgoing spike — 29 calls in 90 minutes', evidenceType: 'COMMUNICATION', relevance: 0.91 },
    ],
  },
  {
    eventId: 'event-005',
    evidenceIds: ['ev-intel-012'],
    supportLevel: 'SUPPORTED',
    evidenceItems: [
      { evidenceId: 'ev-intel-012', title: 'GPS tracking — Pune to Chennai route', evidenceType: 'VEHICLE', relevance: 0.88 },
    ],
  },
];

// ============================================================
// MOCK ENTITY EVIDENCE SUMMARY
// ============================================================

export const mockEntityEvidenceSummaries: EntityEvidenceSummary[] = [
  {
    entityId: 'ent-person-001',
    evidenceCount: mockEvidenceItems.filter((e) =>
      e.links.some((l) => l.targetId === 'ent-person-001' && l.targetType === 'entity')
    ).length,
    byType: {
      DOCUMENT: 1, FIR: 2, REPORT: 2, COMMUNICATION: 4, TRANSACTION: 2, VEHICLE: 2, LOCATION: 2, IMAGE: 2, VIDEO: 1, AUDIO: 1, RECORD: 3, OTHER: 0,
    },
    byStatus: { AVAILABLE: 18, PROCESSING: 0, REQUIRES_REVIEW: 6, VERIFIED: 4, UNVERIFIED: 0, ARCHIVED: 1 },
    latestEvidence: {
      id: 'ev-intel-032',
      title: 'Vehicle insurance — policy record',
      evidenceType: 'RECORD',
      status: 'ARCHIVED',
      sourceName: 'Insurance Registry',
      observedAt: '2025-04-12T00:00:00Z',
      investigationId: 'inv-006',
      entityIds: ['ent-vehicle-001', 'ent-person-001'],
      findingIds: [],
      eventIds: [],
      isDemoData: true,
    },
    linkedFindingIds: ['inf-006-1', 'inf-006-2'],
    linkedRelationshipIds: ['rel-001', 'rel-003', 'rel-005', 'rel-008'],
    linkedEventIds: ['event-001', 'event-002', 'event-004', 'event-005'],
  },
  {
    entityId: 'ent-org-001',
    evidenceCount: mockEvidenceItems.filter((e) =>
      e.links.some((l) => l.targetId === 'ent-org-001' && l.targetType === 'entity')
    ).length,
    byType: {
      DOCUMENT: 0, FIR: 0, REPORT: 1, COMMUNICATION: 1, TRANSACTION: 0, VEHICLE: 0, LOCATION: 0, IMAGE: 0, VIDEO: 0, AUDIO: 0, RECORD: 2, OTHER: 0,
    },
    byStatus: { AVAILABLE: 2, PROCESSING: 0, REQUIRES_REVIEW: 2, VERIFIED: 1, UNVERIFIED: 0, ARCHIVED: 0 },
    latestEvidence: {
      id: 'ev-intel-029',
      title: 'Shipping manifest — shipment #441',
      evidenceType: 'DOCUMENT',
      status: 'AVAILABLE',
      sourceName: 'Shipping Records',
      observedAt: '2026-08-08T10:00:00Z',
      investigationId: 'inv-006',
      entityIds: ['ent-org-001'],
      findingIds: [],
      eventIds: [],
      isDemoData: true,
    },
    linkedFindingIds: ['inf-006-2'],
    linkedRelationshipIds: ['rel-005'],
    linkedEventIds: [],
  },
  {
    entityId: 'ent-person-003',
    evidenceCount: mockEvidenceItems.filter((e) =>
      e.links.some((l) => l.targetId === 'ent-person-003' && l.targetType === 'entity')
    ).length,
    byType: {
      DOCUMENT: 0, FIR: 0, REPORT: 0, COMMUNICATION: 2, TRANSACTION: 1, VEHICLE: 0, LOCATION: 0, IMAGE: 0, VIDEO: 0, AUDIO: 0, RECORD: 0, OTHER: 0,
    },
    byStatus: { AVAILABLE: 3, PROCESSING: 0, REQUIRES_REVIEW: 0, VERIFIED: 0, UNVERIFIED: 0, ARCHIVED: 0 },
    latestEvidence: {
      id: 'ev-intel-028',
      title: 'SMS extract — confirmation messages',
      evidenceType: 'COMMUNICATION',
      status: 'AVAILABLE',
      sourceName: 'CDR Extract - Operation Clean',
      observedAt: '2026-02-17T08:30:00Z',
      investigationId: 'inv-006',
      entityIds: ['ent-person-001', 'ent-person-003'],
      findingIds: [],
      eventIds: [],
      isDemoData: true,
    },
    linkedFindingIds: [],
    linkedRelationshipIds: ['rel-003'],
    linkedEventIds: [],
  },
];

// ============================================================
// MOCK EVIDENCE COVERAGE
// ============================================================

export const mockEvidenceCoverage: EvidenceCoverage[] = [
  {
    targetId: 'inf-006-1',
    targetType: 'finding',
    level: 'SUPPORTED',
    evidenceIds: ['ev-intel-001', 'ev-intel-002', 'ev-intel-010'],
    breakdown: { direct: 2, contextual: 1, total: 3 },
    assessedAt: iso('2026-08-27T12:00:00Z'),
    assessedBy: 'system',
  },
  {
    targetId: 'inf-006-2',
    targetType: 'finding',
    level: 'PARTIALLY_SUPPORTED',
    evidenceIds: ['ev-intel-003', 'ev-intel-005', 'ev-intel-014'],
    breakdown: { direct: 2, contextual: 1, total: 3 },
    gap: 'Awaiting independent corroboration of import documentation discrepancies.',
    assessedAt: iso('2026-08-27T12:00:00Z'),
    assessedBy: 'system',
  },
  {
    targetId: 'ent-person-001',
    targetType: 'entity',
    level: 'SUPPORTED',
    evidenceIds: [
      'ev-intel-001', 'ev-intel-002', 'ev-intel-003', 'ev-intel-004',
      'ev-intel-011', 'ev-intel-012', 'ev-intel-017', 'ev-intel-021',
      'ev-intel-024', 'ev-intel-028', 'ev-intel-031', 'ev-intel-032',
    ],
    breakdown: { direct: 10, contextual: 2, total: 12 },
    assessedAt: iso('2026-08-27T12:00:00Z'),
    assessedBy: 'system',
  },
  {
    targetId: 'ent-org-001',
    targetType: 'entity',
    level: 'PARTIALLY_SUPPORTED',
    evidenceIds: ['ev-intel-005', 'ev-intel-014', 'ev-intel-018', 'ev-intel-020', 'ev-intel-026', 'ev-intel-029'],
    breakdown: { direct: 4, contextual: 2, total: 6 },
    gap: 'Company ownership link to Rahul Kumar requires direct documentation.',
    assessedAt: iso('2026-08-27T12:00:00Z'),
    assessedBy: 'system',
  },
  {
    targetId: 'ent-person-003',
    targetType: 'entity',
    level: 'PARTIALLY_SUPPORTED',
    evidenceIds: ['ev-intel-002', 'ev-intel-007', 'ev-intel-011', 'ev-intel-028', 'ev-intel-030'],
    breakdown: { direct: 2, contextual: 3, total: 5 },
    gap: 'Limited direct evidence; mostly contextual through communication records.',
    assessedAt: iso('2026-08-27T12:00:00Z'),
    assessedBy: 'system',
  },
  {
    targetId: 'NET-001',
    targetType: 'network',
    level: 'PARTIALLY_SUPPORTED',
    evidenceIds: ['ev-intel-013'],
    breakdown: { direct: 1, contextual: 0, total: 1 },
    gap: 'Network-level evidence limited to analytical reports; more direct links needed.',
    assessedAt: iso('2026-08-27T12:00:00Z'),
    assessedBy: 'system',
  },
];

// ============================================================
// MOCK EVIDENCE RETRIEVAL RESULTS
// ============================================================

export const mockEvidenceRetrievalBudget = {
  maxEvidenceItems: 10,
  maxSnippetLength: 200,
  maxLinkedEntities: 6,
  maxLinkedFindings: 3,
};

// ============================================================
// LOOKUP MAPS
// ============================================================

export const mockEvidenceById = new Map<string, EvidenceItem>(
  mockEvidenceItems.map((e) => [e.id, e])
);

export const mockEvidenceByEntityId = new Map<string, EvidenceItem[]>();
mockEvidenceItems.forEach((e) => {
  e.links
    .filter((l) => l.targetType === 'entity')
    .forEach((l) => {
      const existing = mockEvidenceByEntityId.get(l.targetId) ?? [];
      existing.push(e);
      mockEvidenceByEntityId.set(l.targetId, existing);
    });
});

export const mockEvidenceByFindingId = new Map<string, EvidenceItem[]>();
mockEvidenceItems.forEach((e) => {
  e.links
    .filter((l) => l.targetType === 'finding')
    .forEach((l) => {
      const existing = mockEvidenceByFindingId.get(l.targetId) ?? [];
      existing.push(e);
      mockEvidenceByFindingId.set(l.targetId, existing);
    });
});

export const mockEvidenceByEventId = new Map<string, EvidenceItem[]>();
mockEvidenceItems.forEach((e) => {
  e.links
    .filter((l) => l.targetType === 'event')
    .forEach((l) => {
      const existing = mockEvidenceByEventId.get(l.targetId) ?? [];
      existing.push(e);
      mockEvidenceByEventId.set(l.targetId, existing);
    });
});

export const mockEvidenceByType = new Map<EvidenceType, EvidenceItem[]>();
mockEvidenceItems.forEach((e) => {
  const existing = mockEvidenceByType.get(e.evidenceType) ?? [];
  existing.push(e);
  mockEvidenceByType.set(e.evidenceType, existing);
});

export const mockEvidenceByRelationshipId = new Map<string, RelationshipEvidenceSupport>(
  mockRelationshipEvidenceSupport.map((r) => [r.relationshipId, r])
);