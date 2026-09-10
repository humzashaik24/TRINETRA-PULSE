import type { EntityIntelligence } from '@trinetra-pulse/types';
import type { EvidenceItem } from '@trinetra-pulse/types';
import type { RecentIntelligence } from '@trinetra-pulse/types';
import type { SuspiciousPattern } from '@trinetra-pulse/types';
import type {
  MockInvestigationRecord,
} from './investigations';
import { buildNetwork, type NetworkSeed, type EdgeRow } from './networks/build';

// ============================================================
// MOCK — NEXUS DATASET (Operation Trinetra Nexus)
// ============================================================
// Comprehensive investigation scenario: a financial fraud network
// operating across Delhi, Hyderabad and Mumbai, using shell
// companies, money mules and layered transactions.
//
// 35 entities / 60 relationships / 3 clusters.
//
// Hub entity:  Arjun Kapoor  (ent-nexus-person-001)  — 14 connections
// Bridge entity: Meera Joshi (ent-nexus-person-005)  —  8 connections
//
// This file is DEMONSTRATION DATA only. Every timestamp is
// deterministic — no Math.random(), no Date.now().
// ============================================================

const iso = (d: string) => new Date(d).toISOString();

// ------------------------------------------------------------
// Entity-ref helper (mirrors investigations.ts pattern)
// ------------------------------------------------------------

const entityRef = (
  idx: string,
  investigationId: string,
  entityId: string,
  name: string,
  entityType: import('@trinetra-pulse/types').EntityType,
  role: string,
  confidence: number,
  linkedBy: string,
  linkedAt: string,
): import('@trinetra-pulse/types').InvestigationEntity => ({
  id: idx,
  investigation_id: investigationId,
  entity_id: entityId,
  name,
  entity_type: entityType,
  association_confidence: confidence,
  role,
  linked_by: linkedBy,
  linked_at: iso(linkedAt),
  metadata: { is_mock: true },
});

// ------------------------------------------------------------
// Evidence-ref helper
// ------------------------------------------------------------

const evidenceRef = (
  idx: string,
  investigationId: string,
  evidenceId: string,
  title: string,
  evidenceType: import('@trinetra-pulse/types').EvidenceContextKind,
  summary: string,
  linkedBy: string,
  linkedAt: string,
): import('@trinetra-pulse/types').InvestigationEvidence => ({
  id: idx,
  investigation_id: investigationId,
  evidence_id: evidenceId,
  title,
  evidence_type: evidenceType,
  summary,
  linked_by: linkedBy,
  linked_at: iso(linkedAt),
  collected_at: null,
  metadata: { is_mock: true },
});

// ============================================================
// NETWORK SEED — NET-004
// ============================================================
// Node order determines auto-generated node IDs:
//   NET-004-n-001 â€¦ NET-004-n-035
// Cluster nodeIds reference these padded-3 node IDs.
// ============================================================

