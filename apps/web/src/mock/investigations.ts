import type {
  Investigation,
  InvestigationEntity,
  InvestigationRelationship,
  InvestigationEvidence,
  InvestigationDocument,
  InvestigationEvent,
  InvestigationFinding,
  InvestigationNote,
  InvestigationTimelineItem,
  InvestigationNetwork,
  InvestigationAnalyticsSnapshot,
  InvestigationActivityEntry,
  InvestigationMember,
} from '@trinetra-pulse/types';

// ============================================================
// PHASE 9 — MOCK INVESTIGATIONS
// ============================================================
// Deterministic investigation universe built on the canonical
// Phase 4-8 mock entities, evidence, relationships, events and
// networks. Every investigation REFERENCES canonical ids rather
// than duplicating them. Evidence added during a live session is
// marked `is_mock` so it is clearly labelled as demo data.
//
// Investigations: INV-001..INV-005 (draft / active / under review /
// closed / archived across statuses).
// ============================================================

export interface MockInvestigationRecord {
  investigation: Investigation;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  evidence: InvestigationEvidence[];
  documents: InvestigationDocument[];
  events: InvestigationEvent[];
  findings: InvestigationFinding[];
  notes: InvestigationNote[];
  timeline: InvestigationTimelineItem[];
  networks: InvestigationNetwork[];
  analyticsSnapshots: InvestigationAnalyticsSnapshot[];
  activity: InvestigationActivityEntry[];
  members: InvestigationMember[];
}

const iso = (d: string) => new Date(d).toISOString();

// ------------------------------------------------------------
// Helper builders
// ------------------------------------------------------------

const entityRef = (
  id: string,
  investigationId: string,
  entityId: string,
  name: string,
  entityType: InvestigationEntity['entity_type'],
  role: string,
  confidence: number,
  linkedBy: string,
  linkedAt: string,
  options: { idx: string } & Partial<{ isMock: boolean }>
): InvestigationEntity => ({
  id: options.idx,
  investigation_id: investigationId,
  entity_id: entityId,
  name,
  entity_type: entityType,
  association_confidence: confidence,
  role,
  linked_by: linkedBy,
  linked_at: iso(linkedAt),
  metadata: { is_mock: options.isMock ?? false },
});

const evidenceRef = (
  id: string,
  investigationId: string,
  evidenceId: string,
  title: string,
  evidenceType: InvestigationEvidence['evidence_type'],
  summary: string,
  linkedBy: string,
  linkedAt: string,
  options: { idx: string } & Partial<{ isMock: boolean }>
): InvestigationEvidence => ({
  id: options.idx,
  investigation_id: investigationId,
  evidence_id: evidenceId,
  title,
  evidence_type: evidenceType,
  summary,
  linked_by: linkedBy,
  linked_at: iso(linkedAt),
  metadata: { is_mock: options.isMock ?? false },
});

// ------------------------------------------------------------
// INV-001 — Networking / telecom data swap (Active, High)
// Scope: Operation Clean universe (FIR-2026-001).
// ------------------------------------------------------------

