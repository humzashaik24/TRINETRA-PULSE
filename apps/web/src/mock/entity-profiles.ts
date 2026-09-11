import type { EntityIntelligence, EntityType, ResolutionState } from '@trinetra-pulse/types';
import { NEXUS_ENTITIES } from './nexus-dataset';

// ============================================================
// MOCK — CANONICAL ENTITIES
// Internal universe: "Operation Clean" / FIR-2026-001.
// Consistent identifiers referenced by candidates, relationships,
// evidence, events and resolution records across mock modules.
// ============================================================

interface ProfileSeed {
  id: string;
  entityType: EntityType;
  name: string;
  displayName: string;
  canonicalName?: string;
  description?: string;
  resolutionState: ResolutionState;
  confidence: number;
  sourcesCount: number;
  connectionsCount: number;
  eventsCount: number;
  evidenceCount: number;
  activityCount: number;
  isVerified: boolean;
  isFlagged?: boolean;
  aliases?: string[];
  attributes?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const build = (seed: ProfileSeed): EntityIntelligence => ({
  id: seed.id,
  name: seed.name,
  canonicalName: seed.canonicalName,
  displayName: seed.displayName,
  entityType: seed.entityType,
  description: seed.description,
  resolutionState: seed.resolutionState,
  confidence: seed.confidence,
  sourcesCount: seed.sourcesCount,
  connectionsCount: seed.connectionsCount,
  eventsCount: seed.eventsCount,
  evidenceCount: seed.evidenceCount,
  activityCount: seed.activityCount,
  isVerified: seed.isVerified,
  isFlagged: seed.isFlagged ?? false,
  aliases: seed.aliases ?? [],
  attributes: seed.attributes ?? {},
  createdAt: seed.createdAt,
  updatedAt: seed.updatedAt,
});

export const mockEntityProfiles: EntityIntelligence[] = [
  // --------------------------------------------------------
  // PERSONS
  // --------------------------------------------------------
  build({
    id: 'ent-person-001',
    entityType: 'person',
    name: 'Rahul Kumar',
    canonicalName: 'rahul kumar',
    displayName: 'Rahul Kumar',
    description: 'Individual connected to FIR-2026-001; flagged for financial impropriety review.',
    resolutionState: 'CONFIRMED',
    confidence: 0.95,
    sourcesCount: 4,
    connectionsCount: 9,
    eventsCount: 3,
    evidenceCount: 5,
    activityCount: 8,
    isVerified: true,
    isFlagged: true,
    aliases: ['R. Kumar', 'Rahul K.'],
    attributes: {
      full_name: 'Rahul Kumar',
      phone: '+91 98765 43210',
      alternate_phone: '+91 99212 55667',
      email: 'rahul.kumar@example.net',
      date_of_birth: '1988-04-12',
      address: '42, Nungambakkam High Rd, Chennai',
      location: 'Chennai',
      id_number: 'PAN AAKPK6612M',
    },
    createdAt: '2026-08-18T10:12:00Z',
    updatedAt: '2026-08-26T09:41:00Z',
  }),
  build({
    id: 'ent-person-002',
    entityType: 'person',
    name: 'Priya Sharma',
    canonicalName: 'priya sharma',
    displayName: 'Priya Sharma',
    description: 'Accountant at Mumbai Trading Corp; witness in existing case material.',
    resolutionState: 'CONFIRMED',
    confidence: 0.92,
    sourcesCount: 3,
    connectionsCount: 5,
    eventsCount: 2,
    evidenceCount: 3,
    activityCount: 4,
    isVerified: true,
    attributes: {
      full_name: 'Priya Sharma',
      phone: '+91 90210 11345',
      email: 'priya.sharma@mumbaicorp.example',
      location: 'Mumbai',
      organization: 'Mumbai Trading Corp',
    },
    createdAt: '2026-08-18T10:14:00Z',
    updatedAt: '2026-08-25T16:20:00Z',
  }),
  build({
    id: 'ent-person-003',
    entityType: 'person',
    name: 'Vikram Patel',
    canonicalName: 'vikram patel',
    displayName: 'Vikram Patel',
    description: 'Associate linked to vehicle tracking records and communication spikes.',
    resolutionState: 'PROBABLE',
    confidence: 0.84,
    sourcesCount: 3,
    connectionsCount: 6,
    eventsCount: 2,
    evidenceCount: 4,
    activityCount: 5,
    isVerified: false,
    isFlagged: true,
    attributes: {
      full_name: 'Vikram Patel',
      phone: '+91 98111 22334',
      address: 'Old Poona Rd, Pune',
      location: 'Pune',
      organization: 'Global Imports Ltd',
    },
    createdAt: '2026-08-19T08:40:00Z',
    updatedAt: '2026-08-26T07:05:00Z',
  }),
  build({
    id: 'ent-person-004',
    entityType: 'person',
    name: 'Amit Singh',
    canonicalName: 'amit singh',
    displayName: 'Amit Singh',
    description: 'Driver recorded in vehicle tracking data.',
    resolutionState: 'POSSIBLE',
    confidence: 0.67,
    sourcesCount: 2,
    connectionsCount: 3,
    eventsCount: 1,
    evidenceCount: 2,
    activityCount: 2,
    isVerified: false,
    attributes: {
      full_name: 'Amit Singh',
      location: 'Pune',
    },
    createdAt: '2026-08-20T11:30:00Z',
    updatedAt: '2026-08-24T13:12:00Z',
  }),
  build({
    id: 'ent-person-005',
    entityType: 'person',
    name: 'Meera Reddy',
    canonicalName: 'meera reddy',
    displayName: 'Meera Reddy',
    description: 'Witness connection identified across witness statements.',
    resolutionState: 'CONFIRMED',
    confidence: 0.9,
    sourcesCount: 2,
    connectionsCount: 2,
    eventsCount: 1,
    evidenceCount: 2,
    activityCount: 2,
    isVerified: true,
    attributes: {
      full_name: 'Meera Reddy',
      address: 'T. Nagar, Chennai',
      location: 'Chennai',
    },
    createdAt: '2026-08-21T09:00:00Z',
    updatedAt: '2026-08-23T15:45:00Z',
  }),
  build({
    id: 'ent-person-006',
    entityType: 'person',
    name: 'R. Kumar',
    canonicalName: 'r kumar',
    displayName: 'R. Kumar',
    description: 'Candidate reference appearing in CDR extract; pending resolution against Rahul Kumar.',
    resolutionState: 'NEEDS_REVIEW',
    confidence: 0.61,
    sourcesCount: 1,
    connectionsCount: 2,
    eventsCount: 0,
    evidenceCount: 1,
    activityCount: 1,
    isVerified: false,
    aliases: ['Rahul K.'],
    attributes: {
      full_name: 'R. Kumar',
      phone: '+91 98765 43210',
      location: 'Chennai',
    },
    createdAt: '2026-08-22T12:20:00Z',
    updatedAt: '2026-08-26T08:00:00Z',
  }),

  // --------------------------------------------------------
  // PHONES
  // --------------------------------------------------------
  build({
    id: 'ent-phone-001',
    entityType: 'phone',
    name: '+91 98765 43210',
    canonicalName: '919876543210',
    displayName: '+91 98765 43210',
    description: 'Primary device linked to Rahul Kumar in CDR extracts.',
    resolutionState: 'CONFIRMED',
    confidence: 0.98,
    sourcesCount: 3,
    connectionsCount: 4,
    eventsCount: 2,
    evidenceCount: 3,
    activityCount: 3,
    isVerified: true,
    attributes: {
      phone_number: '+91 98765 43210',
      carrier: 'Airtel',
      holder: 'Rahul Kumar',
      imei: '351234567890123',
    },
    createdAt: '2026-08-18T10:20:00Z',
    updatedAt: '2026-08-25T18:10:00Z',
  }),
  build({
    id: 'ent-phone-002',
    entityType: 'phone',
    name: '+91 90210 11345',
    canonicalName: '919021011345',
    displayName: '+91 90210 11345',
    description: 'Device associated with Priya Sharma.',
    resolutionState: 'CONFIRMED',
    confidence: 0.96,
    sourcesCount: 2,
    connectionsCount: 2,
    eventsCount: 1,
    evidenceCount: 2,
    activityCount: 1,
    isVerified: true,
    attributes: {
      phone_number: '+91 90210 11345',
      carrier: 'Jio',
      holder: 'Priya Sharma',
    },
    createdAt: '2026-08-18T10:22:00Z',
    updatedAt: '2026-08-24T09:30:00Z',
  }),
  build({
    id: 'ent-phone-003',
    entityType: 'phone',
    name: '+91 98111 22334',
    canonicalName: '919811122334',
    displayName: '+91 98111 22334',
    description: 'Device in communication spike patterns; flagged.',
    resolutionState: 'PROBABLE',
    confidence: 0.82,
    sourcesCount: 2,
    connectionsCount: 3,
    eventsCount: 1,
    evidenceCount: 2,
    activityCount: 2,
    isVerified: false,
    isFlagged: true,
    attributes: {
      phone_number: '+91 98111 22334',
      carrier: 'Vodafone Idea',
      holder: 'Vikram Patel',
    },
    createdAt: '2026-08-19T08:45:00Z',
    updatedAt: '2026-08-26T07:00:00Z',
  }),

  // --------------------------------------------------------
  // VEHICLES
  // --------------------------------------------------------
  build({
    id: 'ent-vehicle-001',
    entityType: 'vehicle',
    name: 'MH 14 BX 2231',
    canonicalName: 'MH14BX2231',
    displayName: 'MH 14 BX 2231',
    description: 'Registered to person-of-interest; recurring at Chennai hub.',
    resolutionState: 'CONFIRMED',
    confidence: 0.97,
    sourcesCount: 3,
    connectionsCount: 3,
    eventsCount: 2,
    evidenceCount: 2,
    activityCount: 2,
    isVerified: true,
    attributes: {
      vehicle_number: 'MH 14 BX 2231',
      make: 'Hyundai',
      model: 'Creta',
      color: 'White',
      owner: 'Rahul Kumar',
      location: 'Chennai',
    },
    createdAt: '2026-08-18T10:25:00Z',
    updatedAt: '2026-08-24T17:00:00Z',
  }),
  build({
    id: 'ent-vehicle-002',
    entityType: 'vehicle',
    name: 'MH 12 KU 8820',
    canonicalName: 'MH12KU8820',
    displayName: 'MH 12 KU 8820',
    description: 'Linked to communication-tower coverage near event site.',
    resolutionState: 'PROBABLE',
    confidence: 0.79,
    sourcesCount: 2,
    connectionsCount: 2,
    eventsCount: 1,
    evidenceCount: 1,
    activityCount: 1,
    isVerified: false,
    attributes: {
      vehicle_number: 'MH 12 KU 8820',
      make: 'Maruti Suzuki',
      model: 'Ertiga',
      color: 'Silver',
      owner: 'Vikram Patel',
    },
    createdAt: '2026-08-19T09:00:00Z',
    updatedAt: '2026-08-22T11:30:00Z',
  }),

  // --------------------------------------------------------
  // LOCATIONS
  // --------------------------------------------------------
  build({
    id: 'ent-location-001',
    entityType: 'location',
    name: 'Chennai',
    canonicalName: 'chennai',
    displayName: 'Chennai',
    description: 'Operational hub appearing across vehicle and tower data.',
    resolutionState: 'CONFIRMED',
    confidence: 0.93,
    sourcesCount: 3,
    connectionsCount: 5,
    eventsCount: 2,
    evidenceCount: 2,
    activityCount: 2,
    isVerified: true,
    attributes: {
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      locality: 'Nungambakkam',
    },
    createdAt: '2026-08-18T10:30:00Z',
    updatedAt: '2026-08-25T12:00:00Z',
  }),
  build({
    id: 'ent-location-002',
    entityType: 'location',
    name: 'Pune',
    canonicalName: 'pune',
    displayName: 'Pune',
    description: 'Jurisdiction location for FIR-2026-001.',
    resolutionState: 'CONFIRMED',
    confidence: 0.94,
    sourcesCount: 2,
    connectionsCount: 4,
    eventsCount: 2,
    evidenceCount: 1,
    activityCount: 1,
    isVerified: true,
    attributes: {
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
    },
    createdAt: '2026-08-18T10:31:00Z',
    updatedAt: '2026-08-21T09:00:00Z',
  }),
  build({
    id: 'ent-location-003',
    entityType: 'location',
    name: 'Mumbai',
    canonicalName: 'mumbai',
    displayName: 'Mumbai',
    description: 'Corporate address for Mumbai Trading Corp.',
    resolutionState: 'CONFIRMED',
    confidence: 0.95,
    sourcesCount: 2,
    connectionsCount: 3,
    eventsCount: 1,
    evidenceCount: 1,
    activityCount: 1,
    isVerified: true,
    attributes: {
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
    },
    createdAt: '2026-08-18T10:32:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  }),

  // --------------------------------------------------------
  // ORGANIZATIONS
  // --------------------------------------------------------
  build({
    id: 'ent-org-001',
    entityType: 'organization',
    name: 'Mumbai Trading Corp',
    canonicalName: 'mumbai trading corp',
    displayName: 'Mumbai Trading Corp',
    description: 'Trading firm at center of transaction analysis.',
    resolutionState: 'CONFIRMED',
    confidence: 0.91,
    sourcesCount: 3,
    connectionsCount: 5,
    eventsCount: 2,
    evidenceCount: 3,
    activityCount: 3,
    isVerified: true,
    isFlagged: true,
    aliases: ['MTC'],
    attributes: {
      legal_name: 'Mumbai Trading Corporation Pvt Ltd',
      gstin: '27AAACM1234F1Z5',
      address: '118 Nariman Point, Mumbai',
      location: 'Mumbai',
    },
    createdAt: '2026-08-18T10:35:00Z',
    updatedAt: '2026-08-25T19:00:00Z',
  }),
  build({
    id: 'ent-org-002',
    entityType: 'organization',
    name: 'Global Imports Ltd',
    canonicalName: 'global imports ltd',
    displayName: 'Global Imports Ltd',
    description: 'Importer linked to flagged shipment events.',
    resolutionState: 'PROBABLE',
    confidence: 0.77,
    sourcesCount: 2,
    connectionsCount: 3,
    eventsCount: 1,
    evidenceCount: 2,
    activityCount: 2,
    isVerified: false,
    attributes: {
      legal_name: 'Global Imports Ltd',
      gstin: '27AABCG9876E1Z3',
      location: 'Mumbai',
    },
    createdAt: '2026-08-19T09:10:00Z',
    updatedAt: '2026-08-24T14:00:00Z',
  }),

  // --------------------------------------------------------
  // ACCOUNTS
  // --------------------------------------------------------
  build({
    id: 'ent-account-001',
    entityType: 'account',
    name: '7731 0029 4567',
    canonicalName: '773100294567',
    displayName: '7731 0029 4567',
    description: 'HDFC account linked to transaction analysis.',
    resolutionState: 'CONFIRMED',
    confidence: 0.96,
    sourcesCount: 2,
    connectionsCount: 2,
    eventsCount: 1,
    evidenceCount: 2,
    activityCount: 1,
    isVerified: true,
    attributes: {
      account_number: '773100294567',
      bank: 'HDFC Bank',
      ifsc: 'HDFC0001122',
      holder: 'Rahul Kumar',
    },
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-25T18:30:00Z',
  }),
  build({
    id: 'ent-account-002',
    entityType: 'account',
    name: '8845 1190 0221',
    canonicalName: '884511900221',
    displayName: '8845 1190 0221',
    description: 'ICICI corporate account for Mumbai Trading Corp.',
    resolutionState: 'CONFIRMED',
    confidence: 0.94,
    sourcesCount: 2,
    connectionsCount: 2,
    eventsCount: 1,
    evidenceCount: 1,
    activityCount: 1,
    isVerified: true,
    attributes: {
      account_number: '884511900221',
      bank: 'ICICI Bank',
      ifsc: 'ICIC0007721',
      holder: 'Mumbai Trading Corp',
    },
    createdAt: '2026-08-20T10:05:00Z',
    updatedAt: '2026-08-24T12:00:00Z',
  }),

  // --------------------------------------------------------
  // TRANSACTIONS
  // --------------------------------------------------------
  build({
    id: 'ent-txn-001',
    entityType: 'transaction',
    name: 'TXN-2026-0482',
    canonicalName: 'TXN-2026-0482',
    displayName: 'TXN-2026-0482',
    description: 'Suspicious transfer from account 7731 to corporate account.',
    resolutionState: 'CONFIRMED',
    confidence: 0.97,
    sourcesCount: 2,
    connectionsCount: 3,
    eventsCount: 1,
    evidenceCount: 2,
    activityCount: 1,
    isVerified: true,
    attributes: {
      transaction_id: 'TXN-2026-0482',
      amount: '₹4,80,000',
      date: '2026-02-14',
      from_account: '773100294567',
      to_account: '884511900221',
      location: 'Pune',
    },
    createdAt: '2026-08-20T11:00:00Z',
    updatedAt: '2026-08-24T16:00:00Z',
  }),
  build({
    id: 'ent-txn-002',
    entityType: 'transaction',
    name: 'TXN-2026-0774',
    canonicalName: 'TXN-2026-0774',
    displayName: 'TXN-2026-0774',
    description: 'Repeated-value transfer detected in pattern analysis.',
    resolutionState: 'POSSIBLE',
    confidence: 0.66,
    sourcesCount: 1,
    connectionsCount: 2,
    eventsCount: 1,
    evidenceCount: 1,
    activityCount: 1,
    isVerified: false,
    attributes: {
      transaction_id: 'TXN-2026-0774',
      amount: '₹1,20,000',
      date: '2026-02-27',
      from_account: '773100294567',
      to_account: '884511900221',
      location: 'Mumbai',
    },
    createdAt: '2026-08-20T11:05:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
  }),

  // --------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------
  build({
    id: 'ent-event-001',
    entityType: 'event',
    name: 'Meeting — Chennai Hub',
    canonicalName: 'meeting chennai hub',
    displayName: 'Meeting — Chennai Hub',
    description: 'Documented coordination meeting observed via tower data.',
    resolutionState: 'CONFIRMED',
    confidence: 0.85,
    sourcesCount: 2,
    connectionsCount: 4,
    eventsCount: 0,
    evidenceCount: 2,
    activityCount: 1,
    isVerified: true,
    attributes: {
      event_type: 'meeting',
      date: '2026-02-19',
      location: 'Chennai',
      participants: ['Rahul Kumar', 'Vikram Patel'],
    },
    createdAt: '2026-08-21T09:15:00Z',
    updatedAt: '2026-08-23T11:00:00Z',
  }),

  // --------------------------------------------------------
  // CASES
  // --------------------------------------------------------
  build({
    id: 'ent-case-001',
    entityType: 'case',
    name: 'FIR-2026-001',
    canonicalName: 'FIR-2026-001',
    displayName: 'FIR-2026-001',
    description: 'Pune economic offence file; source of structured FIR records.',
    resolutionState: 'CONFIRMED',
    confidence: 1,
    sourcesCount: 1,
    connectionsCount: 5,
    eventsCount: 3,
    evidenceCount: 4,
    activityCount: 3,
    isVerified: true,
    attributes: {
      case_number: 'FIR-2026-001',
      police_station: 'Pune City Police',
      registered: '2026-02-05',
      sections: ['IPC 420', 'IPC 467', 'IPC 468'],
    },
    createdAt: '2026-08-18T09:00:00Z',
    updatedAt: '2026-08-26T08:00:00Z',
  }),

  // --------------------------------------------------------
  // DOCUMENTS
  // --------------------------------------------------------
  build({
    id: 'ent-doc-001',
    entityType: 'document',
    name: 'FIR-2026-001 Scan',
    canonicalName: 'fir-2026-001 scan',
    displayName: 'FIR-2026-001 Scan',
    description: 'Scanned first information report filed at Pune City Police.',
    resolutionState: 'CONFIRMED',
    confidence: 0.98,
    sourcesCount: 1,
    connectionsCount: 3,
    eventsCount: 0,
    evidenceCount: 1,
    activityCount: 1,
    isVerified: true,
    attributes: {
      document_type: 'FIR',
      filename: 'FIR-2026-001.pdf',
      case: 'FIR-2026-001',
    },
    createdAt: '2026-08-18T09:05:00Z',
    updatedAt: '2026-08-18T09:05:00Z',
  }),

  // --------------------------------------------------------
  // EVIDENCE
  // --------------------------------------------------------
  build({
    id: 'ent-evidence-001',
    entityType: 'evidence',
    name: 'CDR Extract — Feb 2026',
    canonicalName: 'cdr extract feb 2026',
    displayName: 'CDR Extract — Feb 2026',
    description: 'Call detail records exhibit supporting communication analysis.',
    resolutionState: 'CONFIRMED',
    confidence: 0.9,
    sourcesCount: 1,
    connectionsCount: 4,
    eventsCount: 1,
    evidenceCount: 0,
    activityCount: 1,
    isVerified: true,
    attributes: {
      evidence_type: 'digital',
      case: 'FIR-2026-001',
      reference: 'EXH-CDR-001',
    },
    createdAt: '2026-08-19T09:30:00Z',
    updatedAt: '2026-08-19T09:30:00Z',
  }),
  // --------------------------------------------------------
  // NEXUS ENTITIES (Operation Trinetra Nexus)
  // --------------------------------------------------------
  ...NEXUS_ENTITIES,
];

// Presentation universe: only Operation Trinetra Nexus entities are
// shown in listing/count surfaces. Legacy canonical profiles remain in
// the mutable workspace store for extraction/resolution operations.
export const presentationEntityProfiles: EntityIntelligence[] =
  mockEntityProfiles.filter((p) => p.id.startsWith('ent-nexus-'));

export const mockEntityProfileById: Map<string, EntityIntelligence> = new Map(
  mockEntityProfiles.map((p) => [p.id, p])
);