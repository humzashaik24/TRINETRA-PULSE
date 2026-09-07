import { buildNetwork, type NetworkSeed } from './build';

// ============================================================
// MOCK — NET-003 "SKYLINE CELL"
// ============================================================
// Compact Delhi-based call-burst observation network.
// 14 entities / 21 relationships / 2 clusters.
// ============================================================

const SEED: NetworkSeed = {
  id: 'NET-003',
  name: 'Skyline Cell',
  description:
    'Small communication cluster observed in North Delhi around a shared subscriber pattern and a single case record.',
  seedEntityId: 'ent-person-030',
  caseId: 'FIR-2026-021',
  createdAt: '2026-08-25T14:00:00Z',
  updatedAt: '2026-08-27T10:40:00Z',
  nodes: [
    { entityId: 'ent-person-030', label: 'Sameer Kulkarni', type: 'person', confidence: 0.88, sources: ['CDR Extract - Skyline Watch', 'FIR Records - Delhi North'], activityAt: '2026-02-20T17:00:00Z' },
    { entityId: 'ent-person-031', label: 'Ritu Malhotra', type: 'person', confidence: 0.76, sources: ['CDR Extract - Skyline Watch'], activityAt: '2026-02-20T17:15:00Z' },
    { entityId: 'ent-person-032', label: 'Deepak Sharma', type: 'person', confidence: 0.7, sources: ['CDR Extract - Skyline Watch'], activityAt: '2026-02-21T09:00:00Z' },
    { entityId: 'ent-person-033', label: 'Kiran Bedi', type: 'person', confidence: 0.64, sources: ['Witness Statements'], activityAt: '2026-02-05T11:00:00Z' },
    { entityId: 'ent-phone-021', label: '+91 99110 22334', type: 'phone', confidence: 0.9, sources: ['CDR Extract - Skyline Watch'], activityAt: '2026-02-20T17:10:00Z' },
    { entityId: 'ent-phone-022', label: '+91 99111 33445', type: 'phone', confidence: 0.85, sources: ['CDR Extract - Skyline Watch'], activityAt: '2026-02-21T09:05:00Z' },
    { entityId: 'ent-phone-023', label: '+91 99112 44556', type: 'phone', confidence: 0.74, sources: ['CDR Extract - Skyline Watch'], activityAt: '2026-02-05T11:30:00Z' },
    { entityId: 'ent-location-021', label: 'Karol Bagh', type: 'location', confidence: 0.8, sources: ['Cell Tower Data'], activityAt: '2026-02-20T17:30:00Z' },
    { entityId: 'ent-location-022', label: 'Rohini', type: 'location', confidence: 0.7, sources: ['Cell Tower Data'], activityAt: '2026-02-21T09:20:00Z' },
    { entityId: 'ent-org-021', label: 'Metro Courier Hub', type: 'organization', confidence: 0.68, sources: ['FIR Records - Delhi North'], activityAt: '2026-02-05T10:00:00Z' },
    { entityId: 'ent-txn-021', label: 'TXN-2026-0201', type: 'transaction', confidence: 0.72, sources: ['Bank Transaction Log'], activityAt: '2026-02-20T18:00:00Z' },
    { entityId: 'ent-event-021', label: 'Burst Call — Karol Bagh', type: 'event', confidence: 0.78, sources: ['Cell Tower Data'], activityAt: '2026-02-20T17:30:00Z' },
    { entityId: 'ent-case-021', label: 'FIR-2026-021', type: 'case', confidence: 1, sources: ['FIR Records - Delhi North'], activityAt: '2026-02-05T09:00:00Z' },
    { entityId: 'ent-evidence-021', label: 'Subscriber Match Report', type: 'evidence', confidence: 0.75, sources: ['Telecom Subscriber DB'], activityAt: '2026-02-20T19:00:00Z' },
  ],
  edges: [
    ['ent-person-030', 'ent-phone-021', 'USES', 0.9, 'CDR Extract - Skyline Watch', '2026-02-20T17:10:00Z', ['cdr_skyline_feb26.csv row 19']],
    ['ent-person-030', 'ent-person-031', 'KNOWS', 0.81, 'CDR Extract - Skyline Watch', '2026-02-20T17:15:00Z', ['cdr_skyline_feb26.csv row 20']],
    ['ent-person-031', 'ent-phone-021', 'USES', 0.76, 'CDR Extract - Skyline Watch', '2026-02-20T17:20:00Z', ['cdr_skyline_feb26.csv row 21']],
    ['ent-person-032', 'ent-phone-022', 'USES', 0.85, 'CDR Extract - Skyline Watch', '2026-02-21T09:05:00Z', ['cdr_skyline_feb26.csv row 30']],
    ['ent-person-030', 'ent-person-032', 'KNOWS', 0.66, 'CDR Extract - Skyline Watch', '2026-02-21T09:00:00Z', ['cdr_skyline_feb26.csv row 29']],
    ['ent-person-032', 'ent-location-022', 'LOCATED_AT', 0.72, 'Cell Tower Data', '2026-02-21T09:20:00Z', ['celltower_rohini_2026.json bucket 1']],
    ['ent-person-030', 'ent-location-021', 'LOCATED_AT', 0.81, 'Cell Tower Data', '2026-02-20T17:30:00Z', ['celltower_karol_2026.json bucket 2']],
    ['ent-person-030', 'ent-event-021', 'INVOLVED_IN', 0.78, 'Cell Tower Data', '2026-02-20T17:30:00Z', ['celltower_karol_2026.json bucket 2']],
    ['ent-person-031', 'ent-event-021', 'INVOLVED_IN', 0.67, 'Cell Tower Data', '2026-02-20T17:35:00Z', ['celltower_karol_2026.json bucket 2']],
    ['ent-person-030', 'ent-org-021', 'WORKS_FOR', 0.69, 'FIR Records - Delhi North', '2026-02-05T10:00:00Z', ['FIR-2026-021 / R3']],
    ['ent-person-030', 'ent-txn-021', 'SENT_TRANSACTION', 0.72, 'Bank Transaction Log', '2026-02-20T18:00:00Z', ['transactions_2026_feb.csv row 88']],
    ['ent-txn-021', 'ent-org-021', 'SENT_TRANSACTION', 0.7, 'Bank Transaction Log', '2026-02-20T18:05:00Z', ['transactions_2026_feb.csv row 89']],
    ['ent-person-033', 'ent-case-021', 'INVOLVED_IN', 0.74, 'FIR Records - Delhi North', '2026-02-05T11:00:00Z', ['FIR-2026-021 / R7']],
    ['ent-person-033', 'ent-phone-023', 'USES', 0.64, 'CDR Extract - Skyline Watch', '2026-02-05T11:30:00Z', ['cdr_skyline_feb26.csv row 8']],
    ['ent-person-033', 'ent-person-030', 'KNOWS', 0.6, 'Witness Statements', '2026-02-05T11:45:00Z', ['ws_delhi_002.txt']],
    ['ent-case-021', 'ent-evidence-021', 'PART_OF', 0.75, 'Telecom Subscriber DB', '2026-02-20T19:00:00Z', ['subscriber_db_lookup 2026-01']],
    ['ent-evidence-021', 'ent-phone-021', 'SUPPORTED_BY', 0.73, 'Telecom Subscriber DB', '2026-02-20T19:05:00Z', ['subscriber_db_lookup 2026-01']],
    ['ent-evidence-021', 'ent-phone-022', 'SUPPORTED_BY', 0.71, 'Telecom Subscriber DB', '2026-02-20T19:10:00Z', ['subscriber_db_lookup 2026-01']],
    ['ent-org-021', 'ent-location-021', 'LOCATED_AT', 0.65, 'FIR Records - Delhi North', '2026-02-05T10:10:00Z', ['FIR-2026-021 / R4']],
    ['ent-person-032', 'ent-person-031', 'KNOWS', 0.59, 'CDR Extract - Skyline Watch', '2026-02-21T09:10:00Z', ['cdr_skyline_feb26.csv row 31']],
    ['ent-person-031', 'ent-case-021', 'INVOLVED_IN', 0.57, 'FIR Records - Delhi North', '2026-02-20T18:30:00Z', ['FIR-2026-021 / R5']],
  ],
  clusters: [
    { id: 'cl-skyline', label: 'Skyline Core', nodeIds: ['NET-003-n-001', 'NET-003-n-002', 'NET-003-n-003', 'NET-003-n-005', 'NET-003-n-006', 'NET-003-n-008', 'NET-003-n-011', 'NET-003-n-012'] },
    { id: 'cl-case', label: 'Case & Evidence', nodeIds: ['NET-003-n-004', 'NET-003-n-007', 'NET-003-n-010', 'NET-003-n-013', 'NET-003-n-014'] },
  ],
};

export const networkSkyline = buildNetwork(SEED);