const inv001: MockInvestigationRecord = {
  investigation: {
    id: 'inv-001',
    title: 'Operation Clean — Firmware Import Probe',
    description:
      'Coordination probe around a documented import network. Links canonical entities to the source network for analytical review.',
    status: 'active',
    priority: 'high',
    lead_investigator: 'Inspector Mehta',
    assigned: ['Inspector Mehta', 'Analyst Singh'],
    tags: ['import', 'network', 'probe'],
    case_id: 'ent-case-001',
    entity_count: 6,
    evidence_count: 5,
    relationship_count: 5,
    finding_count: 2,
    event_count: 2,
    created_at: iso('2026-08-01T09:00:00Z'),
    updated_at: iso('2026-08-26T10:10:00Z'),
    last_activity_at: iso('2026-08-26T10:10:00Z'),
  },
  members: [
    { id: 'mem-001-1', investigation_id: 'inv-001', user_id: 'u-mehta', name: 'Inspector Mehta', role: 'Lead', added_at: iso('2026-08-01T09:05:00Z') },
    { id: 'mem-001-2', investigation_id: 'inv-001', user_id: 'u-singh', name: 'Analyst Singh', role: 'Analyst', added_at: iso('2026-08-01T09:06:00Z') },
  ],
  entities: [
    entityRef('ine-001-1', 'inv-001', 'ent-person-001', 'Rahul Kumar', 'person', 'Primary person of interest', 0.95, 'Inspector Mehta', '2026-08-01T09:10:00Z', { idx: 'ine-001-1' }),
    entityRef('ine-001-2', 'inv-001', 'ent-phone-001', '+91 98765 43210', 'phone', 'Primary device', 0.9, 'Analyst Singh', '2026-08-01T09:11:00Z', { idx: 'ine-001-2' }),
    entityRef('ine-001-3', 'inv-001', 'ent-vehicle-001', 'MH 14 BX 2231', 'vehicle', 'Linked vehicle', 0.82, 'Analyst Singh', '2026-08-02T10:00:00Z', { idx: 'ine-001-3' }),
    entityRef('ine-001-4', 'inv-001', 'ent-org-001', 'Mumbai Trading Corp', 'organization', 'Linked company', 0.78, 'Inspector Mehta', '2026-08-03T09:30:00Z', { idx: 'ine-001-4' }),
    entityRef('ine-001-5', 'inv-001', 'ent-account-001', '7731 0029 4567', 'account', 'Linked account', 0.74, 'Analyst Singh', '2026-08-04T11:20:00Z', { idx: 'ine-001-5' }),
    entityRef('ine-001-6', 'inv-001', 'ent-txn-001', 'TXN-2026-0482', 'transaction', 'Flagged transaction', 0.88, 'Inspector Mehta', '2026-08-05T12:00:00Z', { idx: 'ine-001-6' }),
  ],
  relationships: [
    { id: 'inr-001-1', investigation_id: 'inv-001', relationship_id: 'rel-001', source_entity_id: 'ent-person-001', target_entity_id: 'ent-phone-001', source_entity_name: 'Rahul Kumar', target_entity_name: '+91 98765 43210', type: 'USES', confidence: 0.9, note: 'Subscriber link', linked_by: 'Analyst Singh', linked_at: iso('2026-08-01T09:12:00Z') },
    { id: 'inr-001-2', investigation_id: 'inv-001', relationship_id: 'rel-003', source_entity_id: 'ent-person-001', target_entity_id: 'ent-person-003', source_entity_name: 'Rahul Kumar', target_entity_name: 'Vikram Patel', type: 'KNOWS', confidence: 0.7, linked_by: 'Analyst Singh', linked_at: iso('2026-08-02T09:00:00Z') },
    { id: 'inr-001-3', investigation_id: 'inv-001', relationship_id: 'rel-005', source_entity_id: 'ent-person-001', target_entity_id: 'ent-org-001', source_entity_name: 'Rahul Kumar', target_entity_name: 'Mumbai Trading Corp', type: 'WORKS_FOR', confidence: 0.78, linked_by: 'Inspector Mehta', linked_at: iso('2026-08-03T09:40:00Z') },
    { id: 'inr-001-4', investigation_id: 'inv-001', relationship_id: 'rel-007', source_entity_id: 'ent-person-001', target_entity_id: 'ent-account-001', source_entity_name: 'Rahul Kumar', target_entity_name: '7731 0029 4567', type: 'OWNS_ACCOUNT', confidence: 0.86, linked_by: 'Analyst Singh', linked_at: iso('2026-08-04T11:25:00Z') },
    { id: 'inr-001-5', investigation_id: 'inv-001', relationship_id: 'rel-008', source_entity_id: 'ent-person-001', target_entity_id: 'ent-txn-001', source_entity_name: 'Rahul Kumar', target_entity_name: 'TXN-2026-0482', type: 'SENT_TRANSACTION', confidence: 0.88, linked_by: 'Inspector Mehta', linked_at: iso('2026-08-05T12:05:00Z') },
  ],
  evidence: [
    evidenceRef('inev-001-1', 'inv-001', 'ev-001', 'FIR record - named accused', 'document', 'Canonical case scan naming the individual.', 'Inspector Mehta', '2026-08-01T09:15:00Z', { idx: 'inev-001-1' }),
    evidenceRef('inev-001-2', 'inv-001', 'ev-004', 'CDR subscriber records', 'communication', 'Call detail subscriber records for the primary device.', 'Analyst Singh', '2026-08-01T09:20:00Z', { idx: 'inev-001-2' }),
    evidenceRef('inev-001-3', 'inv-001', 'ev-007', 'GST registration', 'structured_record', 'GST registration record for the linked company.', 'Analyst Singh', '2026-08-03T10:00:00Z', { idx: 'inev-001-3' }),
    evidenceRef('inev-001-4', 'inv-001', 'ev-009', 'Flagged transaction record', 'transaction', 'Transaction flagged by the movement analysis.', 'Inspector Mehta', '2026-08-05T12:10:00Z', { idx: 'inev-001-4' }),
    evidenceRef('inev-001-5', 'inv-001', 'ev-005', 'Registration database entry', 'vehicle_record', 'Vehicle registration database entry.', 'Analyst Singh', '2026-08-06T09:00:00Z', { idx: 'inev-001-5' }),
  ],
  documents: [
    { id: 'ind-001-1', investigation_id: 'inv-001', document_id: 'doc-fir-001', title: 'FIR-2026-001 Scan', document_type: 'case', source: 'Case registry', added_by: 'Inspector Mehta', added_at: iso('2026-08-01T09:16:00Z') },
  ],
  events: [
    { id: 'inev-1-1', investigation_id: 'inv-001', title: 'Chennai hub coordination meeting', description: 'Canonical event linked for context.', occurred_at: iso('2026-08-10T09:00:00Z'), event_type: 'observation', entity_ids: ['ent-person-001'], created_at: iso('2026-08-05T13:00:00Z') },
    { id: 'inev-1-2', investigation_id: 'inv-001', title: 'Large transfer executed', description: 'Transfer flagged from canonical transaction record.', occurred_at: iso('2026-08-12T14:30:00Z'), event_type: 'transaction', entity_ids: ['ent-txn-001', 'ent-account-001'], created_at: iso('2026-08-05T13:05:00Z') },
  ],
  findings: [
    {
      id: 'inf-001-1', investigation_id: 'inv-001',
      title: 'Concentrated usage around the primary device',
      description: 'Multiple source records associate the primary device with the person of interest during the probe window.',
      category: 'association', confidence: 'high', source: 'Intelligence graph', source_type: 'analysis',
      created_by: 'Analyst Singh', created_at: iso('2026-08-09T08:00:00Z'), updated_at: iso('2026-08-09T08:00:00Z'),
      entity_ids: ['ent-person-001', 'ent-phone-001'], evidence_ids: ['inev-001-2'], tags: ['cdr', 'association'],
    },
    {
      id: 'inf-001-2', investigation_id: 'inv-001',
      title: 'Company relationship observed', description: 'The person of interest is associated with the linked company across two independent records.',
      category: 'relationship', confidence: 'medium', source: 'Inspector Mehta', source_type: 'manual',
      created_by: 'Inspector Mehta', created_at: iso('2026-08-11T09:00:00Z'), updated_at: iso('2026-08-11T09:00:00Z'),
      entity_ids: ['ent-person-001', 'ent-org-001'], evidence_ids: ['inev-001-3'], tags: ['company'],
    },
  ],
  notes: [
    { id: 'inn-001-1', investigation_id: 'inv-001', author: 'Inspector Mehta', body: 'Probe scope: confirm association links against the canonical network before expanding.', category: 'scope', created_at: iso('2026-08-12T09:00:00Z'), updated_at: iso('2026-08-12T09:00:00Z') },
  ],
  timeline: [
    { id: 'int-001-1', investigation_id: 'inv-001', timestamp: iso('2026-08-01T09:00:00Z'), category: 'system', title: 'Investigation created', description: 'Workspace opened around the import probe.', ref_id: 'inv-001', ref_type: 'investigation', actor: 'Inspector Mehta' },
    { id: 'int-001-2', investigation_id: 'inv-001', timestamp: iso('2026-08-10T09:00:00Z'), category: 'event', title: 'Chennai hub coordination meeting', description: 'Canonical event surfaced on the timeline.', ref_id: 'inev-1-1', ref_type: 'event', actor: null },
    { id: 'int-001-3', investigation_id: 'inv-001', timestamp: iso('2026-08-12T14:30:00Z'), category: 'event', title: 'Large transfer executed', description: 'Flagged transaction added to the timeline.', ref_id: 'inev-1-2', ref_type: 'event', actor: null },
  ],
  networks: [
    { id: 'innet-001-1', investigation_id: 'inv-001', network_id: 'NET-001', name: 'Operation Clean — initial relationships', linked_by: 'Inspector Mehta', linked_at: iso('2026-08-02T09:00:00Z') },
  ],
  analyticsSnapshots: [
    { id: 'inas-001-1', investigation_id: 'inv-001', network_id: 'NET-001', label: 'Opening snapshot', captured_at: iso('2026-08-02T09:05:00Z'), analytics_bundle_id: null, summary: { nodes: 6, relationships: 5, connectedComponents: 1, communityCount: 1, topConnectedEntity: 'ent-person-001' } },
  ],
  activity: [
    { id: 'ina-001-1', investigation_id: 'inv-001', type: 'created', title: 'Investigation created', detail: 'Workspace opened for the import probe.', actor: 'Inspector Mehta', at: iso('2026-08-01T09:00:00Z') },
    { id: 'ina-001-2', investigation_id: 'inv-001', type: 'entity_linked', title: 'Entity linked', detail: 'Rahul Kumar added as Primary person of interest.', actor: 'Inspector Mehta', at: iso('2026-08-01T09:10:00Z') },
    { id: 'ina-001-3', investigation_id: 'inv-001', type: 'evidence_linked', title: 'Evidence linked', detail: 'CDR subscriber records added.', actor: 'Analyst Singh', at: iso('2026-08-01T09:20:00Z') },
    { id: 'ina-001-4', investigation_id: 'inv-001', type: 'finding_created', title: 'Finding created', detail: 'Concentrated usage around the primary device.', actor: 'Analyst Singh', at: iso('2026-08-09T08:00:00Z') },
    { id: 'ina-001-5', investigation_id: 'inv-001', type: 'updated', title: 'Investigation updated', detail: 'Priority elevated to high.', actor: 'Inspector Mehta', at: iso('2026-08-26T10:10:00Z') },
  ],
};