export const NEXUS_NETWORK_SEED: NetworkSeed = {
  id: 'NET-004',
  name: 'Operation Trinetra Nexus',
  description:
    'Fraud-investigation network linking shell companies, money mules and layered transactions across Delhi, Hyderabad and Mumbai. Generated for demonstration — not live police data.',
  seedEntityId: 'ent-nexus-person-001',
  caseId: 'inv-demo-nexus',
  createdAt: '2026-07-01T09:00:00Z',
  updatedAt: '2026-09-08T14:30:00Z',

  nodes: [
    // --- Persons (10) ---
    { entityId: 'ent-nexus-person-001', label: 'Arjun Kapoor', type: 'person', confidence: 0.94, sources: ['FIR Records - Delhi North', 'CDR Extract - Harness Cell', 'Bank Transaction Log', 'Cell Tower Data'], activityAt: '2026-09-05T18:10:00Z' },
    { entityId: 'ent-nexus-person-002', label: 'Suresh Iyer', type: 'person', confidence: 0.82, sources: ['FIR Records - Delhi North', 'CDR Extract - Harness Cell', 'Bank Transaction Log'], activityAt: '2026-09-01T12:40:00Z' },
    { entityId: 'ent-nexus-person-003', label: 'Kavya Menon', type: 'person', confidence: 0.79, sources: ['CDR Extract - Harness Cell', 'GST Ledger Extract', 'Bank Transaction Log'], activityAt: '2026-08-28T09:15:00Z' },
    { entityId: 'ent-nexus-person-004', label: 'Ramesh Nair', type: 'person', confidence: 0.68, sources: ['GST Ledger Extract', 'CDR Extract - Harness Cell'], activityAt: '2026-08-10T14:00:00Z' },
    { entityId: 'ent-nexus-person-005', label: 'Meera Joshi', type: 'person', confidence: 0.86, sources: ['CDR Extract - Harness Cell', 'GST Ledger Extract', 'Bank Transaction Log', 'Cell Tower Data'], activityAt: '2026-09-06T11:20:00Z' },
    { entityId: 'ent-nexus-person-006', label: 'Nikhil Sharma', type: 'person', confidence: 0.77, sources: ['CDR Extract - Harness Cell', 'GST Ledger Extract', 'Vehicle Tracking Data'], activityAt: '2026-09-03T10:30:00Z' },
    { entityId: 'ent-nexus-person-007', label: 'Pooja Deshmukh', type: 'person', confidence: 0.71, sources: ['GST Ledger Extract', 'Vehicle Tracking Data', 'CDR Extract - Harness Cell'], activityAt: '2026-08-22T08:45:00Z' },
    { entityId: 'ent-nexus-person-008', label: 'Vikram Rao', type: 'person', confidence: 0.83, sources: ['CDR Extract - Harness Cell', 'GST Ledger Extract', 'Bank Transaction Log'], activityAt: '2026-09-07T15:55:00Z' },
    { entityId: 'ent-nexus-person-009', label: 'Ananya Pillai', type: 'person', confidence: 0.66, sources: ['CDR Extract - Harness Cell', 'Bank Transaction Log'], activityAt: '2026-07-20T10:00:00Z' },
    { entityId: 'ent-nexus-person-010', label: 'Ravi Reddy', type: 'person', confidence: 0.58, sources: ['CDR Extract - Harness Cell'], activityAt: '2026-07-15T09:00:00Z' },
    // --- Organizations (4) ---
    { entityId: 'ent-nexus-org-001', label: 'BlueSky Trading Solutions', type: 'organization', confidence: 0.92, sources: ['GST Ledger Extract', 'FIR Records - Delhi North', 'Bank Transaction Log'], activityAt: '2026-09-02T10:00:00Z' },
    { entityId: 'ent-nexus-org-002', label: 'Pinnacle Import-Export Corp', type: 'organization', confidence: 0.83, sources: ['GST Ledger Extract', 'Bank Transaction Log', 'Cell Tower Data'], activityAt: '2026-09-04T09:20:00Z' },
    { entityId: 'ent-nexus-org-003', label: 'Swift Cargo Logistics', type: 'organization', confidence: 0.74, sources: ['GST Ledger Extract', 'Vehicle Tracking Data', 'Cell Tower Data'], activityAt: '2026-09-03T14:10:00Z' },
    { entityId: 'ent-nexus-org-004', label: 'Golden Gate Financials', type: 'organization', confidence: 0.62, sources: ['GST Ledger Extract', 'Bank Transaction Log'], activityAt: '2026-08-05T11:00:00Z' },
    // --- Phones (5) ---
    { entityId: 'ent-nexus-phone-001', label: '+91 98110 22334', type: 'phone', confidence: 0.96, sources: ['Telecom Subscriber DB'], activityAt: '2026-09-05T17:30:00Z' },
    { entityId: 'ent-nexus-phone-002', label: '+91 98980 11223', type: 'phone', confidence: 0.93, sources: ['Telecom Subscriber DB'], activityAt: '2026-09-03T08:50:00Z' },
    { entityId: 'ent-nexus-phone-003', label: '+91 97770 55661', type: 'phone', confidence: 0.84, sources: ['Telecom Subscriber DB'], activityAt: '2026-09-01T13:20:00Z' },
    { entityId: 'ent-nexus-phone-004', label: '+91 99112 88990', type: 'phone', confidence: 0.78, sources: ['Telecom Subscriber DB'], activityAt: '2026-09-06T10:10:00Z' },
    { entityId: 'ent-nexus-phone-005', label: '+91 96544 12021', type: 'phone', confidence: 0.66, sources: ['Telecom Subscriber DB'], activityAt: '2026-09-06T09:05:00Z' },
    // --- Accounts (4) ---
    { entityId: 'ent-nexus-account-001', label: '4001 2213 5566', type: 'account', confidence: 0.95, sources: ['Bank Transaction Log'], activityAt: '2026-09-05T18:00:00Z' },
    { entityId: 'ent-nexus-account-002', label: '4002 7755 8877', type: 'account', confidence: 0.85, sources: ['Bank Transaction Log'], activityAt: '2026-09-01T12:00:00Z' },
    { entityId: 'ent-nexus-account-003', label: '4003 1122 9900', type: 'account', confidence: 0.80, sources: ['Bank Transaction Log'], activityAt: '2026-09-06T11:00:00Z' },
    { entityId: 'ent-nexus-account-004', label: '4004 5566 0011', type: 'account', confidence: 0.70, sources: ['Bank Transaction Log'], activityAt: '2026-09-04T14:30:00Z' },
    // --- Vehicles (3) ---
    { entityId: 'ent-nexus-vehicle-001', label: 'DL 01 AB 1234', type: 'vehicle', confidence: 0.83, sources: ['Vehicle Tracking Data'], activityAt: '2026-09-04T06:40:00Z' },
    { entityId: 'ent-nexus-vehicle-002', label: 'TS 05 CD 5500', type: 'vehicle', confidence: 0.90, sources: ['Vehicle Tracking Data'], activityAt: '2026-09-03T07:15:00Z' },
    { entityId: 'ent-nexus-vehicle-003', label: 'MH 02 EF 8899', type: 'vehicle', confidence: 0.67, sources: ['Vehicle Tracking Data'], activityAt: '2026-08-18T05:30:00Z' },
    // --- Locations (3) ---
    { entityId: 'ent-nexus-location-001', label: 'Delhi', type: 'location', confidence: 0.95, sources: ['Cell Tower Data', 'GST Ledger Extract'], activityAt: '2026-09-05T18:10:00Z' },
    { entityId: 'ent-nexus-location-002', label: 'Hyderabad', type: 'location', confidence: 0.93, sources: ['Cell Tower Data', 'GST Ledger Extract', 'Vehicle Tracking Data'], activityAt: '2026-09-06T15:00:00Z' },
    { entityId: 'ent-nexus-location-003', label: 'Mumbai', type: 'location', confidence: 0.84, sources: ['Cell Tower Data'], activityAt: '2026-08-20T12:00:00Z' },
    // --- Transactions (4) ---
    { entityId: 'ent-nexus-txn-001', label: 'TXN-NEX-001', type: 'transaction', confidence: 0.97, sources: ['Bank Transaction Log'], activityAt: '2026-09-05T18:05:00Z' },
    { entityId: 'ent-nexus-txn-002', label: 'TXN-NEX-002', type: 'transaction', confidence: 0.95, sources: ['Bank Transaction Log'], activityAt: '2026-09-06T11:15:00Z' },
    { entityId: 'ent-nexus-txn-003', label: 'TXN-NEX-003', type: 'transaction', confidence: 0.79, sources: ['Bank Transaction Log', 'Bank SWIFT Trail'], activityAt: '2026-09-04T14:35:00Z' },
    { entityId: 'ent-nexus-txn-004', label: 'TXN-NEX-004', type: 'transaction', confidence: 0.72, sources: ['Bank Transaction Log'], activityAt: '2026-08-15T10:00:00Z' },
    // --- Device (1) ---
    { entityId: 'ent-nexus-device-001', label: 'IMEI 356938035643809', type: 'phone', confidence: 0.76, sources: ['CDR Extract - Harness Cell', 'Cell Tower Data'], activityAt: '2026-09-05T16:40:00Z' },
    // --- Event (1) ---
    { entityId: 'ent-nexus-event-001', label: 'Co-location — Hyderabad Warehouse', type: 'event', confidence: 0.80, sources: ['Cell Tower Data', 'Vehicle Tracking Data'], activityAt: '2026-09-02T21:00:00Z' },
  ],

  edges: [
    // 1-14: Arjun Kapoor (hub, 14 connections)
    ['ent-nexus-person-001', 'ent-nexus-phone-001', 'USES', 0.98, 'Telecom Subscriber DB', '2026-06-15T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-vehicle-001', 'OWNS', 0.85, 'Vehicle Tracking Data', '2026-07-03T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-org-001', 'WORKS_FOR', 0.95, 'GST Ledger Extract', '2026-06-20T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-org-004', 'WORKS_FOR', 0.70, 'GST Ledger Extract', '2026-07-05T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-org-002', 'WORKS_FOR', 0.68, 'GST Ledger Extract', '2026-08-12T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-account-001', 'OWNS_ACCOUNT', 0.97, 'Bank Transaction Log', '2026-06-25T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-account-003', 'OWNS_ACCOUNT', 0.72, 'Bank Transaction Log', '2026-08-01T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-location-001', 'LOCATED_AT', 0.94, 'Cell Tower Data', '2026-06-10T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-person-002', 'KNOWS', 0.90, 'CDR Extract - Harness Cell', '2026-06-28T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-person-003', 'KNOWS', 0.78, 'CDR Extract - Harness Cell', '2026-07-15T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-person-005', 'KNOWS', 0.86, 'CDR Extract - Harness Cell', '2026-07-22T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-device-001', 'USES', 0.87, 'CDR Extract - Harness Cell', '2026-06-15T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-txn-001', 'SENT_TRANSACTION', 0.92, 'Bank Transaction Log', '2026-09-05T00:00:00Z'],
    ['ent-nexus-person-001', 'ent-nexus-txn-002', 'SENT_TRANSACTION', 0.74, 'Bank Transaction Log', '2026-09-06T00:00:00Z'],

    // 15-22: Meera Joshi (bridge, 8 connections)
    ['ent-nexus-person-005', 'ent-nexus-phone-004', 'USES', 0.92, 'Telecom Subscriber DB', '2026-07-01T00:00:00Z'],
    ['ent-nexus-person-005', 'ent-nexus-phone-005', 'USES', 0.87, 'Telecom Subscriber DB', '2026-08-10T00:00:00Z'],
    ['ent-nexus-person-005', 'ent-nexus-org-002', 'WORKS_FOR', 0.94, 'GST Ledger Extract', '2026-07-05T00:00:00Z'],
    ['ent-nexus-person-005', 'ent-nexus-org-003', 'WORKS_FOR', 0.82, 'GST Ledger Extract', '2026-08-01T00:00:00Z'],
    ['ent-nexus-person-005', 'ent-nexus-account-003', 'OWNS_ACCOUNT', 0.90, 'Bank Transaction Log', '2026-07-15T00:00:00Z'],
    ['ent-nexus-person-005', 'ent-nexus-location-002', 'LOCATED_AT', 0.95, 'Cell Tower Data', '2026-07-01T00:00:00Z'],
    ['ent-nexus-person-005', 'ent-nexus-person-006', 'KNOWS', 0.79, 'CDR Extract - Harness Cell', '2026-08-05T00:00:00Z'],
    ['ent-nexus-person-005', 'ent-nexus-person-008', 'KNOWS', 0.84, 'CDR Extract - Harness Cell', '2026-07-28T00:00:00Z'],

    // 23-28: remaining person relations
    ['ent-nexus-person-002', 'ent-nexus-phone-003', 'USES', 0.84, 'Telecom Subscriber DB', '2026-07-10T00:00:00Z'],
    ['ent-nexus-person-002', 'ent-nexus-account-002', 'OWNS_ACCOUNT', 0.83, 'Bank Transaction Log', '2026-07-20T00:00:00Z'],
    ['ent-nexus-person-002', 'ent-nexus-org-001', 'WORKS_FOR', 0.89, 'GST Ledger Extract', '2026-07-18T00:00:00Z'],
    ['ent-nexus-person-003', 'ent-nexus-phone-002', 'USES', 0.93, 'Telecom Subscriber DB', '2026-07-05T00:00:00Z'],
    ['ent-nexus-person-003', 'ent-nexus-org-001', 'WORKS_FOR', 0.80, 'GST Ledger Extract', '2026-07-22T00:00:00Z'],
    ['ent-nexus-person-003', 'ent-nexus-person-002', 'KNOWS', 0.72, 'CDR Extract - Harness Cell', '2026-07-15T00:00:00Z'],

    // 29-30: remaining person relations
    ['ent-nexus-person-004', 'ent-nexus-org-004', 'WORKS_FOR', 0.68, 'GST Ledger Extract', '2026-08-01T00:00:00Z'],
    ['ent-nexus-person-004', 'ent-nexus-person-010', 'KNOWS', 0.55, 'CDR Extract - Harness Cell', '2026-08-10T00:00:00Z'],

    // 31-38: more person relations
    ['ent-nexus-person-006', 'ent-nexus-org-002', 'WORKS_FOR', 0.85, 'GST Ledger Extract', '2026-07-15T00:00:00Z'],
    ['ent-nexus-person-006', 'ent-nexus-vehicle-002', 'OWNS', 0.82, 'Vehicle Tracking Data', '2026-07-20T00:00:00Z'],
    ['ent-nexus-person-006', 'ent-nexus-person-007', 'KNOWS', 0.68, 'CDR Extract - Harness Cell', '2026-08-01T00:00:00Z'],
    ['ent-nexus-person-007', 'ent-nexus-org-003', 'WORKS_FOR', 0.76, 'GST Ledger Extract', '2026-08-05T00:00:00Z'],
    ['ent-nexus-person-007', 'ent-nexus-vehicle-001', 'OWNS', 0.73, 'Vehicle Tracking Data', '2026-07-10T00:00:00Z'],
    ['ent-nexus-person-008', 'ent-nexus-org-002', 'WORKS_FOR', 0.90, 'GST Ledger Extract', '2026-07-18T00:00:00Z'],
    ['ent-nexus-person-008', 'ent-nexus-account-004', 'OWNS_ACCOUNT', 0.84, 'Bank Transaction Log', '2026-08-01T00:00:00Z'],
    ['ent-nexus-person-008', 'ent-nexus-event-001', 'INVOLVED_IN', 0.87, 'Cell Tower Data', '2026-09-02T00:00:00Z'],

    // 39-41: remaining person relations
    ['ent-nexus-person-009', 'ent-nexus-person-002', 'KNOWS', 0.65, 'CDR Extract - Harness Cell', '2026-07-15T00:00:00Z'],
    ['ent-nexus-person-009', 'ent-nexus-person-010', 'KNOWS', 0.60, 'CDR Extract - Harness Cell', '2026-07-18T00:00:00Z'],
    ['ent-nexus-person-010', 'ent-nexus-account-004', 'OWNS_ACCOUNT', 0.62, 'Bank Transaction Log', '2026-07-20T00:00:00Z'],

    // 42-54: organization, account and event edges
    ['ent-nexus-org-001', 'ent-nexus-location-001', 'LOCATED_AT', 0.95, 'GST Ledger Extract', '2026-06-15T00:00:00Z'],
    ['ent-nexus-org-001', 'ent-nexus-account-001', 'OWNS_ACCOUNT', 0.93, 'Bank Transaction Log', '2026-06-25T00:00:00Z'],
    ['ent-nexus-org-001', 'ent-nexus-account-002', 'OWNS_ACCOUNT', 0.86, 'Bank Transaction Log', '2026-07-01T00:00:00Z'],
    ['ent-nexus-org-001', 'ent-nexus-account-003', 'OWNS_ACCOUNT', 0.78, 'Bank Transaction Log', '2026-08-01T00:00:00Z'],
    ['ent-nexus-org-002', 'ent-nexus-location-002', 'LOCATED_AT', 0.94, 'GST Ledger Extract', '2026-07-10T00:00:00Z'],
    ['ent-nexus-org-002', 'ent-nexus-event-001', 'INVOLVED_IN', 0.81, 'Cell Tower Data', '2026-09-02T00:00:00Z'],
    ['ent-nexus-org-003', 'ent-nexus-location-002', 'LOCATED_AT', 0.89, 'GST Ledger Extract', '2026-07-15T00:00:00Z'],
    ['ent-nexus-org-003', 'ent-nexus-vehicle-003', 'OWNS', 0.71, 'Vehicle Tracking Data', '2026-07-20T00:00:00Z'],
    ['ent-nexus-org-003', 'ent-nexus-event-001', 'INVOLVED_IN', 0.83, 'Cell Tower Data', '2026-09-02T00:00:00Z'],
    ['ent-nexus-org-004', 'ent-nexus-account-003', 'OWNS_ACCOUNT', 0.75, 'Bank Transaction Log', '2026-08-05T00:00:00Z'],
    ['ent-nexus-org-001', 'ent-nexus-org-004', 'SUPPORTED_BY', 0.66, 'GST Ledger Extract', '2026-07-20T00:00:00Z'],
    ['ent-nexus-org-002', 'ent-nexus-org-003', 'SUPPORTED_BY', 0.74, 'GST Ledger Extract', '2026-08-10T00:00:00Z'],
    ['ent-nexus-org-002', 'ent-nexus-org-001', 'SUPPORTED_BY', 0.60, 'GST Ledger Extract', '2026-08-15T00:00:00Z'],

    // 55-60: money flow
    ['ent-nexus-account-001', 'ent-nexus-txn-001', 'SENT_TRANSACTION', 0.94, 'Bank Transaction Log', '2026-09-05T00:00:00Z'],
    ['ent-nexus-txn-001', 'ent-nexus-account-003', 'SENT_TRANSACTION', 0.91, 'Bank SWIFT Trail', '2026-09-05T00:00:00Z'],
    ['ent-nexus-account-002', 'ent-nexus-txn-002', 'SENT_TRANSACTION', 0.89, 'Bank Transaction Log', '2026-09-06T00:00:00Z'],
    ['ent-nexus-txn-002', 'ent-nexus-account-004', 'SENT_TRANSACTION', 0.87, 'Bank Transaction Log', '2026-09-06T00:00:00Z'],
    ['ent-nexus-account-003', 'ent-nexus-txn-003', 'SENT_TRANSACTION', 0.79, 'Bank Transaction Log', '2026-09-04T00:00:00Z'],
    ['ent-nexus-txn-004', 'ent-nexus-location-003', 'LOCATED_AT', 0.72, 'Cell Tower Data', '2026-08-15T00:00:00Z'],
  ],

  clusters: [
    {
      id: 'cl-nexus-delhi',
      label: 'Delhi Financial Core',
      nodeIds: [
        'NET-004-n-001', 'NET-004-n-002', 'NET-004-n-003', 'NET-004-n-011',
        'NET-004-n-014', 'NET-004-n-015', 'NET-004-n-017', 'NET-004-n-020',
        'NET-004-n-021', 'NET-004-n-027', 'NET-004-n-030', 'NET-004-n-031',
        'NET-004-n-034',
      ],
    },
    {
      id: 'cl-nexus-hyd',
      label: 'Hyderabad Operations',
      nodeIds: [
        'NET-004-n-005', 'NET-004-n-006', 'NET-004-n-007', 'NET-004-n-008',
        'NET-004-n-012', 'NET-004-n-013', 'NET-004-n-016', 'NET-004-n-018',
        'NET-004-n-019', 'NET-004-n-024', 'NET-004-n-025', 'NET-004-n-028',
        'NET-004-n-032',
      ],
    },
    {
      id: 'cl-nexus-flow',
      label: 'Layered Money Flow',
      nodeIds: [
        'NET-004-n-004', 'NET-004-n-009', 'NET-004-n-010', 'NET-004-n-022',
        'NET-004-n-023', 'NET-004-n-026', 'NET-004-n-029', 'NET-004-n-033',
        'NET-004-n-035',
      ],
    },
  ],
};

