import { buildNetwork, type NetworkSeed } from './build';

// ============================================================
// MOCK — NET-001 "OPERATION CLEAN"
// ============================================================
// The primary knowledge graph for the investigation universe.
// 55 entities / 122 relationships / 6 clusters.
// References canonical Phase 6 entity ids (ent-person-001 …)
// and canonical relationship records (rel-001 … rel-022).
// ============================================================

const SEED: NetworkSeed = {
  id: 'NET-001',
  name: 'Operation Clean',
  description:
    'Primary relationship network for FIR-2026-001. Persons, phones, vehicles, organizations, accounts, transactions, events and evidence across CDR, FIR, bank, tower, customs and witness sources.',
  seedEntityId: 'ent-person-001',
  caseId: 'FIR-2026-001',
  createdAt: '2026-08-18T09:00:00Z',
  updatedAt: '2026-08-27T08:30:00Z',
  nodes: [
    // Persons (canonical)
    { entityId: 'ent-person-001', label: 'Rahul Kumar', type: 'person', confidence: 0.95, sources: ['CDR Extract - Operation clean', 'FIR Records - Pune District', 'Bank Transaction Log', 'Cell Tower Data', 'Witness Statements'], activityAt: '2026-02-22T10:00:00Z' },
    { entityId: 'ent-person-002', label: 'Priya Sharma', type: 'person', confidence: 0.92, sources: ['CDR Extract - Operation clean', 'FIR Records - Pune District', 'Witness Statements'], activityAt: '2026-02-20T09:00:00Z' },
    { entityId: 'ent-person-003', label: 'Vikram Patel', type: 'person', confidence: 0.8, sources: ['CDR Extract - Operation clean', 'Vehicle Tracking Data', 'FIR Records - Pune District'], activityAt: '2026-02-19T18:00:00Z' },
    { entityId: 'ent-person-004', label: 'Anita Desai', type: 'person', confidence: 0.72, sources: ['FIR Records - Pune District', 'Witness Statements'], activityAt: '2026-02-05T08:00:00Z' },
    { entityId: 'ent-person-005', label: 'Meera Reddy', type: 'person', confidence: 0.63, sources: ['Witness Statements'], activityAt: '2026-02-22T11:00:00Z' },
    { entityId: 'ent-person-006', label: 'R. Kumar', type: 'person', confidence: 0.4, sources: ['CDR Extract - Operation clean'], activityAt: '2026-02-01T00:00:00Z' },
    { entityId: 'ent-person-007', label: 'Sanjay Verma', type: 'person', confidence: 0.7, sources: ['CDR Extract - Operation clean', 'Cell Tower Data'], activityAt: '2025-11-12T21:40:00Z' },
    { entityId: 'ent-person-008', label: 'Kavita Iyer', type: 'person', confidence: 0.85, sources: ['CDR Extract - Operation clean', 'FIR Records - Pune District', 'Customs Manifest ML-2026-031'], activityAt: '2026-02-25T16:10:00Z' },
    { entityId: 'ent-person-009', label: 'Rohan Mehta', type: 'person', confidence: 0.66, sources: ['CDR Extract - Operation clean'], activityAt: '2025-08-03T13:20:00Z' },
    { entityId: 'ent-person-010', label: 'Deepa Nair', type: 'person', confidence: 0.78, sources: ['Witness Statements', 'Cell Tower Data'], activityAt: '2026-01-28T17:30:00Z' },
    { entityId: 'ent-person-011', label: 'Arjun Reddy', type: 'person', confidence: 0.74, sources: ['CDR Extract - Operation clean'], activityAt: '2025-05-19T08:15:00Z' },
    { entityId: 'ent-person-012', label: 'Fatima Khan', type: 'person', confidence: 0.88, sources: ['CDR Extract - Operation clean', 'Bank Transaction Log'], activityAt: '2026-02-13T10:05:00Z' },
    { entityId: 'ent-person-013', label: 'Irfan Shaikh', type: 'person', confidence: 0.71, sources: ['CDR Extract - Operation clean'], activityAt: '2024-12-04T19:00:00Z' },
    { entityId: 'ent-person-014', label: 'Gopal Rao', type: 'person', confidence: 0.55, sources: ['Witness Statements'], activityAt: '2024-06-10T12:00:00Z' },
    // Phones
    { entityId: 'ent-phone-001', label: '+91 98765 43210', type: 'phone', confidence: 0.97, sources: ['CDR Extract - Operation clean'], activityAt: '2026-02-02T15:10:00Z' },
    { entityId: 'ent-phone-002', label: '+91 90210 11345', type: 'phone', confidence: 0.95, sources: ['CDR Extract - Operation clean'], activityAt: '2026-02-18T09:40:00Z' },
    { entityId: 'ent-phone-003', label: '+91 98111 22334', type: 'phone', confidence: 0.94, sources: ['CDR Extract - Operation clean'], activityAt: '2026-02-01T20:15:00Z' },
    { entityId: 'ent-phone-004', label: '+91 88990 12021', type: 'phone', confidence: 0.93, sources: ['CDR Extract - Operation clean'], activityAt: '2026-02-10T14:30:00Z' },
    { entityId: 'ent-phone-005', label: '+91 77600 55661', type: 'phone', confidence: 0.91, sources: ['CDR Extract - Operation clean'], activityAt: '2025-11-20T18:45:00Z' },
    { entityId: 'ent-phone-006', label: '+91 99881 44773', type: 'phone', confidence: 0.82, sources: ['CDR Extract - Operation clean'], activityAt: '2024-12-12T22:00:00Z' },
    { entityId: 'ent-phone-007', label: '+91 91234 09987', type: 'phone', confidence: 0.6, sources: ['CDR Extract - Operation clean'], activityAt: '2024-06-01T09:00:00Z' },
    // Vehicles
    { entityId: 'ent-vehicle-001', label: 'MH 14 BX 2231', type: 'vehicle', confidence: 0.95, sources: ['Vehicle Tracking Data'], activityAt: '2026-01-16T06:30:00Z' },
    { entityId: 'ent-vehicle-002', label: 'MH 12 KU 8820', type: 'vehicle', confidence: 0.78, sources: ['Vehicle Tracking Data'], activityAt: '2026-01-22T11:20:00Z' },
    { entityId: 'ent-vehicle-003', label: 'MH 01 CD 5566', type: 'vehicle', confidence: 0.88, sources: ['Vehicle Tracking Data', 'Cell Tower Data'], activityAt: '2026-02-09T03:10:00Z' },
    { entityId: 'ent-vehicle-004', label: 'MH 04 TL 9921', type: 'vehicle', confidence: 0.8, sources: ['Vehicle Tracking Data'], activityAt: '2025-09-15T07:50:00Z' },
    { entityId: 'ent-vehicle-005', label: 'GJ 01 AB 7812', type: 'vehicle', confidence: 0.72, sources: ['Vehicle Tracking Data'], activityAt: '2025-03-22T21:35:00Z' },
    // Locations
    { entityId: 'ent-location-001', label: 'Chennai', type: 'location', confidence: 0.92, sources: ['Cell Tower Data'], activityAt: '2026-02-19T13:00:00Z' },
    { entityId: 'ent-location-002', label: 'Pune', type: 'location', confidence: 0.9, sources: ['FIR Records - Pune District'], activityAt: '2026-02-05T08:00:00Z' },
    { entityId: 'ent-location-003', label: 'Mumbai', type: 'location', confidence: 0.9, sources: ['FIR Records - Pune District', 'Cell Tower Data'], activityAt: '2026-02-19T19:30:00Z' },
    { entityId: 'ent-location-004', label: 'Ahmedabad', type: 'location', confidence: 0.86, sources: ['Cell Tower Data', 'Customs Manifest ML-2026-031'], activityAt: '2026-02-25T23:10:00Z' },
    { entityId: 'ent-location-005', label: 'Delhi', type: 'location', confidence: 0.84, sources: ['Cell Tower Data'], activityAt: '2025-11-18T16:20:00Z' },
    { entityId: 'ent-location-006', label: 'Goa', type: 'location', confidence: 0.5, sources: ['Witness Statements'], activityAt: '2024-06-05T18:00:00Z' },
    // Organizations
    { entityId: 'ent-org-001', label: 'Mumbai Trading Corp', type: 'organization', confidence: 0.9, sources: ['FIR Records - Pune District', 'GST Ledger Extract'], activityAt: '2026-02-14T10:00:00Z' },
    { entityId: 'ent-org-002', label: 'Global Imports Ltd', type: 'organization', confidence: 0.77, sources: ['CDR Extract - Operation clean', 'Customs Manifest ML-2026-031'], activityAt: '2026-02-25T15:40:00Z' },
    { entityId: 'ent-org-003', label: 'Meridian Freight Pvt Ltd', type: 'organization', confidence: 0.74, sources: ['Customs Manifest ML-2026-031', 'GST Ledger Extract'], activityAt: '2026-02-25T16:00:00Z' },
    { entityId: 'ent-org-004', label: 'Coastal Cargo Services', type: 'organization', confidence: 0.42, sources: ['Customs Manifest ML-2026-031'], activityAt: '2025-02-11T10:00:00Z' },
    // Accounts
    { entityId: 'ent-account-001', label: '7731 0029 4567', type: 'account', confidence: 0.96, sources: ['Bank Transaction Log'], activityAt: '2026-02-14T12:00:00Z' },
    { entityId: 'ent-account-002', label: '8845 1190 0221', type: 'account', confidence: 0.94, sources: ['Bank Transaction Log'], activityAt: '2026-03-02T09:20:00Z' },
    { entityId: 'ent-account-003', label: '5522 8890 1123', type: 'account', confidence: 0.9, sources: ['Bank Transaction Log'], activityAt: '2026-02-13T11:40:00Z' },
    { entityId: 'ent-account-004', label: '9012 3445 7760', type: 'account', confidence: 0.7, sources: ['Bank Transaction Log'], activityAt: '2025-09-20T14:00:00Z' },
    // Transactions
    { entityId: 'ent-txn-001', label: 'TXN-2026-0482', type: 'transaction', confidence: 0.97, sources: ['Bank Transaction Log'], activityAt: '2026-02-14T12:05:00Z' },
    { entityId: 'ent-txn-002', label: 'TXN-2026-0774', type: 'transaction', confidence: 0.66, sources: ['Bank Transaction Log'], activityAt: '2026-02-27T16:30:00Z' },
    { entityId: 'ent-txn-003', label: 'TXN-2025-1042', type: 'transaction', confidence: 0.84, sources: ['Bank Transaction Log'], activityAt: '2025-09-21T10:15:00Z' },
    { entityId: 'ent-txn-004', label: 'TXN-2024-0553', type: 'transaction', confidence: 0.79, sources: ['Bank Transaction Log'], activityAt: '2024-11-08T13:45:00Z' },
    { entityId: 'ent-txn-005', label: 'TXN-2026-0901', type: 'transaction', confidence: 0.75, sources: ['Bank Transaction Log'], activityAt: '2026-03-02T09:25:00Z' },
    // Events
    { entityId: 'ent-event-001', label: 'Meeting — Chennai Hub', type: 'event', confidence: 0.85, sources: ['Cell Tower Data'], activityAt: '2026-02-19T13:00:00Z' },
    { entityId: 'ent-event-002', label: 'Consignment Unload — Nhava Sheva', type: 'event', confidence: 0.77, sources: ['Customs Manifest ML-2026-031', 'Cell Tower Data'], activityAt: '2026-02-25T23:15:00Z' },
    { entityId: 'ent-event-003', label: 'Intercept Review — Pune', type: 'event', confidence: 0.72, sources: ['FIR Records - Pune District', 'Witness Statements'], activityAt: '2026-02-05T09:00:00Z' },
    // Case
    { entityId: 'ent-case-001', label: 'FIR-2026-001', type: 'case', confidence: 1, sources: ['FIR Records - Pune District'], activityAt: '2026-02-27T08:00:00Z' },
    // Documents
    { entityId: 'ent-doc-001', label: 'FIR-2026-001 Scan', type: 'document', confidence: 0.98, sources: ['FIR Records - Pune District'], activityAt: '2026-02-05T08:30:00Z' },
    { entityId: 'ent-doc-002', label: 'GST Ledger Q4 Extract', type: 'document', confidence: 0.88, sources: ['GST Ledger Extract'], activityAt: '2026-01-31T09:00:00Z' },
    { entityId: 'ent-doc-003', label: 'Customs Manifest ML-2026-031', type: 'document', confidence: 0.81, sources: ['Customs Manifest ML-2026-031'], activityAt: '2026-02-25T15:00:00Z' },
    // Evidence
    { entityId: 'ent-evidence-001', label: 'CDR Extract — Feb 2026', type: 'evidence', confidence: 0.9, sources: ['CDR Extract - Operation clean'], activityAt: '2026-02-18T09:00:00Z' },
    { entityId: 'ent-evidence-002', label: 'Tower Mapping Report', type: 'evidence', confidence: 0.85, sources: ['Cell Tower Data'], activityAt: '2026-02-19T14:00:00Z' },
    { entityId: 'ent-evidence-003', label: 'Witness Batch 3', type: 'evidence', confidence: 0.68, sources: ['Witness Statements'], activityAt: '2026-02-22T11:30:00Z' },
  ],

  edges: [
    // ---- Canonical relationships (rel-001 … rel-022) ----
    ['ent-person-001', 'ent-phone-001', 'USES', 0.98, 'CDR Extract - Operation clean', '2026-02-01T00:00:00Z', ['cdr_extract.csv #2241']],
    ['ent-person-001', 'ent-vehicle-001', 'OWNS', 0.96, 'Vehicle Tracking Data', '2026-01-15T00:00:00Z', ['vehicle_tracking_mh.csv row 1202']],
    ['ent-person-001', 'ent-person-003', 'KNOWS', 0.74, 'CDR Extract - Operation clean', '2026-02-01T00:00:00Z', ['cdr_extract.csv frequency cluster 7']],
    ['ent-person-001', 'ent-person-002', 'KNOWS', 0.91, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R5']],
    ['ent-person-001', 'ent-org-001', 'WORKS_FOR', 0.93, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R2']],
    ['ent-person-001', 'ent-location-001', 'LOCATED_AT', 0.92, 'Cell Tower Data', '2026-02-01T00:00:00Z', ['celltower_pune_mumbai.json bucket 4']],
    ['ent-person-001', 'ent-account-001', 'OWNS_ACCOUNT', 0.97, 'Bank Transaction Log', '2026-02-10T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 132']],
    ['ent-person-001', 'ent-txn-001', 'SENT_TRANSACTION', 0.99, 'Bank Transaction Log', '2026-02-14T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 132']],
    ['ent-txn-001', 'ent-case-001', 'PART_OF', 0.98, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R12']],
    ['ent-person-001', 'ent-event-001', 'INVOLVED_IN', 0.86, 'Cell Tower Data', '2026-02-19T00:00:00Z', ['celltower_pune_mumbai.json bucket 4']],
    ['ent-person-001', 'ent-case-001', 'INVOLVED_IN', 0.97, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R2']],
    ['ent-person-002', 'ent-org-001', 'WORKS_FOR', 0.94, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R5']],
    ['ent-person-003', 'ent-phone-003', 'USES', 0.95, 'CDR Extract - Operation clean', '2026-02-01T00:00:00Z', ['cdr_extract.csv #4470']],
    ['ent-person-003', 'ent-vehicle-002', 'OWNS', 0.78, 'Vehicle Tracking Data', '2026-01-20T00:00:00Z', ['vehicle_tracking_mh.csv row 2201']],
    ['ent-person-003', 'ent-org-002', 'WORKS_FOR', 0.7, 'CDR Extract - Operation clean', '2026-02-01T00:00:00Z', ['cdr_extract.csv #4470']],
    ['ent-org-001', 'ent-location-003', 'LOCATED_AT', 0.95, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R9']],
    ['ent-org-002', 'ent-location-003', 'LOCATED_AT', 0.82, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R11']],
    ['ent-person-001', 'ent-person-005', 'SUPPORTED_BY', 0.55, 'Witness Statements', '2026-02-22T00:00:00Z', ['ws_batch3_014.txt']],
    ['ent-person-003', 'ent-event-001', 'INVOLVED_IN', 0.68, 'Cell Tower Data', '2026-02-19T00:00:00Z', ['celltower_pune_mumbai.json bucket 4']],
    ['ent-txn-002', 'ent-case-001', 'PART_OF', 0.6, 'Bank Transaction Log', '2026-02-27T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 401']],
    ['ent-person-002', 'ent-phone-002', 'USES', 0.96, 'CDR Extract - Operation clean', '2026-02-01T00:00:00Z', ['cdr_extract.csv #1042']],
    ['ent-person-006', 'ent-person-001', 'KNOWS', 0.4, 'CDR Extract - Operation clean', '2026-02-01T00:00:00Z', ['cdr_extract.csv #2241']],

    // ---- Extended ring around the core ----
    ['ent-person-001', 'ent-person-008', 'KNOWS', 0.87, 'CDR Extract - Operation clean', '2026-02-10T00:00:00Z', ['cdr_extract.csv #3180']],
    ['ent-person-008', 'ent-phone-004', 'USES', 0.93, 'CDR Extract - Operation clean', '2026-02-10T00:00:00Z', ['cdr_extract.csv #3181']],
    ['ent-person-008', 'ent-person-012', 'KNOWS', 0.8, 'CDR Extract - Operation clean', '2026-02-11T00:00:00Z', ['cdr_extract.csv #4020']],
    ['ent-person-001', 'ent-person-012', 'KNOWS', 0.89, 'CDR Extract - Operation clean', '2026-02-12T00:00:00Z', ['cdr_extract.csv #4021']],
    ['ent-person-012', 'ent-account-003', 'OWNS_ACCOUNT', 0.92, 'Bank Transaction Log', '2026-02-13T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 210']],
    ['ent-person-001', 'ent-org-003', 'WORKS_FOR', 0.8, 'CDR Extract - Operation clean', '2026-02-25T00:00:00Z', ['manifest_ml_031 line 12']],
    ['ent-person-008', 'ent-org-003', 'WORKS_FOR', 0.76, 'Customs Manifest ML-2026-031', '2026-02-25T00:00:00Z', ['manifest_ml_031 line 18']],
    ['ent-person-001', 'ent-vehicle-003', 'OWNS', 0.9, 'Vehicle Tracking Data', '2026-02-08T00:00:00Z', ['vehicle_tracking_mh.csv row 3301']],
    ['ent-person-001', 'ent-location-004', 'LOCATED_AT', 0.84, 'Cell Tower Data', '2026-01-31T00:00:00Z', ['celltower_pune_mumbai.json bucket 9']],
    ['ent-person-008', 'ent-location-004', 'LOCATED_AT', 0.85, 'Customs Manifest ML-2026-031', '2026-01-31T00:00:00Z', ['manifest_ml_031 line 6']],
    ['ent-person-001', 'ent-person-007', 'KNOWS', 0.72, 'CDR Extract - Operation clean', '2025-11-12T00:00:00Z', ['cdr_extract.csv #5090']],
    ['ent-person-007', 'ent-phone-005', 'USES', 0.9, 'CDR Extract - Operation clean', '2025-11-20T00:00:00Z', ['cdr_extract.csv #5091']],
    ['ent-person-007', 'ent-person-010', 'KNOWS', 0.61, 'CDR Extract - Operation clean', '2025-11-30T00:00:00Z', ['cdr_extract.csv #5102']],
    ['ent-person-007', 'ent-person-008', 'KNOWS', 0.68, 'CDR Extract - Operation clean', '2026-02-06T00:00:00Z', ['cdr_extract.csv #5120']],
    ['ent-person-003', 'ent-person-009', 'KNOWS', 0.68, 'CDR Extract - Operation clean', '2025-08-03T00:00:00Z', ['cdr_extract.csv #6011']],
    ['ent-person-009', 'ent-phone-006', 'USES', 0.8, 'CDR Extract - Operation clean', '2024-12-12T00:00:00Z', ['cdr_extract.csv #6012']],
    ['ent-person-009', 'ent-vehicle-005', 'OWNS', 0.7, 'Vehicle Tracking Data', '2025-03-22T00:00:00Z', ['vehicle_tracking_mh.csv row 4400']],
    ['ent-person-009', 'ent-location-005', 'LOCATED_AT', 0.72, 'Cell Tower Data', '2025-11-18T00:00:00Z', ['geo_routes_2025.geojson']],
    ['ent-person-009', 'ent-person-013', 'KNOWS', 0.62, 'CDR Extract - Operation clean', '2024-12-01T00:00:00Z', ['cdr_extract.csv #6070']],
    ['ent-person-003', 'ent-person-010', 'KNOWS', 0.77, 'Witness Statements', '2026-01-28T00:00:00Z', ['ws_batch2_009.txt']],
    ['ent-person-003', 'ent-location-001', 'LOCATED_AT', 0.7, 'Cell Tower Data', '2026-02-19T00:00:00Z', ['celltower_pune_mumbai.json bucket 4']],
    ['ent-person-003', 'ent-person-012', 'KNOWS', 0.75, 'CDR Extract - Operation clean', '2026-02-05T00:00:00Z', ['cdr_extract.csv #2241']],
    ['ent-person-002', 'ent-person-010', 'KNOWS', 0.74, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R5']],
    ['ent-person-004', 'ent-person-002', 'KNOWS', 0.71, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R7']],
    ['ent-person-004', 'ent-case-001', 'INVOLVED_IN', 0.8, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R7']],
    ['ent-person-010', 'ent-person-005', 'KNOWS', 0.58, 'Witness Statements', '2026-02-22T00:00:00Z', ['ws_batch3_015.txt']],
    ['ent-person-012', 'ent-person-002', 'KNOWS', 0.76, 'CDR Extract - Operation clean', '2026-02-13T00:00:00Z', ['cdr_extract.csv #4023']],
    ['ent-person-013', 'ent-phone-006', 'USES', 0.7, 'CDR Extract - Operation clean', '2024-12-12T00:00:00Z', ['cdr_extract.csv #7200']],

    // ---- Money flow ----
    ['ent-account-001', 'ent-txn-001', 'SENT_TRANSACTION', 0.95, 'Bank Transaction Log', '2026-02-14T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 132']],
    ['ent-txn-001', 'ent-account-002', 'SENT_TRANSACTION', 0.97, 'Bank Transaction Log', '2026-02-14T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 133']],
    ['ent-account-002', 'ent-org-001', 'OWNS_ACCOUNT', 0.92, 'Bank Transaction Log', '2026-02-14T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 15']],
    ['ent-account-001', 'ent-txn-002', 'SENT_TRANSACTION', 0.8, 'Bank Transaction Log', '2026-02-27T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 401']],
    ['ent-txn-002', 'ent-account-002', 'SENT_TRANSACTION', 0.9, 'Bank Transaction Log', '2026-02-27T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 402']],
    ['ent-txn-002', 'ent-org-002', 'SENT_TRANSACTION', 0.68, 'Bank Transaction Log', '2026-02-27T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 403']],
    ['ent-account-003', 'ent-txn-005', 'SENT_TRANSACTION', 0.82, 'Bank Transaction Log', '2026-03-02T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 520']],
    ['ent-txn-005', 'ent-account-002', 'SENT_TRANSACTION', 0.76, 'Bank Transaction Log', '2026-03-02T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 521']],
    ['ent-txn-005', 'ent-account-004', 'SENT_TRANSACTION', 0.74, 'Bank Transaction Log', '2026-03-02T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 522']],
    ['ent-account-004', 'ent-txn-003', 'SENT_TRANSACTION', 0.8, 'Bank Transaction Log', '2025-09-20T00:00:00Z', ['transactions_2025_sep.xlsx row 91']],
    ['ent-txn-003', 'ent-org-002', 'SENT_TRANSACTION', 0.74, 'Bank Transaction Log', '2025-09-21T00:00:00Z', ['transactions_2025_sep.xlsx row 92']],
    ['ent-account-001', 'ent-txn-004', 'SENT_TRANSACTION', 0.78, 'Bank Transaction Log', '2024-11-08T00:00:00Z', ['transactions_2024_nov.csv row 18']],
    ['ent-txn-004', 'ent-account-002', 'SENT_TRANSACTION', 0.72, 'Bank Transaction Log', '2024-11-08T00:00:00Z', ['transactions_2024_nov.csv row 19']],
    ['ent-txn-004', 'ent-org-002', 'SENT_TRANSACTION', 0.64, 'Bank Transaction Log', '2024-11-09T00:00:00Z', ['transactions_2024_nov.csv row 20']],
    ['ent-account-003', 'ent-org-003', 'OWNS_ACCOUNT', 0.79, 'Bank Transaction Log', '2026-02-13T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 211']],
    ['ent-person-013', 'ent-account-004', 'OWNS_ACCOUNT', 0.73, 'Bank Transaction Log', '2025-09-20T00:00:00Z', ['transactions_2025_sep.xlsx row 90']],

    // ---- Corporate web ----
    ['ent-org-001', 'ent-org-003', 'SUPPORTED_BY', 0.78, 'GST Ledger Extract', '2026-02-25T00:00:00Z', ['gst_q4_extract.csv row 33']],
    ['ent-org-003', 'ent-doc-002', 'PART_OF', 0.86, 'GST Ledger Extract', '2026-01-31T00:00:00Z', ['gst_q4_extract.csv row 12']],
    ['ent-org-003', 'ent-event-002', 'INVOLVED_IN', 0.81, 'Customs Manifest ML-2026-031', '2026-02-25T00:00:00Z', ['manifest_ml_031 line 48']],
    ['ent-person-008', 'ent-event-002', 'INVOLVED_IN', 0.79, 'Customs Manifest ML-2026-031', '2026-02-25T00:00:00Z', ['manifest_ml_031 line 20']],
    ['ent-org-002', 'ent-doc-003', 'PART_OF', 0.83, 'Customs Manifest ML-2026-031', '2026-02-25T00:00:00Z', ['manifest_ml_031 line 55']],
    ['ent-doc-003', 'ent-event-002', 'PART_OF', 0.77, 'Customs Manifest ML-2026-031', '2026-02-25T00:00:00Z', ['manifest_ml_031 line 60']],
    ['ent-doc-003', 'ent-org-003', 'INVOLVED_IN', 0.71, 'Customs Manifest ML-2026-031', '2026-02-25T00:00:00Z', ['manifest_ml_031 line 62']],
    ['ent-event-002', 'ent-location-004', 'LOCATED_AT', 0.76, 'Customs Manifest ML-2026-031', '2026-02-25T00:00:00Z', ['manifest_ml_031 line 48']],
    ['ent-doc-002', 'ent-org-001', 'PART_OF', 0.75, 'GST Ledger Extract', '2026-01-31T00:00:00Z', ['gst_q4_extract.csv row 30']],
    ['ent-org-001', 'ent-location-003', 'LOCATED_AT', 0.9, 'GST Ledger Extract', '2026-01-31T00:00:00Z', ['gst_q4_extract.csv row 5']],
    ['ent-account-002', 'ent-event-002', 'INVOLVED_IN', 0.62, 'Bank Transaction Log', '2026-02-25T00:00:00Z', ['transactions_flagged_aug2026.xlsx row 490']],

    // ---- Legal & evidence ----
    ['ent-doc-001', 'ent-case-001', 'PART_OF', 0.98, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 Scan']],
    ['ent-evidence-001', 'ent-case-001', 'PART_OF', 0.9, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / A2']],
    ['ent-evidence-001', 'ent-phone-001', 'SUPPORTED_BY', 0.86, 'CDR Extract - Operation clean', '2026-02-02T00:00:00Z', ['cdr_extract.csv #2241']],
    ['ent-evidence-001', 'ent-phone-002', 'SUPPORTED_BY', 0.84, 'CDR Extract - Operation clean', '2026-02-18T00:00:00Z', ['cdr_extract.csv #1042']],
    ['ent-evidence-002', 'ent-location-001', 'SUPPORTED_BY', 0.82, 'Cell Tower Data', '2026-02-19T00:00:00Z', ['tower mapping sheet 4']],
    ['ent-evidence-002', 'ent-event-001', 'PART_OF', 0.78, 'Cell Tower Data', '2026-02-19T00:00:00Z', ['tower mapping sheet 4']],
    ['ent-evidence-002', 'ent-person-003', 'SUPPORTED_BY', 0.75, 'Cell Tower Data', '2026-02-19T00:00:00Z', ['tower mapping sheet 4']],
    ['ent-evidence-002', 'ent-phone-004', 'SUPPORTED_BY', 0.73, 'Cell Tower Data', '2026-02-10T00:00:00Z', ['tower mapping sheet 2']],
    ['ent-evidence-003', 'ent-person-005', 'SUPPORTED_BY', 0.66, 'Witness Statements', '2026-02-22T00:00:00Z', ['ws_batch3_014.txt']],
    ['ent-evidence-003', 'ent-case-001', 'PART_OF', 0.64, 'Witness Statements', '2026-02-22T00:00:00Z', ['ws_batch3_014.txt']],
    ['ent-evidence-003', 'ent-person-004', 'SUPPORTED_BY', 0.63, 'Witness Statements', '2026-02-22T00:00:00Z', ['ws_batch3_002.txt']],
    ['ent-event-003', 'ent-location-002', 'LOCATED_AT', 0.7, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R9']],
    ['ent-event-003', 'ent-case-001', 'PART_OF', 0.73, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R9']],
    ['ent-person-004', 'ent-doc-001', 'INVOLVED_IN', 0.69, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R7']],
    ['ent-person-002', 'ent-doc-001', 'INVOLVED_IN', 0.72, 'FIR Records - Pune District', '2026-02-05T00:00:00Z', ['FIR-2026-001 / R5']],

    // ---- Assets & routes ----
    ['ent-vehicle-001', 'ent-location-002', 'LOCATED_AT', 0.9, 'Vehicle Tracking Data', '2026-01-16T00:00:00Z', ['vehicle_tracking_mh.csv row 1203']],
    ['ent-vehicle-002', 'ent-location-001', 'LOCATED_AT', 0.75, 'Vehicle Tracking Data', '2026-01-21T00:00:00Z', ['vehicle_tracking_mh.csv row 2202']],
    ['ent-vehicle-003', 'ent-location-004', 'LOCATED_AT', 0.85, 'Vehicle Tracking Data', '2026-02-09T00:00:00Z', ['vehicle_tracking_mh.csv row 3302']],
    ['ent-vehicle-001', 'ent-person-003', 'OWNS', 0.6, 'Vehicle Tracking Data', '2026-01-10T00:00:00Z', ['vehicle_tracking_mh.csv row 1190']],
    ['ent-vehicle-004', 'ent-person-011', 'OWNS', 0.82, 'Vehicle Tracking Data', '2025-09-15T00:00:00Z', ['vehicle_tracking_mh.csv row 3910']],
    ['ent-vehicle-002', 'ent-person-010', 'OWNS', 0.72, 'Vehicle Tracking Data', '2026-01-22T00:00:00Z', ['vehicle_tracking_mh.csv row 2203']],
    ['ent-person-011', 'ent-phone-006', 'USES', 0.74, 'CDR Extract - Operation clean', '2024-12-12T00:00:00Z', ['cdr_extract.csv #8001']],
    ['ent-person-011', 'ent-location-005', 'LOCATED_AT', 0.69, 'Cell Tower Data', '2025-10-02T00:00:00Z', ['celltower_delhi_2025.json bucket 2']],
    ['ent-person-011', 'ent-txn-004', 'INVOLVED_IN', 0.6, 'Bank Transaction Log', '2024-11-08T00:00:00Z', ['transactions_2024_nov.csv row 21']],
    ['ent-location-005', 'ent-person-003', 'LOCATED_AT', 0.63, 'Cell Tower Data', '2025-11-18T00:00:00Z', ['celltower_delhi_2025.json bucket 7']],

    // ---- Low-confidence candidates & witnesses ----
    ['ent-person-005', 'ent-person-010', 'KNOWS', 0.55, 'Witness Statements', '2026-02-22T00:00:00Z', ['ws_batch3_016.txt']],
    ['ent-person-008', 'ent-person-005', 'SUPPORTED_BY', 0.57, 'Witness Statements', '2026-02-22T00:00:00Z', ['ws_batch3_018.txt']],
    ['ent-person-011', 'ent-person-003', 'KNOWS', 0.66, 'CDR Extract - Operation clean', '2025-05-20T00:00:00Z', ['cdr_extract.csv #8002']],
    ['ent-person-013', 'ent-person-007', 'KNOWS', 0.6, 'CDR Extract - Operation clean', '2024-12-14T00:00:00Z', ['cdr_extract.csv #7210']],
    ['ent-person-003', 'ent-doc-003', 'INVOLVED_IN', 0.58, 'Customs Manifest ML-2026-031', '2026-02-25T00:00:00Z', ['manifest_ml_031 line 24']],

    // ---- Coastal satellite component ----
    ['ent-person-014', 'ent-phone-007', 'USES', 0.65, 'CDR Extract - Operation clean', '2024-06-01T00:00:00Z', ['cdr_extract.csv #9001']],
    ['ent-person-014', 'ent-location-006', 'LOCATED_AT', 0.6, 'Witness Statements', '2024-06-05T00:00:00Z', ['ws_batch1_044.txt']],
    ['ent-person-014', 'ent-location-003', 'LOCATED_AT', 0.55, 'Witness Statements', '2024-06-05T00:00:00Z', ['ws_batch1_045.txt']],
  ],

  clusters: [
    { id: 'cl-kumar', label: 'Kumar Core', nodeIds: ['NET-001-n-001', 'NET-001-n-002', 'NET-001-n-003', 'NET-001-n-006', 'NET-001-n-007', 'NET-001-n-008', 'NET-001-n-009', 'NET-001-n-012', 'NET-001-n-015', 'NET-001-n-016', 'NET-001-n-017', 'NET-001-n-018', 'NET-001-n-019', 'NET-001-n-020', 'NET-001-n-021', 'NET-001-n-022', 'NET-001-n-024', 'NET-001-n-032', 'NET-001-n-033'] },
    { id: 'cl-corporate', label: 'Corporate Ring', nodeIds: ['NET-001-n-027', 'NET-001-n-028', 'NET-001-n-030', 'NET-001-n-034', 'NET-001-n-035', 'NET-001-n-036', 'NET-001-n-037', 'NET-001-n-038', 'NET-001-n-039', 'NET-001-n-040', 'NET-001-n-042', 'NET-001-n-043'] },
    { id: 'cl-assets', label: 'Assets & Routes', nodeIds: ['NET-001-n-023', 'NET-001-n-025', 'NET-001-n-026', 'NET-001-n-029', 'NET-001-n-031', 'NET-001-n-004', 'NET-001-n-009', 'NET-001-n-013', 'NET-001-n-010'] },
    { id: 'cl-legal', label: 'Legal & Evidence', nodeIds: ['NET-001-n-044', 'NET-001-n-045', 'NET-001-n-046', 'NET-001-n-047', 'NET-001-n-048', 'NET-001-n-005', 'NET-001-n-011', 'NET-001-n-004'] },
    { id: 'cl-satellite', label: 'Coastal Satellite', nodeIds: ['NET-001-n-014', 'NET-001-n-022', 'NET-001-n-031'] },
    { id: 'cl-islands', label: 'Isolated Records', nodeIds: ['NET-001-n-030'] },
  ],
};

export const networkClean = buildNetwork(SEED);