// ------------------------------------------------------------
// INV-002 — Vehicle movement correlation (Active, Normal)
// ------------------------------------------------------------

const inv002: MockInvestigationRecord = {
  investigation: {
    id: 'inv-002',
    title: 'Vehicle Movement Correlation',
    description: 'Correlating vehicle movement across recorded events in the canonical universe.',
    status: 'active',
    priority: 'normal',
    lead_investigator: 'Analyst Singh',
    assigned: ['Analyst Singh'],
    tags: ['vehicle', 'movement'],
    case_id: null,
    entity_count: 3,
    evidence_count: 2,
    relationship_count: 1,
    finding_count: 1,
    event_count: 1,
    created_at: iso('2026-08-05T08:00:00Z'),
    updated_at: iso('2026-08-24T16:00:00Z'),
    last_activity_at: iso('2026-08-24T16:00:00Z'),
  },
  members: [
    { id: 'mem-002-1', investigation_id: 'inv-002', user_id: 'u-singh', name: 'Analyst Singh', role: 'Lead', added_at: iso('2026-08-05T08:02:00Z') },
  ],
  entities: [
    entityRef('ine-002-1', 'inv-002', 'ent-vehicle-001', 'MH 14 BX 2231', 'vehicle', 'Movement subject', 0.84, 'Analyst Singh', '2026-08-05T08:10:00Z', { idx: 'ine-002-1' }),
    entityRef('ine-002-2', 'inv-002', 'ent-location-003', 'Mumbai', 'location', 'Origin location', 0.6, 'Analyst Singh', '2026-08-05T08:15:00Z', { idx: 'ine-002-2' }),
    entityRef('ine-002-3', 'inv-002', 'ent-location-002', 'Pune', 'location', 'Destination location', 0.6, 'Analyst Singh', '2026-08-05T08:16:00Z', { idx: 'ine-002-3' }),
  ],
  relationships: [
    { id: 'inr-002-1', investigation_id: 'inv-002', relationship_id: 'rel-002', source_entity_id: 'ent-person-001', target_entity_id: 'ent-vehicle-001', source_entity_name: 'Rahul Kumar', target_entity_name: 'MH 14 BX 2231', type: 'OWNS', confidence: 0.82, note: 'Ownership link reused from canonical set.', linked_by: 'Analyst Singh', linked_at: iso('2026-08-06T09:00:00Z') },
  ],
  evidence: [
    evidenceRef('inev-002-1', 'inv-002', 'ev-005', 'Registration database entry', 'vehicle_record', 'Registration entry for the movement subject.', 'Analyst Singh', '2026-08-05T08:20:00Z', { idx: 'inev-002-1' }),
    evidenceRef('inev-002-2', 'inv-002', 'ev-008', 'Tower aggregation', 'location_record', 'Tower aggregation linking movement.', 'Analyst Singh', '2026-08-06T09:10:00Z', { idx: 'inev-002-2' }),
  ],
  documents: [],
  events: [
    { id: 'inev-2-1', investigation_id: 'inv-002', title: 'Cross-city movement', description: 'Movement event for the subject vehicle.', occurred_at: iso('2026-08-14T10:00:00Z'), event_type: 'movement', entity_ids: ['ent-vehicle-001'], created_at: iso('2026-08-07T09:00:00Z') },
  ],
  findings: [
    {
      id: 'inf-002-1', investigation_id: 'inv-002',
      title: 'Ownership link observed', description: 'The vehicle is linked to a person through the canonical ownership record.',
      category: 'relationship', confidence: 'medium', source: 'Analyst Singh', source_type: 'manual',
      created_by: 'Analyst Singh', created_at: iso('2026-08-07T09:30:00Z'), updated_at: iso('2026-08-07T09:30:00Z'),
      entity_ids: ['ent-vehicle-001', 'ent-person-001'], evidence_ids: ['inev-002-1'], tags: ['ownership'],
    },
  ],
  notes: [],
  timeline: [
    { id: 'int-002-1', investigation_id: 'inv-002', timestamp: iso('2026-08-05T08:00:00Z'), category: 'system', title: 'Investigation created', description: 'Movement correlation workspace.', ref_id: 'inv-002', ref_type: 'investigation', actor: 'Analyst Singh' },
    { id: 'int-002-2', investigation_id: 'inv-002', timestamp: iso('2026-08-14T10:00:00Z'), category: 'event', title: 'Cross-city movement', description: 'Movement event added.', ref_id: 'inev-2-1', ref_type: 'event', actor: null },
  ],
  networks: [
    { id: 'innet-002-1', investigation_id: 'inv-002', network_id: 'NET-002', name: 'Movement correlation graph', linked_by: 'Analyst Singh', linked_at: iso('2026-08-07T09:00:00Z') },
  ],
  analyticsSnapshots: [],
  activity: [
    { id: 'ina-002-1', investigation_id: 'inv-002', type: 'created', title: 'Investigation created', detail: 'Movement correlation workspace.', actor: 'Analyst Singh', at: iso('2026-08-05T08:00:00Z') },
    { id: 'ina-002-2', investigation_id: 'inv-002', type: 'network_linked', title: 'Network linked', detail: 'Movement correlation graph added.', actor: 'Analyst Singh', at: iso('2026-08-07T09:00:00Z') },
  ],
};