// Build the full graph (auto-generates node/edge IDs and computes degrees).
export const nexusNetwork = buildNetwork(NEXUS_NETWORK_SEED);

// ============================================================
// INVESTIGATION RECORD — inv-demo-nexus
// ============================================================

export const nexusInvestigationRecord: MockInvestigationRecord = {
  investigation: {
    id: 'inv-demo-nexus',
    title: 'Operation Trinetra Nexus',
    description:
      'Multi-city financial fraud probe connecting shell companies, money mules and layered transactions across Delhi, Hyderabad and Mumbai. Deterministic demonstration data — not live police data.',
    status: 'active',
    priority: 'high',
    lead_investigator: 'Inspector Mehta',
    assigned: ['Inspector Mehta', 'Analyst Singh'],
    tags: ['fraud', 'nexus', 'multi-city', 'demo'],
    case_id: null,
    entity_count: 35,
    evidence_count: 7,
    relationship_count: 60,
    finding_count: 6,
    event_count: 2,
    created_at: iso('2026-07-01T09:00:00Z'),
    updated_at: iso('2026-09-08T14:30:00Z'),
    last_activity_at: iso('2026-09-08T14:30:00Z'),
  },
  members: [
    { id: 'mem-nexus-1', investigation_id: 'inv-demo-nexus', user_id: 'u-mehta', name: 'Inspector Mehta', role: 'Lead', added_at: iso('2026-07-01T09:05:00Z') },
    { id: 'mem-nexus-2', investigation_id: 'inv-demo-nexus', user_id: 'u-singh', name: 'Analyst Singh', role: 'Analyst', added_at: iso('2026-07-01T09:06:00Z') },
  ],
  entities: [
    entityRef('ine-nexus-01', 'inv-demo-nexus', 'ent-nexus-person-001', 'Arjun Kapoor', 'person', 'Primary person of interest — hub entity', 0.94, 'Inspector Mehta', '2026-07-01T09:10:00Z'),
    entityRef('ine-nexus-02', 'inv-demo-nexus', 'ent-nexus-person-002', 'Suresh Iyer', 'person', 'Associate — accounts at BlueSky', 0.82, 'Analyst Singh', '2026-07-02T10:00:00Z'),
    entityRef('ine-nexus-03', 'inv-demo-nexus', 'ent-nexus-person-003', 'Kavya Menon', 'person', 'Associate — phone records', 0.79, 'Analyst Singh', '2026-07-03T10:00:00Z'),
    entityRef('ine-nexus-04', 'inv-demo-nexus', 'ent-nexus-person-005', 'Meera Joshi', 'person', 'Bridge entity — links Delhi and Hyderabad', 0.86, 'Inspector Mehta', '2026-07-05T11:00:00Z'),
    entityRef('ine-nexus-05', 'inv-demo-nexus', 'ent-nexus-person-006', 'Nikhil Sharma', 'person', 'Hyderabad operative', 0.77, 'Analyst Singh', '2026-07-06T10:00:00Z'),
    entityRef('ine-nexus-06', 'inv-demo-nexus', 'ent-nexus-person-008', 'Vikram Rao', 'person', 'Hyderabad operative — vehicle and account links', 0.83, 'Inspector Mehta', '2026-07-07T10:00:00Z'),
    entityRef('ine-nexus-07', 'inv-demo-nexus', 'ent-nexus-org-001', 'BlueSky Trading Solutions', 'organization', 'Primary shell company — Delhi', 0.92, 'Inspector Mehta', '2026-07-01T09:15:00Z'),
    entityRef('ine-nexus-08', 'inv-demo-nexus', 'ent-nexus-org-002', 'Pinnacle Import-Export Corp', 'organization', 'Hyderabad shell company', 0.83, 'Analyst Singh', '2026-07-05T10:00:00Z'),
    entityRef('ine-nexus-09', 'inv-demo-nexus', 'ent-nexus-org-003', 'Swift Cargo Logistics', 'organization', 'Hyderabad logistics front', 0.74, 'Analyst Singh', '2026-07-06T10:00:00Z'),
    entityRef('ine-nexus-10', 'inv-demo-nexus', 'ent-nexus-account-001', '4001 2213 5566', 'account', 'Primary account', 0.95, 'Inspector Mehta', '2026-07-10T11:00:00Z'),
    entityRef('ine-nexus-11', 'inv-demo-nexus', 'ent-nexus-account-003', '4003 1122 9900', 'account', 'Bridge account — receives layered funds', 0.80, 'Analyst Singh', '2026-07-15T10:00:00Z'),
    entityRef('ine-nexus-12', 'inv-demo-nexus', 'ent-nexus-txn-001', 'TXN-NEX-001', 'transaction', 'Large flagged transfer', 0.97, 'Inspector Mehta', '2026-09-05T18:05:00Z'),
    entityRef('ine-nexus-13', 'inv-demo-nexus', 'ent-nexus-txn-002', 'TXN-NEX-002', 'transaction', 'Second flagged transfer', 0.95, 'Analyst Singh', '2026-09-06T11:15:00Z'),
    entityRef('ine-nexus-14', 'inv-demo-nexus', 'ent-nexus-vehicle-002', 'TS 05 CD 5500', 'vehicle', 'Hyderabad vehicle', 0.90, 'Analyst Singh', '2026-09-03T07:15:00Z'),
    entityRef('ine-nexus-15', 'inv-demo-nexus', 'ent-nexus-location-001', 'Delhi', 'location', 'Primary hub location', 0.95, 'Inspector Mehta', '2026-07-01T09:20:00Z'),
    entityRef('ine-nexus-16', 'inv-demo-nexus', 'ent-nexus-location-002', 'Hyderabad', 'location', 'Secondary hub location', 0.93, 'Analyst Singh', '2026-07-05T10:05:00Z'),
    entityRef('ine-nexus-17', 'inv-demo-nexus', 'ent-nexus-phone-001', '+91 98110 22334', 'phone', 'Arjun Kapoor device', 0.96, 'Analyst Singh', '2026-07-01T09:25:00Z'),
    entityRef('ine-nexus-18', 'inv-demo-nexus', 'ent-nexus-device-001', 'IMEI 356938035643809', 'phone', 'Tracked device linked to Kapoor', 0.76, 'Analyst Singh', '2026-07-20T10:00:00Z'),
  ],
  relationships: [
    { id: 'inr-nexus-01', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-001', source_entity_id: 'ent-nexus-person-001', target_entity_id: 'ent-nexus-phone-001', source_entity_name: 'Arjun Kapoor', target_entity_name: '+91 98110 22334', type: 'USES', confidence: 0.98, linked_by: 'Analyst Singh', linked_at: iso('2026-07-01T09:30:00Z') },
    { id: 'inr-nexus-02', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-003', source_entity_id: 'ent-nexus-person-001', target_entity_id: 'ent-nexus-org-001', source_entity_name: 'Arjun Kapoor', target_entity_name: 'BlueSky Trading Solutions', type: 'WORKS_FOR', confidence: 0.95, linked_by: 'Inspector Mehta', linked_at: iso('2026-07-01T09:35:00Z') },
    { id: 'inr-nexus-03', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-005', source_entity_id: 'ent-nexus-person-001', target_entity_id: 'ent-nexus-person-002', source_entity_name: 'Arjun Kapoor', target_entity_name: 'Suresh Iyer', type: 'KNOWS', confidence: 0.90, linked_by: 'Analyst Singh', linked_at: iso('2026-07-02T10:05:00Z') },
    { id: 'inr-nexus-04', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-011', source_entity_id: 'ent-nexus-person-001', target_entity_id: 'ent-nexus-person-005', source_entity_name: 'Arjun Kapoor', target_entity_name: 'Meera Joshi', type: 'KNOWS', confidence: 0.86, linked_by: 'Inspector Mehta', linked_at: iso('2026-07-05T11:05:00Z') },
    { id: 'inr-nexus-05', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-013', source_entity_id: 'ent-nexus-person-001', target_entity_id: 'ent-nexus-txn-001', source_entity_name: 'Arjun Kapoor', target_entity_name: 'TXN-NEX-001', type: 'SENT_TRANSACTION', confidence: 0.92, linked_by: 'Inspector Mehta', linked_at: iso('2026-09-05T18:10:00Z') },
    { id: 'inr-nexus-06', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-006', source_entity_id: 'ent-nexus-person-005', target_entity_id: 'ent-nexus-org-002', source_entity_name: 'Meera Joshi', target_entity_name: 'Pinnacle Import-Export Corp', type: 'WORKS_FOR', confidence: 0.94, linked_by: 'Analyst Singh', linked_at: iso('2026-07-05T10:10:00Z') },
    { id: 'inr-nexus-07', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-008', source_entity_id: 'ent-nexus-person-005', target_entity_id: 'ent-nexus-org-003', source_entity_name: 'Meera Joshi', target_entity_name: 'Swift Cargo Logistics', type: 'WORKS_FOR', confidence: 0.82, linked_by: 'Analyst Singh', linked_at: iso('2026-08-01T10:00:00Z') },
    { id: 'inr-nexus-08', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-017', source_entity_id: 'ent-nexus-org-001', target_entity_id: 'ent-nexus-location-001', source_entity_name: 'BlueSky Trading Solutions', target_entity_name: 'Delhi', type: 'LOCATED_AT', confidence: 0.95, linked_by: 'Inspector Mehta', linked_at: iso('2026-07-01T09:40:00Z') },
    { id: 'inr-nexus-09', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-022', source_entity_id: 'ent-nexus-account-001', target_entity_id: 'ent-nexus-txn-001', source_entity_name: '4001 2213 5566', target_entity_name: 'TXN-NEX-001', type: 'SENT_TRANSACTION', confidence: 0.94, linked_by: 'Analyst Singh', linked_at: iso('2026-09-05T18:12:00Z') },
    { id: 'inr-nexus-10', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-023', source_entity_id: 'ent-nexus-txn-001', target_entity_id: 'ent-nexus-account-003', source_entity_name: 'TXN-NEX-001', target_entity_name: '4003 1122 9900', type: 'SENT_TRANSACTION', confidence: 0.91, linked_by: 'Analyst Singh', linked_at: iso('2026-09-05T18:15:00Z') },
    { id: 'inr-nexus-11', investigation_id: 'inv-demo-nexus', relationship_id: 'rel-nexus-024', source_entity_id: 'ent-nexus-account-002', target_entity_id: 'ent-nexus-txn-002', source_entity_name: '4002 7755 8877', target_entity_name: 'TXN-NEX-002', type: 'SENT_TRANSACTION', confidence: 0.89, linked_by: 'Analyst Singh', linked_at: iso('2026-09-06T11:18:00Z') },
  ],
  evidence: [
    evidenceRef('inev-nexus-01', 'inv-demo-nexus', 'ev-nexus-001', 'FIR — Delhi North financial fraud case', 'document', 'FIR-2026-021 naming Arjun Kapoor and associates in multi-city fraud.', 'Inspector Mehta', '2026-07-01T09:15:00Z'),
    evidenceRef('inev-nexus-02', 'inv-demo-nexus', 'ev-nexus-002', 'CDR extract — Harness Cell batch', 'communication', 'Call detail records linking Nexus persons across Delhi–Hyderabad.', 'Analyst Singh', '2026-07-05T10:20:00Z'),
    evidenceRef('inev-nexus-03', 'inv-demo-nexus', 'ev-nexus-003', 'Bank SWIFT trail — layered transfers', 'transaction', 'SWIFT records documenting the layered money flow through shell accounts.', 'Analyst Singh', '2026-09-06T11:25:00Z'),
    evidenceRef('inev-nexus-04', 'inv-demo-nexus', 'ev-nexus-004', 'GST ledger extract — BlueSky', 'structured_record', 'GST registration and quarterly filings for BlueSky Trading Solutions.', 'Inspector Mehta', '2026-07-01T09:20:00Z'),
    evidenceRef('inev-nexus-05', 'inv-demo-nexus', 'ev-nexus-005', 'Vehicle tracking data — Hyderabad', 'vehicle_record', 'GPS tracking of TS 05 CD 5500 linked to Vikram Rao.', 'Analyst Singh', '2026-09-03T07:20:00Z'),
    evidenceRef('inev-nexus-06', 'inv-demo-nexus', 'ev-nexus-006', 'Cell tower aggregation — Hyderabad warehouse', 'location_record', 'Tower hit placing multiple Nexus devices at the warehouse event.', 'Analyst Singh', '2026-09-02T21:05:00Z'),
    evidenceRef('inev-nexus-07', 'inv-demo-nexus', 'ev-nexus-007', 'Annotated screenshot — warehouse entry', 'image', 'Annotated still from commercial CCTV near the Hyderabad warehouse.', 'Inspector Mehta', '2026-09-03T08:00:00Z'),
  ],
  documents: [],
  events: [
    { id: 'inevn-001', investigation_id: 'inv-demo-nexus', title: 'Hyderabad warehouse co-location event', description: 'Multiple Nexus devices co-located at warehouse premises consistent with a coordination meeting.', occurred_at: iso('2026-09-02T21:00:00Z'), event_type: 'observation', entity_ids: ['ent-nexus-person-008', 'ent-nexus-org-002', 'ent-nexus-org-003'], location: 'Hyderabad', created_at: iso('2026-09-03T08:05:00Z') },
    { id: 'inevn-002', investigation_id: 'inv-demo-nexus', title: 'Layered transfer executed', description: 'INR 5,20,000 moved through three accounts in under 90 minutes — TXN-NEX-001 chain.', occurred_at: iso('2026-09-05T18:05:00Z'), event_type: 'transaction', entity_ids: ['ent-nexus-txn-001', 'ent-nexus-account-001', 'ent-nexus-account-003'], location: 'Delhi', created_at: iso('2026-09-06T11:30:00Z') },
  ],
  findings: [
    { id: 'inf-nexus-1', investigation_id: 'inv-demo-nexus', title: 'Hub entity identified — Arjun Kapoor', description: 'Arjun Kapoor maintains 14 direct relationships across persons, organizations, accounts and transactions, functioning as the central node of the Nexus network.', category: 'association', confidence: 'high', source: 'Network Analysis', source_type: 'analysis', created_by: 'Analyst Singh', created_at: iso('2026-09-01T10:00:00Z'), updated_at: iso('2026-09-01T10:00:00Z'), entity_ids: ['ent-nexus-person-001'], evidence_ids: ['inev-nexus-02'], tags: ['hub', 'centrality', 'arjun-kapoor'] },
    { id: 'inf-nexus-2', investigation_id: 'inv-demo-nexus', title: 'Bridge entity links Delhi and Hyderabad', description: 'Meera Joshi (8 direct connections) provides the only high-confidence structural bridge between the Delhi Financial Core and Hyderabad Operations clusters.', category: 'relationship', confidence: 'high', source: 'Structural Analysis', source_type: 'analysis', created_by: 'Analyst Singh', created_at: iso('2026-09-02T10:00:00Z'), updated_at: iso('2026-09-02T10:00:00Z'), entity_ids: ['ent-nexus-person-005'], evidence_ids: ['inev-nexus-02'], tags: ['bridge', 'meera-joshi'] },
    { id: 'inf-nexus-3', investigation_id: 'inv-demo-nexus', title: 'Layered transaction chain detected', description: 'Three sequential transactions (TXN-NEX-001, TXN-NEX-002, TXN-NEX-003) move funds from BlueSky accounts through bridge accounts to Pinnacle/Swift-controlled accounts within a 48-hour window.', category: 'financial', confidence: 'high', source: 'Transaction Analysis', source_type: 'analysis', created_by: 'Analyst Singh', created_at: iso('2026-09-06T12:00:00Z'), updated_at: iso('2026-09-06T12:00:00Z'), entity_ids: ['ent-nexus-txn-001', 'ent-nexus-txn-002', 'ent-nexus-txn-003', 'ent-nexus-account-001', 'ent-nexus-account-003'], evidence_ids: ['inev-nexus-03'], tags: ['money-laundering', 'layering'] },
    { id: 'inf-nexus-4', investigation_id: 'inv-demo-nexus', title: 'Shell company structure confirmed', description: 'BlueSky Trading Solutions, Pinnacle Import-Export Corp and Swift Cargo Logistics share overlapping GST registrations and bank account custodians, consistent with shell company fronting.', category: 'relationship', confidence: 'medium', source: 'GST / Bank Analysis', source_type: 'analysis', created_by: 'Inspector Mehta', created_at: iso('2026-09-03T10:00:00Z'), updated_at: iso('2026-09-03T10:00:00Z'), entity_ids: ['ent-nexus-org-001', 'ent-nexus-org-002', 'ent-nexus-org-003'], evidence_ids: ['inev-nexus-04'], tags: ['shell-companies', 'gst'] },
    { id: 'inf-nexus-5', investigation_id: 'inv-demo-nexus', title: 'Co-location event — Hyderabad warehouse', description: 'Cell tower and vehicle tracking data independently place Nexus operatives at the same Hyderabad warehouse on September 2nd, consistent with a coordination event.', category: 'location', confidence: 'medium', source: 'Geospatial Analysis', source_type: 'analysis', created_by: 'Analyst Singh', created_at: iso('2026-09-04T10:00:00Z'), updated_at: iso('2026-09-04T10:00:00Z'), entity_ids: ['ent-nexus-person-008', 'ent-nexus-org-002', 'ent-nexus-org-003'], evidence_ids: ['inev-nexus-06', 'inev-nexus-07'], tags: ['colocation', 'meeting'] },
    { id: 'inf-nexus-6', investigation_id: 'inv-demo-nexus', title: 'Money mule pathway identified', description: 'Ravi Reddy and Ananya Pillai (person-010, person-009) receive layered funds from account-003 through TXN-NEX-003, consistent with a money mule recruitment pattern.', category: 'financial', confidence: 'medium', source: 'Pattern Analysis', source_type: 'analysis', created_by: 'Inspector Mehta', created_at: iso('2026-09-07T10:00:00Z'), updated_at: iso('2026-09-07T10:00:00Z'), entity_ids: ['ent-nexus-person-009', 'ent-nexus-person-010', 'ent-nexus-account-004', 'ent-nexus-txn-003'], evidence_ids: ['inev-nexus-03'], tags: ['money-mule', 'layering'] },
  ],
  notes: [
    { id: 'inn-nexus-1', investigation_id: 'inv-demo-nexus', author: 'Inspector Mehta', body: 'Nexus probe scope: map shell company structure, identify money mule pathway, establish Delhi–Hyderabad link. Replace demo data with live intelligence as case progresses.', category: 'scope', created_at: iso('2026-07-01T09:10:00Z'), updated_at: iso('2026-07-01T09:10:00Z') },
  ],
  timeline: [
    { id: 'int-nexus-01', investigation_id: 'inv-demo-nexus', timestamp: iso('2026-07-01T09:00:00Z'), category: 'system', title: 'Investigation created', description: 'Operation Trinetra Nexus opened.', ref_id: 'inv-demo-nexus', ref_type: 'investigation', actor: 'Inspector Mehta' },
    { id: 'int-nexus-02', investigation_id: 'inv-demo-nexus', timestamp: iso('2026-09-02T21:00:00Z'), category: 'event', title: 'Hyderabad warehouse co-location', description: 'Multiple devices co-located at warehouse premises.', ref_id: 'inevn-001', ref_type: 'event', actor: null },
    { id: 'int-nexus-03', investigation_id: 'inv-demo-nexus', timestamp: iso('2026-09-05T18:05:00Z'), category: 'event', title: 'Layered transfer executed', description: 'INR 5,20,000 transferred through three accounts.', ref_id: 'inevn-002', ref_type: 'event', actor: null },
  ],
  networks: [
    { id: 'innet-nexus-1', investigation_id: 'inv-demo-nexus', network_id: 'NET-004', name: 'Operation Trinetra Nexus — relationship graph', linked_by: 'Analyst Singh', linked_at: iso('2026-07-05T10:00:00Z') },
  ],
  analyticsSnapshots: [
    { id: 'inas-nexus-1', investigation_id: 'inv-demo-nexus', network_id: 'NET-004', label: 'Nexus opening snapshot', captured_at: iso('2026-07-05T10:05:00Z'), analytics_bundle_id: null, summary: { nodes: 35, relationships: 60, connectedComponents: 1, communityCount: 3, topConnectedEntity: 'ent-nexus-person-001' } },
  ],
  activity: [
    { id: 'ina-nexus-1', investigation_id: 'inv-demo-nexus', type: 'created', title: 'Investigation created', detail: 'Operation Trinetra Nexus opened.', actor: 'Inspector Mehta', at: iso('2026-07-01T09:00:00Z') },
    { id: 'ina-nexus-2', investigation_id: 'inv-demo-nexus', type: 'entity_linked', title: 'Entity linked', detail: 'Arjun Kapoor added as primary person of interest.', actor: 'Inspector Mehta', at: iso('2026-07-01T09:10:00Z') },
    { id: 'ina-nexus-3', investigation_id: 'inv-demo-nexus', type: 'network_linked', title: 'Network linked', detail: 'NET-004 relationship graph added.', actor: 'Analyst Singh', at: iso('2026-07-05T10:00:00Z') },
    { id: 'ina-nexus-4', investigation_id: 'inv-demo-nexus', type: 'evidence_linked', title: 'Evidence linked', detail: 'CDR extract — Harness Cell batch added.', actor: 'Analyst Singh', at: iso('2026-07-05T10:20:00Z') },
    { id: 'ina-nexus-5', investigation_id: 'inv-demo-nexus', type: 'finding_created', title: 'Finding created', detail: 'Hub entity identified — Arjun Kapoor.', actor: 'Analyst Singh', at: iso('2026-09-01T10:00:00Z') },
  ],
};

// ============================================================
// ENTITY PROFILES — NEXUS_ENTITIES
// ============================================================

export const NEXUS_ENTITIES: EntityIntelligence[] = [
  // --- Persons ---
  {
    id: 'ent-nexus-person-001', name: 'Arjun Kapoor', canonicalName: 'arjun kapoor', displayName: 'Arjun Kapoor',
    entityType: 'person', description: 'Central node of the Nexus fraud network. Connected to BlueSky Trading and Golden Gate Financials. Hub entity with 14 direct connections.',
    resolutionState: 'CONFIRMED', confidence: 0.94, sourcesCount: 4, connectionsCount: 14, eventsCount: 2, evidenceCount: 5, activityCount: 8, isVerified: true, isFlagged: true,
    aliases: ['A. Kapoor', 'Arjun K.'], attributes: { full_name: 'Arjun Kapoor', phone: '+91 98110 22334', email: 'arjun.k@bluesky.example', date_of_birth: '1985-03-14', address: '45 Defence Colony, New Delhi 110024', location: 'Delhi', id_number: 'PAN AABCA1234D' },
    createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-09-08T14:30:00Z',
  },
  {
    id: 'ent-nexus-person-002', name: 'Suresh Iyer', canonicalName: 'suresh iyer', displayName: 'Suresh Iyer',
    entityType: 'person', description: 'Senior associate at BlueSky Trading Solutions. Frequent co-located with Kapoor in Delhi financial district.',
    resolutionState: 'PROBABLE', confidence: 0.82, sourcesCount: 3, connectionsCount: 7, eventsCount: 1, evidenceCount: 3, activityCount: 4, isVerified: false, isFlagged: true,
    aliases: ['S. Iyer'], attributes: { full_name: 'Suresh Iyer', phone: '+91 97770 55661', location: 'Delhi', organization: 'BlueSky Trading Solutions' },
    createdAt: '2026-07-02T10:00:00Z', updatedAt: '2026-09-01T12:40:00Z',
  },
  {
    id: 'ent-nexus-person-003', name: 'Kavya Menon', canonicalName: 'kavya menon', displayName: 'Kavya Menon',
    entityType: 'person', description: 'Phone-linked associate at BlueSky Trading. Communication spike detected with Iyer in July.',
    resolutionState: 'PROBABLE', confidence: 0.79, sourcesCount: 3, connectionsCount: 5, eventsCount: 2, evidenceCount: 2, activityCount: 3, isVerified: false, isFlagged: false,
    aliases: [], attributes: { full_name: 'Kavya Menon', phone: '+91 98980 11223', location: 'Delhi', organization: 'BlueSky Trading Solutions' },
    createdAt: '2026-07-03T10:00:00Z', updatedAt: '2026-08-28T09:15:00Z',
  },
  {
    id: 'ent-nexus-person-004', name: 'Ramesh Nair', canonicalName: 'ramesh nair', displayName: 'Ramesh Nair',
    entityType: 'person', description: 'Operative connected to Golden Gate Financials through GST ledger records.',
    resolutionState: 'POSSIBLE', confidence: 0.68, sourcesCount: 2, connectionsCount: 4, eventsCount: 1, evidenceCount: 2, activityCount: 2, isVerified: false, isFlagged: false,
    aliases: ['R. Nair'], attributes: { full_name: 'Ramesh Nair', location: 'Mumbai' },
    createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-08-10T14:00:00Z',
  },
  {
    id: 'ent-nexus-person-005', name: 'Meera Joshi', canonicalName: 'meera joshi', displayName: 'Meera Joshi',
    entityType: 'person', description: 'Bridge entity connecting Delhi Financial Core to Hyderabad Operations. Dual roles at Pinnacle and Swift Cargo. 8 direct connections.',
    resolutionState: 'CONFIRMED', confidence: 0.86, sourcesCount: 4, connectionsCount: 8, eventsCount: 2, evidenceCount: 4, activityCount: 5, isVerified: true, isFlagged: true,
    aliases: ['M. Joshi'], attributes: { full_name: 'Meera Joshi', phone: '+91 99112 88990', phone2: '+91 96544 12021', location: 'Hyderabad', organizations: ['Pinnacle Import-Export Corp', 'Swift Cargo Logistics'] },
    createdAt: '2026-07-05T11:00:00Z', updatedAt: '2026-09-06T11:20:00Z',
  },
  {
    id: 'ent-nexus-person-006', name: 'Nikhil Sharma', canonicalName: 'nikhil sharma', displayName: 'Nikhil Sharma',
    entityType: 'person', description: 'Pinnacle Import-Export operative in Hyderabad. Vehicle tracking links to warehouse events.',
    resolutionState: 'PROBABLE', confidence: 0.77, sourcesCount: 3, connectionsCount: 6, eventsCount: 1, evidenceCount: 3, activityCount: 3, isVerified: false, isFlagged: true,
    aliases: [], attributes: { full_name: 'Nikhil Sharma', location: 'Hyderabad', organization: 'Pinnacle Import-Export Corp', vehicle: 'TS 05 CD 5500' },
    createdAt: '2026-07-06T10:00:00Z', updatedAt: '2026-09-03T10:30:00Z',
  },
  {
    id: 'ent-nexus-person-007', name: 'Pooja Deshmukh', canonicalName: 'pooja deshmukh', displayName: 'Pooja Deshmukh',
    entityType: 'person', description: 'Swift Cargo Logistics associate. Linked via vehicle DL 01 AB 1234.',
    resolutionState: 'POSSIBLE', confidence: 0.71, sourcesCount: 2, connectionsCount: 3, eventsCount: 1, evidenceCount: 2, activityCount: 2, isVerified: false, isFlagged: false,
    aliases: [], attributes: { full_name: 'Pooja Deshmukh', location: 'Hyderabad', organization: 'Swift Cargo Logistics' },
    createdAt: '2026-08-05T10:00:00Z', updatedAt: '2026-08-22T08:45:00Z',
  },
  {
    id: 'ent-nexus-person-008', name: 'Vikram Rao', canonicalName: 'vikram rao', displayName: 'Vikram Rao',
    entityType: 'person', description: 'Senior Pinnacle operative. Account holder and confirmed co-location at Hyderabad warehouse event.',
    resolutionState: 'CONFIRMED', confidence: 0.83, sourcesCount: 3, connectionsCount: 6, eventsCount: 1, evidenceCount: 3, activityCount: 4, isVerified: true, isFlagged: true,
    aliases: ['V. Rao'], attributes: { full_name: 'Vikram Rao', phone: '+91 97770 55661', location: 'Hyderabad', organization: 'Pinnacle Import-Export Corp' },
    createdAt: '2026-07-07T10:00:00Z', updatedAt: '2026-09-07T15:55:00Z',
  },
  {
    id: 'ent-nexus-person-009', name: 'Ananya Pillai', canonicalName: 'ananya pillai', displayName: 'Ananya Pillai',
    entityType: 'person', description: 'Low-confidence associate linked to Iyer. Possible money mule pathway via account-004.',
    resolutionState: 'POSSIBLE', confidence: 0.66, sourcesCount: 2, connectionsCount: 3, eventsCount: 0, evidenceCount: 1, activityCount: 2, isVerified: false, isFlagged: false,
    aliases: [], attributes: { full_name: 'Ananya Pillai', location: 'Delhi' },
    createdAt: '2026-07-15T10:00:00Z', updatedAt: '2026-07-20T10:00:00Z',
  },
  {
    id: 'ent-nexus-person-010', name: 'Ravi Reddy', canonicalName: 'ravi reddy', displayName: 'Ravi Reddy',
    entityType: 'person', description: 'Weakly linked associate. Possible money mule receiving layered funds.',
    resolutionState: 'NEEDS_REVIEW', confidence: 0.58, sourcesCount: 1, connectionsCount: 2, eventsCount: 0, evidenceCount: 1, activityCount: 1, isVerified: false, isFlagged: false,
    aliases: [], attributes: { full_name: 'Ravi Reddy', location: 'Hyderabad' },
    createdAt: '2026-07-15T10:00:00Z', updatedAt: '2026-07-15T10:00:00Z',
  },

  // --- Organizations ---
  {
    id: 'ent-nexus-org-001', name: 'BlueSky Trading Solutions', canonicalName: 'bluesky trading solutions', displayName: 'BlueSky Trading Solutions',
    entityType: 'organization', description: 'Primary Delhi-based shell company. Central to the Nexus fraud network. GST registrations show overlapping custodians.',
    resolutionState: 'CONFIRMED', confidence: 0.92, sourcesCount: 4, connectionsCount: 9, eventsCount: 2, evidenceCount: 4, activityCount: 6, isVerified: true, isFlagged: true,
    aliases: ['BlueSky Trading', 'BTS'], attributes: { full_name: 'BlueSky Trading Solutions', gst: '07AABCB1234A1ZN', location: 'Delhi', type: 'Private Limited' },
    createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-09-02T10:00:00Z',
  },
  {
    id: 'ent-nexus-org-002', name: 'Pinnacle Import-Export Corp', canonicalName: 'pinnacle import-export corp', displayName: 'Pinnacle Import-Export Corp',
    entityType: 'organization', description: 'Hyderabad shell company with import-export facade. Linked to warehouse co-location event.',
    resolutionState: 'CONFIRMED', confidence: 0.83, sourcesCount: 3, connectionsCount: 7, eventsCount: 1, evidenceCount: 3, activityCount: 4, isVerified: true, isFlagged: true,
    aliases: ['Pinnacle Import', 'PIE'], attributes: { full_name: 'Pinnacle Import-Export Corp', gst: '36AABCC5678D1ZP', location: 'Hyderabad', type: 'Private Limited' },
    createdAt: '2026-07-05T10:00:00Z', updatedAt: '2026-09-04T09:20:00Z',
  },
  {
    id: 'ent-nexus-org-003', name: 'Swift Cargo Logistics', canonicalName: 'swift cargo logistics', displayName: 'Swift Cargo Logistics',
    entityType: 'organization', description: 'Hyderabad logistics front linked to Pinnacle. Warehouse event involvement confirmed.',
    resolutionState: 'PROBABLE', confidence: 0.74, sourcesCount: 2, connectionsCount: 5, eventsCount: 1, evidenceCount: 2, activityCount: 3, isVerified: false, isFlagged: true,
    aliases: ['Swift Cargo', 'SCL'], attributes: { full_name: 'Swift Cargo Logistics', gst: '36AABCD9012E1ZQ', location: 'Hyderabad', type: 'LLP' },
    createdAt: '2026-07-06T10:00:00Z', updatedAt: '2026-09-03T14:10:00Z',
  },
  {
    id: 'ent-nexus-org-004', name: 'Golden Gate Financials', canonicalName: 'golden gate financials', displayName: 'Golden Gate Financials',
    entityType: 'organization', description: 'Mumbai-based financial entity. Receives layered transactions. Kapoor-connected.',
    resolutionState: 'POSSIBLE', confidence: 0.62, sourcesCount: 2, connectionsCount: 3, eventsCount: 0, evidenceCount: 1, activityCount: 1, isVerified: false, isFlagged: false,
    aliases: ['Golden Gate', 'GGF'], attributes: { full_name: 'Golden Gate Financials', gst: '27AABCE3456F1ZT', location: 'Mumbai', type: 'Private Limited' },
    createdAt: '2026-08-05T10:00:00Z', updatedAt: '2026-08-05T11:00:00Z',
  },

  // --- Phones ---
  { id: 'ent-nexus-phone-001', name: '+91 98110 22334', canonicalName: '+919811022334', displayName: '+91 98110 22334', entityType: 'phone', resolutionState: 'CONFIRMED', confidence: 0.96, sourcesCount: 1, connectionsCount: 4, eventsCount: 0, evidenceCount: 2, activityCount: 3, isVerified: true, isFlagged: true, aliases: [], attributes: { subscriber: 'Arjun Kapoor', operator: 'Airtel', location: 'Delhi' }, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-09-05T17:30:00Z' },
  { id: 'ent-nexus-phone-002', name: '+91 98980 11223', canonicalName: '+919898011223', displayName: '+91 98980 11223', entityType: 'phone', resolutionState: 'CONFIRMED', confidence: 0.93, sourcesCount: 1, connectionsCount: 4, eventsCount: 0, evidenceCount: 2, activityCount: 2, isVerified: true, isFlagged: false, aliases: [], attributes: { subscriber: 'Kavya Menon', operator: 'Jio', location: 'Delhi' }, createdAt: '2026-07-03T10:00:00Z', updatedAt: '2026-09-03T08:50:00Z' },
  { id: 'ent-nexus-phone-003', name: '+91 97770 55661', canonicalName: '+919777055661', displayName: '+91 97770 55661', entityType: 'phone', resolutionState: 'PROBABLE', confidence: 0.84, sourcesCount: 1, connectionsCount: 3, eventsCount: 0, evidenceCount: 1, activityCount: 1, isVerified: false, isFlagged: false, aliases: [], attributes: { subscriber: 'Suresh Iyer', operator: 'Vi', location: 'Delhi' }, createdAt: '2026-07-10T10:00:00Z', updatedAt: '2026-09-01T13:20:00Z' },
  { id: 'ent-nexus-phone-004', name: '+91 99112 88990', canonicalName: '+919911288990', displayName: '+91 99112 88990', entityType: 'phone', resolutionState: 'PROBABLE', confidence: 0.78, sourcesCount: 1, connectionsCount: 2, eventsCount: 0, evidenceCount: 1, activityCount: 2, isVerified: false, isFlagged: false, aliases: [], attributes: { subscriber: 'Meera Joshi', operator: 'Airtel', location: 'Hyderabad' }, createdAt: '2026-07-05T11:00:00Z', updatedAt: '2026-09-06T10:10:00Z' },
  { id: 'ent-nexus-phone-005', name: '+91 96544 12021', canonicalName: '+919654412021', displayName: '+91 96544 12021', entityType: 'phone', resolutionState: 'POSSIBLE', confidence: 0.66, sourcesCount: 1, connectionsCount: 2, eventsCount: 0, evidenceCount: 1, activityCount: 1, isVerified: false, isFlagged: false, aliases: [], attributes: { subscriber: 'Meera Joshi', operator: 'Jio', location: 'Hyderabad' }, createdAt: '2026-08-10T10:00:00Z', updatedAt: '2026-09-06T09:05:00Z' },

  // --- Accounts ---
  { id: 'ent-nexus-account-001', name: '4001 2213 5566', canonicalName: '400122135566', displayName: '4001 2213 5566', entityType: 'account', resolutionState: 'CONFIRMED', confidence: 0.95, sourcesCount: 1, connectionsCount: 5, eventsCount: 1, evidenceCount: 3, activityCount: 4, isVerified: true, isFlagged: true, aliases: [], attributes: { bank: 'State Bank of India', account_type: 'Current', holder: 'BlueSky Trading Solutions' }, createdAt: '2026-06-25T10:00:00Z', updatedAt: '2026-09-05T18:00:00Z' },
  { id: 'ent-nexus-account-002', name: '4002 7755 8877', canonicalName: '400277558877', displayName: '4002 7755 8877', entityType: 'account', resolutionState: 'PROBABLE', confidence: 0.85, sourcesCount: 1, connectionsCount: 4, eventsCount: 1, evidenceCount: 2, activityCount: 3, isVerified: false, isFlagged: true, aliases: [], attributes: { bank: 'HDFC Bank', account_type: 'Current', holder: 'BlueSky Trading Solutions' }, createdAt: '2026-07-01T10:00:00Z', updatedAt: '2026-09-01T12:00:00Z' },
  { id: 'ent-nexus-account-003', name: '4003 1122 9900', canonicalName: '400311229900', displayName: '4003 1122 9900', entityType: 'account', resolutionState: 'PROBABLE', confidence: 0.80, sourcesCount: 1, connectionsCount: 6, eventsCount: 2, evidenceCount: 3, activityCount: 4, isVerified: false, isFlagged: true, aliases: [], attributes: { bank: 'ICICI Bank', account_type: 'Current', holder: 'Golden Gate Financials', controller: 'Meera Joshi' }, createdAt: '2026-07-15T10:00:00Z', updatedAt: '2026-09-06T11:00:00Z' },
  { id: 'ent-nexus-account-004', name: '4004 5566 0011', canonicalName: '400455660011', displayName: '4004 5566 0011', entityType: 'account', resolutionState: 'POSSIBLE', confidence: 0.70, sourcesCount: 1, connectionsCount: 4, eventsCount: 1, evidenceCount: 2, activityCount: 2, isVerified: false, isFlagged: false, aliases: [], attributes: { bank: 'Axis Bank', account_type: 'Savings', holder: 'Vikram Rao' }, createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-09-04T14:30:00Z' },

  // --- Vehicles ---
  { id: 'ent-nexus-vehicle-001', name: 'DL 01 AB 1234', canonicalName: 'dl01ab1234', displayName: 'DL 01 AB 1234', entityType: 'vehicle', resolutionState: 'PROBABLE', confidence: 0.83, sourcesCount: 1, connectionsCount: 3, eventsCount: 0, evidenceCount: 1, activityCount: 1, isVerified: false, isFlagged: false, aliases: [], attributes: { make: 'Toyota', model: 'Innova', year: 2021, color: 'White', registered_to: 'Pooja Deshmukh' }, createdAt: '2026-07-03T10:00:00Z', updatedAt: '2026-09-04T06:40:00Z' },
  { id: 'ent-nexus-vehicle-002', name: 'TS 05 CD 5500', canonicalName: 'ts05cd5500', displayName: 'TS 05 CD 5500', entityType: 'vehicle', resolutionState: 'CONFIRMED', confidence: 0.90, sourcesCount: 1, connectionsCount: 4, eventsCount: 0, evidenceCount: 2, activityCount: 2, isVerified: true, isFlagged: true, aliases: [], attributes: { make: 'Hyundai', model: 'Creta', year: 2022, color: 'Silver', registered_to: 'Nikhil Sharma' }, createdAt: '2026-07-20T10:00:00Z', updatedAt: '2026-09-03T07:15:00Z' },
  { id: 'ent-nexus-vehicle-003', name: 'MH 02 EF 8899', canonicalName: 'mh02ef8899', displayName: 'MH 02 EF 8899', entityType: 'vehicle', resolutionState: 'POSSIBLE', confidence: 0.67, sourcesCount: 1, connectionsCount: 2, eventsCount: 0, evidenceCount: 1, activityCount: 1, isVerified: false, isFlagged: false, aliases: [], attributes: { make: 'Tata', model: 'Ace', year: 2020, color: 'Blue', registered_to: 'Swift Cargo Logistics' }, createdAt: '2026-07-20T10:00:00Z', updatedAt: '2026-08-18T05:30:00Z' },

  // --- Locations ---
  { id: 'ent-nexus-location-001', name: 'Delhi', canonicalName: 'delhi', displayName: 'Delhi', entityType: 'location', resolutionState: 'CONFIRMED', confidence: 0.95, sourcesCount: 2, connectionsCount: 10, eventsCount: 1, evidenceCount: 3, activityCount: 5, isVerified: true, isFlagged: true, aliases: [], attributes: { type: 'City', state: 'Delhi', country: 'India' }, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-09-05T18:10:00Z' },
  { id: 'ent-nexus-location-002', name: 'Hyderabad', canonicalName: 'hyderabad', displayName: 'Hyderabad', entityType: 'location', resolutionState: 'CONFIRMED', confidence: 0.93, sourcesCount: 3, connectionsCount: 8, eventsCount: 1, evidenceCount: 2, activityCount: 4, isVerified: true, isFlagged: true, aliases: [], attributes: { type: 'City', state: 'Telangana', country: 'India' }, createdAt: '2026-07-05T10:00:00Z', updatedAt: '2026-09-06T15:00:00Z' },
  { id: 'ent-nexus-location-003', name: 'Mumbai', canonicalName: 'mumbai', displayName: 'Mumbai', entityType: 'location', resolutionState: 'PROBABLE', confidence: 0.84, sourcesCount: 1, connectionsCount: 6, eventsCount: 0, evidenceCount: 1, activityCount: 1, isVerified: false, isFlagged: false, aliases: [], attributes: { type: 'City', state: 'Maharashtra', country: 'India' }, createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-08-20T12:00:00Z' },

  // --- Transactions ---
  { id: 'ent-nexus-txn-001', name: 'TXN-NEX-001', canonicalName: 'txn-nex-001', displayName: 'TXN-NEX-001', entityType: 'transaction', resolutionState: 'CONFIRMED', confidence: 0.97, sourcesCount: 1, connectionsCount: 4, eventsCount: 1, evidenceCount: 3, activityCount: 3, isVerified: true, isFlagged: true, aliases: [], attributes: { amount: 'INR 5,20,000', sender: '4001 2213 5566', receiver: '4003 1122 9900', date: '2026-09-05' }, createdAt: '2026-09-05T18:05:00Z', updatedAt: '2026-09-05T18:05:00Z' },
  { id: 'ent-nexus-txn-002', name: 'TXN-NEX-002', canonicalName: 'txn-nex-002', displayName: 'TXN-NEX-002', entityType: 'transaction', resolutionState: 'CONFIRMED', confidence: 0.95, sourcesCount: 1, connectionsCount: 4, eventsCount: 1, evidenceCount: 2, activityCount: 2, isVerified: true, isFlagged: true, aliases: [], attributes: { amount: 'INR 3,80,000', sender: '4002 7755 8877', receiver: '4004 5566 0011', date: '2026-09-06' }, createdAt: '2026-09-06T11:15:00Z', updatedAt: '2026-09-06T11:15:00Z' },
  { id: 'ent-nexus-txn-003', name: 'TXN-NEX-003', canonicalName: 'txn-nex-003', displayName: 'TXN-NEX-003', entityType: 'transaction', resolutionState: 'PROBABLE', confidence: 0.79, sourcesCount: 2, connectionsCount: 3, eventsCount: 0, evidenceCount: 2, activityCount: 1, isVerified: false, isFlagged: true, aliases: [], attributes: { amount: 'INR 2,10,000', sender: '4003 1122 9900', receiver: '4004 5566 0011', date: '2026-09-04' }, createdAt: '2026-09-04T14:35:00Z', updatedAt: '2026-09-04T14:35:00Z' },
  { id: 'ent-nexus-txn-004', name: 'TXN-NEX-004', canonicalName: 'txn-nex-004', displayName: 'TXN-NEX-004', entityType: 'transaction', resolutionState: 'POSSIBLE', confidence: 0.72, sourcesCount: 1, connectionsCount: 1, eventsCount: 0, evidenceCount: 1, activityCount: 1, isVerified: false, isFlagged: false, aliases: [], attributes: { amount: 'INR 1,50,000', note: 'Located via Mumbai cell tower data', date: '2026-08-15' }, createdAt: '2026-08-15T10:00:00Z', updatedAt: '2026-08-15T10:00:00Z' },

  // --- Device ---
  { id: 'ent-nexus-device-001', name: 'IMEI 356938035643809', canonicalName: 'imei356938035643809', displayName: 'IMEI 356938035643809', entityType: 'phone', description: 'Secondary device linked to Arjun Kapoor. IMEI tracked via CDR and cell tower.', resolutionState: 'PROBABLE', confidence: 0.76, sourcesCount: 2, connectionsCount: 3, eventsCount: 0, evidenceCount: 1, activityCount: 2, isVerified: false, isFlagged: true, aliases: [], attributes: { type: 'Mobile Device', imei: '356938035643809', linked_to: 'Arjun Kapoor' }, createdAt: '2026-07-20T10:00:00Z', updatedAt: '2026-09-05T16:40:00Z' },

  // --- Event ---
  { id: 'ent-nexus-event-001', name: 'Co-location — Hyderabad Warehouse', canonicalName: 'colocation hyderabad warehouse', displayName: 'Co-location — Hyderabad Warehouse', entityType: 'event', description: 'Multiple Nexus devices co-located at Hyderabad warehouse premises on September 2nd, consistent with a coordination event.', resolutionState: 'PROBABLE', confidence: 0.80, sourcesCount: 2, connectionsCount: 2, eventsCount: 0, evidenceCount: 2, activityCount: 1, isVerified: false, isFlagged: true, aliases: [], attributes: { event_date: '2026-09-02', location: 'Hyderabad', co_location_count: 4 }, createdAt: '2026-09-03T08:05:00Z', updatedAt: '2026-09-03T08:05:00Z' },
];

// ============================================================
// EVIDENCE ITEMS — NEXUS_EVIDENCE_ITEMS
// ============================================================

const nexusProv = (source: string, sourceId: string, observedAt: string, createdAt: string, loc?: string, recId?: string): import('@trinetra-pulse/types').EvidenceProvenance => ({
  source,
  sourceId,
  observedAt: iso(observedAt),
  createdAt: iso(createdAt),
  version: 1,
  reviewState: 'PENDING',
  location: loc,
  recordIdentifier: recId,
});

const nexusLink = (
  targetId: string,
  targetType: 'entity' | 'relationship' | 'finding' | 'event' | 'evidence',
  relationType: import('@trinetra-pulse/types').EvidenceRelationType,
  confidence: number,
  method: import('@trinetra-pulse/types').ExtractionMethod,
  timestamp: string,
  note?: string,
): import('@trinetra-pulse/types').EvidenceLink => ({
  targetId,
  targetType,
  relationType,
  confidence,
  extractionMethod: method,
  timestamp: iso(timestamp),
  provenance: nexusProv('system', 'system', timestamp, timestamp),
  note,
});

export const NEXUS_EVIDENCE_ITEMS: EvidenceItem[] = [
  // 1: FIR
  {
    id: 'ev-nexus-001', title: 'FIR-2026-021 — Delhi North financial fraud',
    description: 'FIR filed at Delhi North district naming Arjun Kapoor and associates for multi-city shell company fraud.',
    evidenceType: 'FIR', status: 'VERIFIED', investigationId: 'inv-demo-nexus',
    datasetId: 'ds-nexus-001', datasetName: 'FIR Records - Delhi North',
    documentId: 'ent-nexus-doc-001', sourceRecord: 'FIR-2026-021', sourceName: 'FIR Records - Delhi North',
    extractionMethod: 'STRUCTURED_MAPPING', extractionConfidence: 0.97, observedAt: '2026-06-28T09:00:00Z',
    createdAt: '2026-07-01T09:15:00Z', updatedAt: '2026-07-01T09:15:00Z',
    provenance: nexusProv('FIR Records - Delhi North', 'FIR-2026-021', '2026-06-28T09:00:00Z', '2026-07-01T09:15:00Z', 'Delhi North Police Station', 'FIR-2026-021'),
    metadata: { mimeType: 'application/pdf', fileSize: 312000, pageCount: 4, document: { documentType: 'FIR', author: 'Inspector Sharma', issuer: 'Delhi North Police Station', classification: 'OFFICIAL' } },
    snippet: { text: 'FIR No. 2026/021 under Sections 420, 468, 471 IPC and Section 66D IT Act. Named accused: Arjun Kapoor s/o Mahesh Kapoor, age 41, resident of New Delhi.', truncated: false, isDemoContent: true },
    links: [nexusLink('ent-nexus-person-001', 'entity', 'IDENTIFIES', 0.97, 'STRUCTURED_MAPPING', '2026-06-28T09:00:00Z', 'Named accused'), nexusLink('ent-nexus-person-002', 'entity', 'MENTIONS', 0.88, 'STRUCTURED_MAPPING', '2026-06-28T09:00:00Z', 'Named associate'), nexusLink('ent-nexus-org-001', 'entity', 'MENTIONS', 0.92, 'STRUCTURED_MAPPING', '2026-06-28T09:00:00Z', 'Company named in FIR')],
    versions: [], timeline: [{ id: 'evt-nx-001', evidenceId: 'ev-nexus-001', eventType: 'created', title: 'FIR ingested', actor: 'system', timestamp: iso('2026-07-01T09:15:00Z') }],
    isDemoData: true, tags: ['fir', 'primary', 'arjun-kapoor', 'delhi'],
  },

  // 2: CDR
  {
    id: 'ev-nexus-002', title: 'CDR extract — Harness Cell batch',
    description: 'Call detail record batch linking Nexus persons across Delhi and Hyderabad via communication frequency analysis.',
    evidenceType: 'COMMUNICATION', status: 'VERIFIED', investigationId: 'inv-demo-nexus',
    datasetId: 'ds-nexus-002', datasetName: 'CDR Extract - Harness Cell',
    sourceRecord: 'cdr_harness_nexus.csv', sourceName: 'CDR Extract - Harness Cell',
    extractionMethod: 'STRUCTURED_MAPPING', extractionConfidence: 0.94, observedAt: '2026-06-15T00:00:00Z',
    createdAt: '2026-07-05T10:20:00Z', updatedAt: '2026-07-05T10:20:00Z',
    provenance: nexusProv('CDR Extract - Harness Cell', 'cdr_harness_nexus.csv', '2026-06-15T00:00:00Z', '2026-07-05T10:20:00Z', undefined, 'cdr_harness_nexus.csv'),
    metadata: { participants: [{ role: 'sender', identifier: '+91 98110 22334', name: 'Arjun Kapoor' }, { role: 'recipient', identifier: '+91 99112 88990', name: 'Meera Joshi' }] },
    snippet: { text: 'Outgoing call +91 98110 22334 → +91 99112 88990 | 14:22:03 IST | Duration 4m 12s | Cell: DL-North-042', truncated: false, isDemoContent: true },
    links: [nexusLink('ent-nexus-person-001', 'entity', 'IDENTIFIES', 0.96, 'STRUCTURED_MAPPING', '2026-06-15T00:00:00Z'), nexusLink('ent-nexus-person-005', 'entity', 'IDENTIFIES', 0.93, 'STRUCTURED_MAPPING', '2026-06-15T00:00:00Z'), nexusLink('inf-nexus-1', 'finding', 'SUPPORTS', 0.9, 'ANALYTICAL', '2026-09-01T10:00:00Z', 'Supports hub finding')],
    versions: [], timeline: [{ id: 'evt-nx-002', evidenceId: 'ev-nexus-002', eventType: 'created', title: 'CDR batch ingested', actor: 'system', timestamp: iso('2026-07-05T10:20:00Z') }],
    isDemoData: true, tags: ['cdr', 'communication', 'delhi', 'hyderabad'],
  },

  // 3: Bank SWIFT
  {
    id: 'ev-nexus-003', title: 'Bank SWIFT trail — layered transfers',
    description: 'SWIFT message records documenting the layered money flow from BlueSky accounts through bridge accounts.',
    evidenceType: 'TRANSACTION', status: 'VERIFIED', investigationId: 'inv-demo-nexus',
    datasetId: 'ds-nexus-003', datasetName: 'Bank SWIFT Trail',
    sourceRecord: 'swift_nexus_q3.csv', sourceName: 'Bank SWIFT Trail',
    extractionMethod: 'STRUCTURED_MAPPING', extractionConfidence: 0.96, observedAt: '2026-09-05T18:05:00Z',
    createdAt: '2026-09-06T11:25:00Z', updatedAt: '2026-09-06T11:25:00Z',
    provenance: nexusProv('Bank SWIFT Trail', 'swift_nexus_q3.csv', '2026-09-05T18:05:00Z', '2026-09-06T11:25:00Z', undefined, 'swift_nexus_q3.csv'),
    metadata: { financial: { amount: 520000, currency: 'INR', senderAccount: '4001 2213 5566', receiverAccount: '4003 1122 9900', reference: 'TXN-NEX-001' } },
    snippet: { text: 'SWIFT MT103 | Sender: SBI Delhi | BIC: SBININBB | Amount: INR 520000 | Value: 2026-09-05 | Ref: TXN-NEX-001', truncated: false, isDemoContent: true },
    links: [nexusLink('ent-nexus-txn-001', 'entity', 'IDENTIFIES', 0.97, 'STRUCTURED_MAPPING', '2026-09-05T18:05:00Z'), nexusLink('ent-nexus-account-001', 'entity', 'MENTIONS', 0.96, 'STRUCTURED_MAPPING', '2026-09-05T18:05:00Z'), nexusLink('ent-nexus-account-003', 'entity', 'MENTIONS', 0.94, 'STRUCTURED_MAPPING', '2026-09-05T18:05:00Z'), nexusLink('inf-nexus-3', 'finding', 'SUPPORTS', 0.95, 'ANALYTICAL', '2026-09-06T12:00:00Z')],
    versions: [], timeline: [{ id: 'evt-nx-003', evidenceId: 'ev-nexus-003', eventType: 'created', title: 'SWIFT records ingested', actor: 'system', timestamp: iso('2026-09-06T11:25:00Z') }],
    isDemoData: true, tags: ['swift', 'transaction', 'money-laundering', 'layering'],
  },

  // 4: GST
  {
    id: 'ev-nexus-004', title: 'GST ledger extract — BlueSky Trading',
    description: 'GST registration and quarterly filings for BlueSky Trading Solutions showing overlapping director addresses.',
    evidenceType: 'DOCUMENT', status: 'VERIFIED', investigationId: 'inv-demo-nexus',
    datasetId: 'ds-nexus-004', datasetName: 'GST Ledger Extract',
    sourceRecord: 'gst_bluesky_q2q3.csv', sourceName: 'GST Ledger Extract',
    extractionMethod: 'STRUCTURED_MAPPING', extractionConfidence: 0.91, observedAt: '2026-07-01T09:00:00Z',
    createdAt: '2026-07-01T09:20:00Z', updatedAt: '2026-07-01T09:20:00Z',
    provenance: nexusProv('GST Ledger Extract', 'gst_bluesky_q2q3.csv', '2026-07-01T09:00:00Z', '2026-07-01T09:20:00Z', undefined, 'gst_bluesky_q2q3.csv'),
    metadata: { mimeType: 'text/csv', document: { documentType: 'GST Registration', issuer: 'GSTN', classification: 'PUBLIC' } },
    snippet: { text: 'GSTIN: 07AABCB1234A1ZN | Trade Name: BlueSky Trading Solutions | Registration: 2024-03-15 | Status: Active | Address: 45 Defence Colony, New Delhi', truncated: false, isDemoContent: true },
    links: [nexusLink('ent-nexus-org-001', 'entity', 'IDENTIFIES', 0.92, 'STRUCTURED_MAPPING', '2026-07-01T09:00:00Z', 'GST registration'), nexusLink('inf-nexus-4', 'finding', 'SUPPORTS', 0.85, 'ANALYTICAL', '2026-09-03T10:00:00Z')],
    versions: [], timeline: [{ id: 'evt-nx-004', evidenceId: 'ev-nexus-004', eventType: 'created', title: 'GST record ingested', actor: 'system', timestamp: iso('2026-07-01T09:20:00Z') }],
    isDemoData: true, tags: ['gst', 'bluesky', 'document'],
  },

  // 5: Vehicle
  {
    id: 'ev-nexus-005', title: 'Vehicle tracking — Hyderabad routes',
    description: 'GPS tracking data for TS 05 CD 5500 placing it at the Hyderabad warehouse on September 2-3.',
    evidenceType: 'VEHICLE', status: 'VERIFIED', investigationId: 'inv-demo-nexus',
    datasetId: 'ds-nexus-005', datasetName: 'Vehicle Tracking Data',
    sourceRecord: 'vehicle_hyd_sep2026.csv', sourceName: 'Vehicle Tracking Data',
    extractionMethod: 'STRUCTURED_MAPPING', extractionConfidence: 0.89, observedAt: '2026-09-02T14:00:00Z',
    createdAt: '2026-09-03T07:20:00Z', updatedAt: '2026-09-03T07:20:00Z',
    provenance: nexusProv('Vehicle Tracking Data', 'vehicle_hyd_sep2026.csv', '2026-09-02T14:00:00Z', '2026-09-03T07:20:00Z'),
    metadata: { vehicle: { registrationNumber: 'TS 05 CD 5500', make: 'Hyundai', model: 'Creta', year: 2022, color: 'Silver' }, geographic: { latitude: 17.3850, longitude: 78.4867, address: 'Industrial Area Phase II, Hyderabad' } },
    snippet: { text: 'TS 05 CD 5500 | GPS fix 17.3850, 78.4867 | Time: 2026-09-02 14:22:41 IST | Speed: 0 km/h | Dwell: 3h 12m', truncated: false, isDemoContent: true },
    links: [nexusLink('ent-nexus-vehicle-002', 'entity', 'IDENTIFIES', 0.90, 'STRUCTURED_MAPPING', '2026-09-02T14:00:00Z'), nexusLink('ent-nexus-location-002', 'entity', 'MENTIONS', 0.92, 'STRUCTURED_MAPPING', '2026-09-02T14:00:00Z'), nexusLink('inf-nexus-5', 'finding', 'SUPPORTS', 0.88, 'ANALYTICAL', '2026-09-04T10:00:00Z')],
    versions: [], timeline: [{ id: 'evt-nx-005', evidenceId: 'ev-nexus-005', eventType: 'created', title: 'Vehicle tracking ingested', actor: 'system', timestamp: iso('2026-09-03T07:20:00Z') }],
    isDemoData: true, tags: ['vehicle', 'tracking', 'hyderabad', 'warehouse'],
  },

  // 6: Location
  {
    id: 'ev-nexus-006', title: 'Cell tower aggregation — Hyderabad warehouse',
    description: 'Tower hit data placing multiple Nexus devices within a 500m radius of the Hyderabad warehouse on September 2nd.',
    evidenceType: 'LOCATION', status: 'VERIFIED', investigationId: 'inv-demo-nexus',
    datasetId: 'ds-nexus-006', datasetName: 'Cell Tower Data',
    sourceRecord: 'tower_hyd_sep2.json', sourceName: 'Cell Tower Data',
    extractionMethod: 'RULE_BASED', extractionConfidence: 0.88, observedAt: '2026-09-02T21:00:00Z',
    createdAt: '2026-09-02T21:05:00Z', updatedAt: '2026-09-02T21:05:00Z',
    provenance: nexusProv('Cell Tower Data', 'tower_hyd_sep2.json', '2026-09-02T21:00:00Z', '2026-09-02T21:05:00Z'),
    metadata: { geographic: { latitude: 17.3850, longitude: 78.4867, area: 'Industrial Area Phase II, Hyderabad' } },
    snippet: { text: 'Tower: HYD-IND-017 | Sector radius: 500m | Devices detected: 4 | Window: 19:00–23:00 IST | Matched entities: +91 97770 55661, +91 99112 88990, +91 98980 11223, +91 96544 12021', truncated: false, isDemoContent: true },
    links: [nexusLink('ent-nexus-location-002', 'entity', 'IDENTIFIES', 0.93, 'RULE_BASED', '2026-09-02T21:00:00Z'), nexusLink('ent-nexus-event-001', 'entity', 'REFERENCES', 0.85, 'RULE_BASED', '2026-09-02T21:00:00Z', 'Warehouse co-location event'), nexusLink('inf-nexus-5', 'finding', 'SUPPORTS', 0.90, 'ANALYTICAL', '2026-09-04T10:00:00Z')],
    versions: [], timeline: [{ id: 'evt-nx-006', evidenceId: 'ev-nexus-006', eventType: 'created', title: 'Tower data processed', actor: 'system', timestamp: iso('2026-09-02T21:05:00Z') }],
    isDemoData: true, tags: ['cell-tower', 'colocation', 'hyderabad', 'warehouse'],
  },

  // 7: Image
  {
    id: 'ev-nexus-007', title: 'CCTV still — Hyderabad warehouse entry',
    description: 'Annotated CCTV still from commercial camera near the Hyderabad warehouse, showing a silver Hyundai Creta (TS 05 CD 5500) entering the premises.',
    evidenceType: 'IMAGE', status: 'REQUIRES_REVIEW', investigationId: 'inv-demo-nexus',
    datasetId: 'ds-nexus-007', datasetName: 'Hyderabad Warehouse CCTV',
    sourceRecord: 'cctv_hyd_entrance_20260902.jpg', sourceName: 'Hyderabad Warehouse CCTV',
    extractionMethod: 'AI_CV', extractionConfidence: 0.82, observedAt: '2026-09-02T14:18:00Z',
    createdAt: '2026-09-03T08:00:00Z', updatedAt: '2026-09-03T08:00:00Z',
    provenance: nexusProv('Hyderabad Warehouse CCTV', 'cctv_hyd_entrance_20260902.jpg', '2026-09-02T14:18:00Z', '2026-09-03T08:00:00Z', 'Hyderabad Warehouse', 'cctv_hyd_entrance_20260902.jpg'),
    metadata: { mimeType: 'image/jpeg', fileSize: 2458624, dimensions: { width: 1920, height: 1080 } },
    snippet: { text: 'AI CV detection: Silver SUV (probability 0.82) | Plate region partial match: TS 05 CD | Timestamp overlay: 2026-09-02 14:18:07 IST', truncated: false, isDemoContent: true },
    links: [nexusLink('ent-nexus-vehicle-002', 'entity', 'REFERENCES', 0.82, 'AI_CV', '2026-09-02T14:18:00Z', 'Vehicle plate partial match'), nexusLink('ent-nexus-location-002', 'entity', 'REFERENCES', 0.78, 'AI_CV', '2026-09-02T14:18:00Z', 'Warehouse entrance')],
    versions: [], timeline: [{ id: 'evt-nx-007', evidenceId: 'ev-nexus-007', eventType: 'created', title: 'CCTV still ingested', actor: 'system', timestamp: iso('2026-09-03T08:00:00Z') }],
    isDemoData: true, tags: ['image', 'cctv', 'hyderabad', 'vehicle'],
  },
];

// ============================================================
// FINDINGS — NEXUS_FINDINGS (RecentIntelligence[])
// ============================================================

export const NEXUS_FINDINGS: RecentIntelligence[] = [
  { id: 'nfi-001', type: 'relationship', title: 'New hub relationship confirmed', description: 'Arjun Kapoor linked to BlueSky Trading via GST registration cross-reference.', entities: [{ id: 'ent-nexus-person-001', name: 'Arjun Kapoor', type: 'person' }, { id: 'ent-nexus-org-001', name: 'BlueSky Trading Solutions', type: 'organization' }], confidence: 0.95, severity: 'high', source: 'GST Ledger Analysis', timestamp: '2026-09-08T14:00:00Z', timeAgo: '30 minutes ago' },
  { id: 'nfi-002', type: 'anomaly', title: 'Layered transfer pattern', description: 'Three sequential transactions above INR 1,50,000 across three linked accounts within 48 hours.', entities: [{ id: 'ent-nexus-txn-001', name: 'TXN-NEX-001', type: 'transaction' }, { id: 'ent-nexus-account-001', name: '4001 2213 5566', type: 'account' }], confidence: 0.91, severity: 'high', source: 'Transaction Monitor', timestamp: '2026-09-06T12:00:00Z', timeAgo: '2 days ago' },
  { id: 'nfi-003', type: 'pattern', title: 'Bridge entity connects two cities', description: 'Meera Joshi provides the only high-confidence structural bridge between Delhi and Hyderabad network clusters.', entities: [{ id: 'ent-nexus-person-005', name: 'Meera Joshi', type: 'person' }, { id: 'ent-nexus-location-001', name: 'Delhi', type: 'location' }, { id: 'ent-nexus-location-002', name: 'Hyderabad', type: 'location' }], confidence: 0.87, severity: 'medium', source: 'Structural Analysis', timestamp: '2026-09-02T10:00:00Z', timeAgo: '6 days ago' },
  { id: 'nfi-004', type: 'entity', title: 'Risk score elevated — Vikram Rao', description: 'Vikram Rao confirmed co-location at warehouse event and linked to Pinnacle Import-Export.', entities: [{ id: 'ent-nexus-person-008', name: 'Vikram Rao', type: 'person' }], confidence: 0.86, severity: 'high', source: 'Risk Engine', timestamp: '2026-09-03T08:10:00Z', timeAgo: '5 days ago' },
  { id: 'nfi-005', type: 'evidence', title: 'CCTV vehicle match pending review', description: 'AI CV detection of silver Hyundai Creta matching TS 05 CD 5500 at Hyderabad warehouse entrance.', entities: [{ id: 'ent-nexus-vehicle-002', name: 'TS 05 CD 5500', type: 'vehicle' }], confidence: 0.82, severity: 'medium', source: 'Evidence Analysis', timestamp: '2026-09-03T08:15:00Z', timeAgo: '5 days ago' },
];

// ============================================================
// SUSPICIOUS PATTERNS — NEXUS_PATTERNS (SuspiciousPattern[])
// ============================================================

export const NEXUS_PATTERNS: SuspiciousPattern[] = [
  { id: 'nsp-001', type: 'transaction_anomaly', typeLabel: 'Transaction Anomaly', title: 'Structured layering via shell accounts', description: 'Multiple transactions just below INR 5,50,000 across BlueSky-linked accounts moving to Golden Gate-controlled accounts.', entities: [{ id: 'ent-nexus-person-001', name: 'Arjun Kapoor', type: 'person' }, { id: 'ent-nexus-org-001', name: 'BlueSky Trading Solutions', type: 'organization' }], entityCount: 5, confidence: 0.91, severity: 'high', metrics: { 'Entities Involved': '5', 'Time Window': '48 hours', 'Total Amount': 'INR 11,10,000' }, timestamp: '2026-09-06T12:10:00Z', timeAgo: '2 days ago', status: 'reviewing' },
  { id: 'nsp-002', type: 'location_pattern', typeLabel: 'Location Pattern', title: 'Cross-city device convergence', description: 'Four devices from separate network segments co-located at Hyderabad warehouse within 4-hour window.', entities: [{ id: 'ent-nexus-person-005', name: 'Meera Joshi', type: 'person' }, { id: 'ent-nexus-person-008', name: 'Vikram Rao', type: 'person' }, { id: 'ent-nexus-location-002', name: 'Hyderabad', type: 'location' }], entityCount: 6, confidence: 0.87, severity: 'high', metrics: { 'Devices': '4', 'Area': 'Industrial Phase II', 'Duration': '4 hours' }, timestamp: '2026-09-03T08:20:00Z', timeAgo: '5 days ago', status: 'new' },
  { id: 'nsp-003', type: 'communication_spike', typeLabel: 'Communication Spike', title: 'Pre-event call burst', description: 'Unusual volume of calls between Delhi and Hyderabad numbers 48 hours before the warehouse co-location event.', entities: [{ id: 'ent-nexus-person-001', name: 'Arjun Kapoor', type: 'person' }, { id: 'ent-nexus-phone-004', name: '+91 99112 88990', type: 'phone' }], entityCount: 6, confidence: 0.82, severity: 'medium', metrics: { 'Calls': '47 in 48h', 'Window': 'Aug 31 – Sep 1', 'Baseline': '8 calls/week' }, timestamp: '2026-09-03T08:25:00Z', timeAgo: '5 days ago', status: 'reviewing' },
  { id: 'nsp-004', type: 'velocity_anomaly', typeLabel: 'Velocity Anomaly', title: 'Rapid new connection — Meera Joshi', description: 'Meera Joshi established 4 new connections in a single week, well above her baseline of 1.5/week.', entities: [{ id: 'ent-nexus-person-005', name: 'Meera Joshi', type: 'person' }], entityCount: 5, confidence: 0.79, severity: 'medium', metrics: { 'New Connections': '4 in 7 days', 'Baseline': '1.5/week', 'Bridge Status': 'Confirmed' }, timestamp: '2026-09-01T10:30:00Z', timeAgo: '7 days ago', status: 'new' },
  { id: 'nsp-005', type: 'temporal_cluster', typeLabel: 'Temporal Cluster', title: 'Shell company director overlap', description: 'Multiple shell companies share the same registered director address within the Defence Colony locality.', entities: [{ id: 'ent-nexus-org-001', name: 'BlueSky Trading Solutions', type: 'organization' }, { id: 'ent-nexus-org-004', name: 'Golden Gate Financials', type: 'organization' }], entityCount: 4, confidence: 0.85, severity: 'high', metrics: { 'Organizations': '4', 'Shared Address': '45 Defence Colony', 'GST Registration Overlap': 'Yes' }, timestamp: '2026-07-20T10:00:00Z', timeAgo: '7 weeks ago', status: 'confirmed' },
];

// ============================================================
// BUILT GRAPH EXPORT
// ============================================================
// nexusNetwork (built above) re-exported under the graph alias
// for consumers that prefer the longer name.

export const nexusNetworkGraph = nexusNetwork;