// ------------------------------------------------------------
// INV-003 — Import Fraud Review (Under Review, Critical)
// ------------------------------------------------------------

const inv003: MockInvestigationRecord = {
  investigation: {
    id: 'inv-003',
    title: 'Import Fraud Review',
    description: 'Documented import network under review. High workflow priority; findings remain analytical.',
    status: 'under_review',
    priority: 'critical',
    lead_investigator: 'Inspector Mehta',
    assigned: ['Inspector Mehta', 'Analyst Singh', 'Officer Rao'],
    tags: ['import', 'fraud', 'review'],
    case_id: 'ent-case-001',
    entity_count: 5,
    evidence_count: 4,
    relationship_count: 3,
    finding_count: 1,
    event_count: 0,
    created_at: iso('2026-07-20T09:00:00Z'),
    updated_at: iso('2026-08-25T18:00:00Z'),
    last_activity_at: iso('2026-08-25T18:00:00Z'),
  },
  members: [
    { id: 'mem-003-1', investigation_id: 'inv-003', user_id: 'u-mehta', name: 'Inspector Mehta', role: 'Lead', added_at: iso('2026-07-20T09:05:00Z') },
    { id: 'mem-003-2', investigation_id: 'inv-003', user_id: 'u-singh', name: 'Analyst Singh', role: 'Analyst', added_at: iso('2026-07-20T09:06:00Z') },
    { id: 'mem-003-3', investigation_id: 'inv-003', user_id: 'u-rao', name: 'Officer Rao', role: 'Reviewer', added_at: iso('2026-08-01T09:00:00Z') },
  ],
  entities: [
    entityRef('ine-003-1', 'inv-003', 'ent-person-001', 'Rahul Kumar', 'person', 'Person of interest', 0.95, 'Inspector Mehta', '2026-07-20T09:10:00Z', { idx: 'ine-003-1' }),
    entityRef('ine-003-2', 'inv-003', 'ent-org-001', 'Mumbai Trading Corp', 'organization', 'Linked company', 0.8, 'Inspector Mehta', '2026-07-20T09:20:00Z', { idx: 'ine-003-2' }),
    entityRef('ine-003-3', 'inv-003', 'ent-org-002', 'Global Imports Ltd', 'organization', 'Second company', 0.66, 'Analyst Singh', '2026-07-21T09:00:00Z', { idx: 'ine-003-3' }),
    entityRef('ine-003-4', 'inv-003', 'ent-account-002', '8845 1190 0221', 'account', 'Second account', 0.62, 'Analyst Singh', '2026-07-22T09:00:00Z', { idx: 'ine-003-4' }),
    entityRef('ine-003-5', 'inv-003', 'ent-txn-002', 'TXN-2026-0774', 'transaction', 'Second transaction', 0.7, 'Inspector Mehta', '2026-07-23T09:00:00Z', { idx: 'ine-003-5' }),
  ],
  relationships: [
    { id: 'inr-003-1', investigation_id: 'inv-003', relationship_id: 'rel-005', source_entity_id: 'ent-person-001', target_entity_id: 'ent-org-001', source_entity_name: 'Rahul Kumar', target_entity_name: 'Mumbai Trading Corp', type: 'WORKS_FOR', confidence: 0.78, linked_by: 'Inspector Mehta', linked_at: iso('2026-07-20T09:30:00Z') },
    { id: 'inr-003-2', investigation_id: 'inv-003', relationship_id: 'rel-007', source_entity_id: 'ent-person-001', target_entity_id: 'ent-account-001', source_entity_name: 'Rahul Kumar', target_entity_name: '7731 0029 4567', type: 'OWNS_ACCOUNT', confidence: 0.86, linked_by: 'Analyst Singh', linked_at: iso('2026-07-21T09:10:00Z') },
    { id: 'inr-003-3', investigation_id: 'inv-003', relationship_id: 'rel-009', source_entity_id: 'ent-txn-001', target_entity_id: 'ent-case-001', source_entity_name: 'TXN-2026-0482', target_entity_name: 'FIR-2026-001', type: 'PART_OF', confidence: 0.9, linked_by: 'Inspector Mehta', linked_at: iso('2026-07-23T09:30:00Z') },
  ],
  evidence: [
    evidenceRef('inev-003-1', 'inv-003', 'ev-007', 'GST registration', 'structured_record', 'GST registration of the first company.', 'Inspector Mehta', '2026-07-20T10:00:00Z', { idx: 'inev-003-1' }),
    evidenceRef('inev-003-2', 'inv-003', 'ev-009', 'Flagged transaction record', 'transaction', 'Flagged transaction under review.', 'Analyst Singh', '2026-07-21T10:00:00Z', { idx: 'inev-003-2' }),
    evidenceRef('inev-003-3', 'inv-003', 'ev-003', 'Banking relationship', 'structured_record', 'Banking relationship record.', 'Analyst Singh', '2026-07-22T10:00:00Z', { idx: 'inev-003-3' }),
    evidenceRef('inev-003-4', 'inv-003', 'ev-001', 'FIR record - named accused', 'document', 'Case scan for reference.', 'Inspector Mehta', '2026-07-23T10:00:00Z', { idx: 'inev-003-4' }),
  ],
  documents: [],
  events: [],
  findings: [
    {
      id: 'inf-003-1', investigation_id: 'inv-003',
      title: 'Financial association observed', description: 'Transaction records associate the person with the linked company.',
      category: 'financial', confidence: 'high', source: 'Flag analysis', source_type: 'analysis',
      created_by: 'Inspector Mehta', created_at: iso('2026-07-24T09:00:00Z'), updated_at: iso('2026-08-25T18:00:00Z'),
      entity_ids: ['ent-person-001', 'ent-org-001', 'ent-txn-001'], evidence_ids: ['inev-003-2'], tags: ['financial', 'import'],
    },
  ],
  notes: [
    { id: 'inn-003-1', investigation_id: 'inv-003', author: 'Officer Rao', body: 'Review notes: remaining associations are analytical and flagged pending independent corroboration.', category: 'review', created_at: iso('2026-08-25T18:00:00Z'), updated_at: iso('2026-08-25T18:00:00Z') },
  ],
  timeline: [
    { id: 'int-003-1', investigation_id: 'inv-003', timestamp: iso('2026-07-20T09:00:00Z'), category: 'system', title: 'Investigation created', description: 'Import fraud review opened.', ref_id: 'inv-003', ref_type: 'investigation', actor: 'Inspector Mehta' },
    { id: 'int-003-2', investigation_id: 'inv-003', timestamp: iso('2026-08-25T18:00:00Z'), category: 'activity', title: 'Status set to under review', description: 'Moved to review by reviewer.', ref_id: 'inv-003', ref_type: 'investigation', actor: 'Officer Rao' },
  ],
  networks: [
    { id: 'innet-003-1', investigation_id: 'inv-003', network_id: 'NET-001', name: 'Operation Clean — initial relationships', linked_by: 'Inspector Mehta', linked_at: iso('2026-07-21T09:00:00Z') },
    { id: 'innet-003-2', investigation_id: 'inv-003', network_id: 'NET-003', name: 'Import expansion — skyline view', linked_by: 'Analyst Singh', linked_at: iso('2026-08-01T09:00:00Z') },
  ],
  analyticsSnapshots: [
    { id: 'inas-003-1', investigation_id: 'inv-003', network_id: 'NET-003', label: 'Review baseline', captured_at: iso('2026-08-02T09:00:00Z'), analytics_bundle_id: null, summary: { nodes: 5, relationships: 3, connectedComponents: 1, communityCount: 1, topConnectedEntity: 'ent-person-001' } },
  ],
  activity: [
    { id: 'ina-003-1', investigation_id: 'inv-003', type: 'created', title: 'Investigation created', detail: 'Import fraud review opened.', actor: 'Inspector Mehta', at: iso('2026-07-20T09:00:00Z') },
    { id: 'ina-003-2', investigation_id: 'inv-003', type: 'status_changed', title: 'Status changed', detail: 'Set to under review.', actor: 'Officer Rao', at: iso('2026-08-25T18:00:00Z') },
  ],
};

// ------------------------------------------------------------
// INV-004 — Telecom Data Review (Draft, Low)
// ------------------------------------------------------------

const inv004: MockInvestigationRecord = {
  investigation: {
    id: 'inv-004',
    title: 'Telecom Data Review',
    description: 'Draft review of communication records; no findings confirmed.',
    status: 'draft',
    priority: 'low',
    lead_investigator: 'Analyst Singh',
    assigned: ['Analyst Singh'],
    tags: ['telecom', 'cdr'],
    case_id: null,
    entity_count: 2,
    evidence_count: 1,
    relationship_count: 0,
    finding_count: 0,
    event_count: 0,
    created_at: iso('2026-08-28T08:00:00Z'),
    updated_at: iso('2026-08-28T08:00:00Z'),
    last_activity_at: iso('2026-08-28T08:00:00Z'),
  },
  members: [
    { id: 'mem-004-1', investigation_id: 'inv-004', user_id: 'u-singh', name: 'Analyst Singh', role: 'Lead', added_at: iso('2026-08-28T08:02:00Z') },
  ],
  entities: [
    entityRef('ine-004-1', 'inv-004', 'ent-phone-001', '+91 98765 43210', 'phone', 'Primary device', 0.9, 'Analyst Singh', '2026-08-28T08:05:00Z', { idx: 'ine-004-1' }),
    entityRef('ine-004-2', 'inv-004', 'ent-person-006', 'R. Kumar', 'person', 'Alias reference', 0.55, 'Analyst Singh', '2026-08-28T08:06:00Z', { idx: 'ine-004-2' }),
  ],
  relationships: [],
  evidence: [
    evidenceRef('inev-004-1', 'inv-004', 'ev-006', 'CDR alias reference', 'communication', 'Draft reference to a CDR alias record.', 'Analyst Singh', '2026-08-28T08:10:00Z', { idx: 'inev-004-1' }),
  ],
  documents: [],
  events: [],
  findings: [],
  notes: [],
  timeline: [
    { id: 'int-004-1', investigation_id: 'inv-004', timestamp: iso('2026-08-28T08:00:00Z'), category: 'system', title: 'Investigation created', description: 'Draft review opened.', ref_id: 'inv-004', ref_type: 'investigation', actor: 'Analyst Singh' },
  ],
  networks: [],
  analyticsSnapshots: [],
  activity: [
    { id: 'ina-004-1', investigation_id: 'inv-004', type: 'created', title: 'Investigation created', detail: 'Draft review opened.', actor: 'Analyst Singh', at: iso('2026-08-28T08:00:00Z') },
  ],
};

// ------------------------------------------------------------
// INV-005 — Closed review — earlier probe (Closed, Normal)
// ------------------------------------------------------------

const inv005: MockInvestigationRecord = {
  investigation: {
    id: 'inv-005',
    title: 'Earlier Import Review (Closed)',
    description: 'Earlier probe closed after completion of the documented scope.',
    status: 'closed',
    priority: 'normal',
    lead_investigator: 'Inspector Mehta',
    assigned: ['Inspector Mehta'],
    tags: ['closed', 'archive'],
    case_id: null,
    entity_count: 2,
    evidence_count: 1,
    relationship_count: 1,
    finding_count: 0,
    event_count: 0,
    created_at: iso('2026-06-01T09:00:00Z'),
    updated_at: iso('2026-07-01T09:00:00Z'),
    last_activity_at: iso('2026-07-01T09:00:00Z'),
  },
  members: [
    { id: 'mem-005-1', investigation_id: 'inv-005', user_id: 'u-mehta', name: 'Inspector Mehta', role: 'Lead', added_at: iso('2026-06-01T09:05:00Z') },
  ],
  entities: [
    entityRef('ine-005-1', 'inv-005', 'ent-person-005', 'Meera Reddy', 'person', 'Reviewed person', 0.6, 'Inspector Mehta', '2026-06-02T09:00:00Z', { idx: 'ine-005-1' }),
    entityRef('ine-005-2', 'inv-005', 'ent-location-001', 'Chennai', 'location', 'Linked location', 0.5, 'Inspector Mehta', '2026-06-02T09:05:00Z', { idx: 'ine-005-2' }),
  ],
  relationships: [
    { id: 'inr-005-1', investigation_id: 'inv-005', relationship_id: 'rel-006', source_entity_id: 'ent-person-001', target_entity_id: 'ent-location-001', source_entity_name: 'Rahul Kumar', target_entity_name: 'Chennai', type: 'LOCATED_AT', confidence: 0.6, note: 'Location link from earlier probe.', linked_by: 'Inspector Mehta', linked_at: iso('2026-06-02T09:10:00Z') },
  ],
  evidence: [
    evidenceRef('inev-005-1', 'inv-005', 'ev-011', 'Witness statement 014', 'document', 'Witness statement recorded during the earlier probe.', 'Inspector Mehta', '2026-06-03T09:00:00Z', { idx: 'inev-005-1' }),
  ],
  documents: [],
  events: [],
  findings: [],
  notes: [],
  timeline: [
    { id: 'int-005-1', investigation_id: 'inv-005', timestamp: iso('2026-06-01T09:00:00Z'), category: 'system', title: 'Investigation created', description: 'Earlier probe opened.', ref_id: 'inv-005', ref_type: 'investigation', actor: 'Inspector Mehta' },
    { id: 'int-005-2', investigation_id: 'inv-005', timestamp: iso('2026-07-01T09:00:00Z'), category: 'activity', title: 'Investigation closed', description: 'Scope completed and closed.', ref_id: 'inv-005', ref_type: 'investigation', actor: 'Inspector Mehta' },
  ],
  networks: [],
  analyticsSnapshots: [],
  activity: [
    { id: 'ina-005-1', investigation_id: 'inv-005', type: 'created', title: 'Investigation created', detail: 'Earlier probe opened.', actor: 'Inspector Mehta', at: iso('2026-06-01T09:00:00Z') },
    { id: 'ina-005-2', investigation_id: 'inv-005', type: 'status_changed', title: 'Investigation closed', detail: 'Scope completed and closed.', actor: 'Inspector Mehta', at: iso('2026-07-01T09:00:00Z') },
  ],
};

// ------------------------------------------------------------
// INV-006 (INV-DEMO-001) — Operation Meridian (Active, High)
// ------------------------------------------------------------
// The canonical SIH demo investigation. Connects datasets → entities →
// relationships → network → analytics → evidence → findings → timeline
// → AI end to end, referencing the real canonical mock records
// (ent-*, rel-*, ev-*, event-*, ds-*, NET-001, FIR-2026-001). This is
// deterministic demo data and is labelled DEMO — it is not live police
// data.
// ------------------------------------------------------------

const inv006: MockInvestigationRecord = {
  investigation: {
    id: 'inv-006',
    title: 'Operation Meridian',
    description:
      'Documented import coordination probe linking the flagged firm Meridian Freight to the canonical import network. Demonstration dataset — deterministic demo data.',
    status: 'active',
    priority: 'high',
    lead_investigator: 'Inspector Mehta',
    assigned: ['Inspector Mehta', 'Analyst Singh'],
    tags: ['import', 'meridian', 'demo'],
    case_id: 'ent-case-001',
    entity_count: 5,
    evidence_count: 4,
    relationship_count: 4,
    finding_count: 2,
    event_count: 0,
    created_at: iso('2026-08-18T09:00:00Z'),
    updated_at: iso('2026-08-26T12:00:00Z'),
    last_activity_at: iso('2026-08-26T12:00:00Z'),
  },
  members: [
    { id: 'mem-006-1', investigation_id: 'inv-006', user_id: 'u-mehta', name: 'Inspector Mehta', role: 'Lead', added_at: iso('2026-08-18T09:05:00Z') },
    { id: 'mem-006-2', investigation_id: 'inv-006', user_id: 'u-singh', name: 'Analyst Singh', role: 'Analyst', added_at: iso('2026-08-18T09:06:00Z') },
  ],
  entities: [
    entityRef('ine-006-1', 'inv-006', 'ent-person-001', 'Rahul Kumar', 'person', 'Person of interest', 0.95, 'Inspector Mehta', '2026-08-18T09:10:00Z', { idx: 'ine-006-1' }),
    entityRef('ine-006-2', 'inv-006', 'ent-org-001', 'Mumbai Trading Corp', 'organization', 'Linked company', 0.8, 'Analyst Singh', '2026-08-18T09:20:00Z', { idx: 'ine-006-2' }),
    entityRef('ine-006-3', 'inv-006', 'ent-person-003', 'Vikram Patel', 'person', 'Linked person', 0.74, 'Analyst Singh', '2026-08-19T09:00:00Z', { idx: 'ine-006-3' }),
    entityRef('ine-006-4', 'inv-006', 'ent-account-001', '7731 0029 4567', 'account', 'Linked account', 0.86, 'Inspector Mehta', '2026-08-20T10:00:00Z', { idx: 'ine-006-4' }),
    entityRef('ine-006-5', 'inv-006', 'ent-txn-001', 'TXN-2026-0482', 'transaction', 'Flagged transaction', 0.88, 'Inspector Mehta', '2026-08-21T11:00:00Z', { idx: 'ine-006-5' }),
  ],
  relationships: [
    { id: 'inr-006-1', investigation_id: 'inv-006', relationship_id: 'rel-001', source_entity_id: 'ent-person-001', target_entity_id: 'ent-phone-001', source_entity_name: 'Rahul Kumar', target_entity_name: '+91 98765 43210', type: 'USES', confidence: 0.98, linked_by: 'Analyst Singh', linked_at: iso('2026-08-18T09:12:00Z') },
    { id: 'inr-006-2', investigation_id: 'inv-006', relationship_id: 'rel-003', source_entity_id: 'ent-person-001', target_entity_id: 'ent-person-003', source_entity_name: 'Rahul Kumar', target_entity_name: 'Vikram Patel', type: 'KNOWS', confidence: 0.74, linked_by: 'Analyst Singh', linked_at: iso('2026-08-19T09:00:00Z') },
    { id: 'inr-006-3', investigation_id: 'inv-006', relationship_id: 'rel-005', source_entity_id: 'ent-person-001', target_entity_id: 'ent-org-001', source_entity_name: 'Rahul Kumar', target_entity_name: 'Mumbai Trading Corp', type: 'WORKS_FOR', confidence: 0.93, linked_by: 'Inspector Mehta', linked_at: iso('2026-08-20T09:30:00Z') },
    { id: 'inr-006-4', investigation_id: 'inv-006', relationship_id: 'rel-008', source_entity_id: 'ent-person-001', target_entity_id: 'ent-txn-001', source_entity_name: 'Rahul Kumar', target_entity_name: 'TXN-2026-0482', type: 'SENT_TRANSACTION', confidence: 0.99, linked_by: 'Inspector Mehta', linked_at: iso('2026-08-21T11:05:00Z') },
  ],
  evidence: [
    evidenceRef('inev-006-1', 'inv-006', 'ev-001', 'FIR record — named accused', 'document', 'Canonical case scan referencing the person of interest.', 'Inspector Mehta', '2026-08-18T09:15:00Z', { idx: 'inev-006-1' }),
    evidenceRef('inev-006-2', 'inv-006', 'ev-004', 'CDR subscriber records', 'communication', 'Call detail subscriber records for the primary device.', 'Analyst Singh', '2026-08-19T09:20:00Z', { idx: 'inev-006-2' }),
    evidenceRef('inev-006-3', 'inv-006', 'ev-007', 'GST registration', 'structured_record', 'GST registration of the linked company.', 'Analyst Singh', '2026-08-20T10:00:00Z', { idx: 'inev-006-3' }),
    evidenceRef('inev-006-4', 'inv-006', 'ev-009', 'Flagged transaction record', 'transaction', 'Transaction flagged by movement analysis.', 'Inspector Mehta', '2026-08-21T11:10:00Z', { idx: 'inev-006-4' }),
  ],
  documents: [],
  events: [],
  findings: [
    {
      id: 'inf-006-1', investigation_id: 'inv-006',
      title: 'Coordinate cluster around the primary device',
      description: 'Multiple source records associate the primary device with the person of interest across the probe window.',
      category: 'association', confidence: 'high', source: 'Intelligence graph', source_type: 'analysis',
      created_by: 'Analyst Singh', created_at: iso('2026-08-24T09:00:00Z'), updated_at: iso('2026-08-24T09:00:00Z'),
      entity_ids: ['ent-person-001', 'ent-phone-001'], evidence_ids: ['inev-006-2'], tags: ['cdr', 'association'],
    },
    {
      id: 'inf-006-2', investigation_id: 'inv-006',
      title: 'Shared company relationship observed', description: 'Person of interest and linked person share a company association across records.',
      category: 'relationship', confidence: 'medium', source: 'Inspector Mehta', source_type: 'manual',
      created_by: 'Inspector Mehta', created_at: iso('2026-08-25T10:00:00Z'), updated_at: iso('2026-08-25T10:00:00Z'),
      entity_ids: ['ent-person-001', 'ent-org-001', 'ent-person-003'], evidence_ids: ['inev-006-3'], tags: ['company'],
    },
  ],
  notes: [
    { id: 'inn-006-1', investigation_id: 'inv-006', author: 'Inspector Mehta', body: 'Demo journey anchor: verify the end-to-end lifecycle from datasets to AI for the SIH demonstration.', category: 'scope', created_at: iso('2026-08-25T11:00:00Z'), updated_at: iso('2026-08-25T11:00:00Z') },
  ],
  timeline: [
    { id: 'int-006-1', investigation_id: 'inv-006', timestamp: iso('2026-08-18T09:00:00Z'), category: 'system', title: 'Investigation created', description: 'Operation Meridian opened around the import probe.', ref_id: 'inv-006', ref_type: 'investigation', actor: 'Inspector Mehta' },
    { id: 'int-006-2', investigation_id: 'inv-006', timestamp: iso('2026-02-14T11:05:00Z'), category: 'event', title: 'Large transfer executed', description: 'Flagged transaction surfaced on the timeline.', ref_id: 'event-002', ref_type: 'event', actor: null },
    { id: 'int-006-3', investigation_id: 'inv-006', timestamp: iso('2026-02-19T18:40:00Z'), category: 'event', title: 'Chennai hub coordination meeting', description: 'Canonical meeting event added.', ref_id: 'event-001', ref_type: 'event', actor: null },
  ],
  networks: [
    { id: 'innet-006-1', investigation_id: 'inv-006', network_id: 'NET-001', name: 'Operation Clean — initial relationships', linked_by: 'Inspector Mehta', linked_at: iso('2026-08-22T09:00:00Z') },
  ],
  analyticsSnapshots: [
    { id: 'inas-006-1', investigation_id: 'inv-006', network_id: 'NET-001', label: 'Meridian baseline', captured_at: iso('2026-08-23T09:05:00Z'), analytics_bundle_id: null, summary: { nodes: 5, relationships: 4, connectedComponents: 1, communityCount: 1, topConnectedEntity: 'ent-person-001' } },
  ],
  activity: [
    { id: 'ina-006-1', investigation_id: 'inv-006', type: 'created', title: 'Investigation created', detail: 'Operation Meridian opened.', actor: 'Inspector Mehta', at: iso('2026-08-18T09:00:00Z') },
    { id: 'ina-006-2', investigation_id: 'inv-006', type: 'entity_linked', title: 'Entity linked', detail: 'Rahul Kumar added as person of interest.', actor: 'Inspector Mehta', at: iso('2026-08-18T09:10:00Z') },
    { id: 'ina-006-3', investigation_id: 'inv-006', type: 'network_linked', title: 'Network linked', detail: 'Operation Clean network added.', actor: 'Analyst Singh', at: iso('2026-08-22T09:00:00Z') },
    { id: 'ina-006-4', investigation_id: 'inv-006', type: 'analytics_captured', title: 'Analytics captured', detail: 'Meridian baseline computed.', actor: 'Analyst Singh', at: iso('2026-08-23T09:05:00Z') },
  ],
};

// ------------------------------------------------------------
// Registry
// ------------------------------------------------------------

export const mockInvestigationRecords: MockInvestigationRecord[] = [
  inv001,
  inv002,
  inv003,
  inv004,
  inv005,
  inv006,
];

export const mockInvestigationById = new Map<string, MockInvestigationRecord>(
  mockInvestigationRecords.map((r) => [r.investigation.id, r])
);

export const mockInvestigations: Investigation[] = mockInvestigationRecords.map(
  (r) => r.investigation
);
