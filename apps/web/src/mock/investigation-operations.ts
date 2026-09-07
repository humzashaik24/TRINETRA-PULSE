import type {
  InvestigationPipeline,
  InvestigationReadiness,
  InvestigationHealth,
  ReviewItem,
  InvestigationActivityLog,
  SavedInvestigationView,
  GraphBookmark,
  TimelineBookmark,
  CrossReference,
  ProvenanceChain,
  InvestigationSearchResult,
} from '@trinetra-pulse/types';

// ============================================================
// PHASE 11 — MOCK INVESTIGATION OPERATIONS
// ============================================================
// Deterministic operational shell built AROUND the canonical Phase 4-10
// mocks. Cross-references and provenance chains reference REAL canonical
// ids (rel-xxx, ev-xxx, ent-xxx, event-xxx) plus the Phase 9 investigation
// link ids (ine-xxx, inr-xxx, inev-xxx, inf-xxx). Values (readiness,
// health, pipeline, review queue) are derived from the deterministic mock
// data so the UI answers "where am I / what's processed / what needs
// review" without inventing live-police certainty.
//
// INVESTIGATIONS: inv-001..inv-005 existing + INV-DEMO-001 (Operation
// Meridian) which ties datasets → entities → relationships → network →
// analytics → evidence → findings → timeline → AI.
// ============================================================

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const iso = (d: string) => new Date(d).toISOString();

// ------------------------------------------------------------
// Readiness for each investigation
// ------------------------------------------------------------

const inv001Readiness: InvestigationReadiness = {
  investigationId: 'inv-001',
  overall: 'in_progress',
  nextRecommendedAction: 'Review 3 validation issues before regenerating the network',
  items: [
    { key: 'data', label: 'Data', level: 'ready', detail: '4 datasets', warningCount: 0 },
    { key: 'datasets', label: 'Datasets', level: 'ready', detail: '4 datasets', warningCount: 0 },
    { key: 'entities', label: 'Entities', level: 'ready', detail: '6 extracted · 6 resolved', warningCount: 0 },
    { key: 'relationships', label: 'Relationships', level: 'needs_attention', detail: '3 of 5 need review', warningCount: 3 },
    { key: 'evidence', label: 'Evidence', level: 'ready', detail: '5 items', warningCount: 1 },
    { key: 'findings', label: 'Findings', level: 'ready', detail: '2 findings', warningCount: 0 },
    { key: 'network', label: 'Network', level: 'ready', detail: '1 network', warningCount: 0 },
    { key: 'analytics', label: 'Analytics', level: 'ready', detail: 'Computed', warningCount: 0 },
    { key: 'timeline', label: 'Timeline', level: 'ready', detail: '3 events', warningCount: 0 },
    { key: 'ai', label: 'AI', level: 'ready', detail: 'Available', warningCount: 0 },
  ],
};

const inv002Readiness: InvestigationReadiness = {
  investigationId: 'inv-002',
  overall: 'in_progress',
  nextRecommendedAction: 'Continue correlating vehicle movement events',
  items: [
    { key: 'data', label: 'Data', level: 'ready', detail: '2 datasets', warningCount: 0 },
    { key: 'datasets', label: 'Datasets', level: 'ready', detail: '2 datasets', warningCount: 0 },
    { key: 'entities', label: 'Entities', level: 'ready', detail: '3 extracted', warningCount: 0 },
    { key: 'relationships', label: 'Relationships', level: 'in_progress', detail: '1 relationship', warningCount: 0 },
    { key: 'evidence', label: 'Evidence', level: 'ready', detail: '2 items', warningCount: 0 },
    { key: 'findings', label: 'Findings', level: 'ready', detail: '1 finding', warningCount: 0 },
    { key: 'network', label: 'Network', level: 'ready', detail: '1 network', warningCount: 0 },
    { key: 'analytics', label: 'Analytics', level: 'not_started', detail: 'Not yet computed', warningCount: 0 },
    { key: 'timeline', label: 'Timeline', level: 'in_progress', detail: '2 events', warningCount: 0 },
    { key: 'ai', label: 'AI', level: 'ready', detail: 'Available', warningCount: 0 },
  ],
};

const inv003Readiness: InvestigationReadiness = {
  investigationId: 'inv-003',
  overall: 'needs_attention',
  nextRecommendedAction: 'Resolve 2 pending validation issues flagged during review',
  items: [
    { key: 'data', label: 'Data', level: 'ready', detail: '5 datasets', warningCount: 0 },
    { key: 'datasets', label: 'Datasets', level: 'ready', detail: '5 datasets', warningCount: 0 },
    { key: 'entities', label: 'Entities', level: 'ready', detail: '5 extracted · 4 resolved', warningCount: 1 },
    { key: 'relationships', label: 'Relationships', level: 'needs_attention', detail: '1 unresolved entity', warningCount: 1 },
    { key: 'evidence', label: 'Evidence', level: 'ready', detail: '4 items', warningCount: 0 },
    { key: 'findings', label: 'Findings', level: 'ready', detail: '1 finding', warningCount: 0 },
    { key: 'network', label: 'Network', level: 'ready', detail: '2 networks', warningCount: 0 },
    { key: 'analytics', label: 'Analytics', level: 'ready', detail: 'Baseline computed', warningCount: 0 },
    { key: 'timeline', label: 'Timeline', level: 'ready', detail: '2 events', warningCount: 0 },
    { key: 'ai', label: 'AI', level: 'ready', detail: 'Available', warningCount: 0 },
  ],
};

const inv004Readiness: InvestigationReadiness = {
  investigationId: 'inv-004',
  overall: 'not_started',
  nextRecommendedAction: 'Review the draft telecom reference before confirming scope',
  items: [
    { key: 'data', label: 'Data', level: 'in_progress', detail: '1 dataset', warningCount: 1 },
    { key: 'datasets', label: 'Datasets', level: 'in_progress', detail: '1 dataset', warningCount: 1 },
    { key: 'entities', label: 'Entities', level: 'in_progress', detail: '2 extracted', warningCount: 1 },
    { key: 'relationships', label: 'Relationships', level: 'not_started', detail: 'None yet', warningCount: 0 },
    { key: 'evidence', label: 'Evidence', level: 'in_progress', detail: '1 item', warningCount: 1 },
    { key: 'findings', label: 'Findings', level: 'not_started', detail: 'None yet', warningCount: 0 },
    { key: 'network', label: 'Network', level: 'not_started', detail: 'Not built', warningCount: 0 },
    { key: 'analytics', label: 'Analytics', level: 'not_started', detail: 'Not yet available', warningCount: 0 },
    { key: 'timeline', label: 'Timeline', level: 'not_started', detail: '1 event', warningCount: 0 },
    { key: 'ai', label: 'AI', level: 'in_progress', detail: 'Context limited', warningCount: 0 },
  ],
};

const inv005Readiness: InvestigationReadiness = {
  investigationId: 'inv-005',
  overall: 'in_progress',
  nextRecommendedAction: 'No open work — investigation is closed',
  items: [
    { key: 'data', label: 'Data', level: 'ready', detail: '2 datasets', warningCount: 0 },
    { key: 'datasets', label: 'Datasets', level: 'ready', detail: '2 datasets', warningCount: 0 },
    { key: 'entities', label: 'Entities', level: 'ready', detail: '2 extracted', warningCount: 0 },
    { key: 'relationships', label: 'Relationships', level: 'ready', detail: '1 relationship', warningCount: 0 },
    { key: 'evidence', label: 'Evidence', level: 'ready', detail: '1 item', warningCount: 0 },
    { key: 'findings', label: 'Findings', level: 'not_started', detail: 'None recorded', warningCount: 0 },
    { key: 'network', label: 'Network', level: 'not_started', detail: 'Not built', warningCount: 0 },
    { key: 'analytics', label: 'Analytics', level: 'not_started', detail: 'Not yet available', warningCount: 0 },
    { key: 'timeline', label: 'Timeline', level: 'ready', detail: '2 events', warningCount: 0 },
    { key: 'ai', label: 'AI', level: 'in_progress', detail: 'Context limited', warningCount: 0 },
  ],
};

export const mockReadinessByInvestigation: Record<string, InvestigationReadiness> = {
  'inv-001': inv001Readiness,
  'inv-002': inv002Readiness,
  'inv-003': inv003Readiness,
  'inv-004': inv004Readiness,
  'inv-005': inv005Readiness,
  'inv-006': {
    investigationId: 'inv-006',
    overall: 'in_progress',
    nextRecommendedAction: 'Ask AI to explain the primary entity, then review the shared-company finding',
    items: [
      { key: 'data', label: 'Data', level: 'ready', detail: '4 datasets', warningCount: 0 },
      { key: 'datasets', label: 'Datasets', level: 'ready', detail: '4 datasets', warningCount: 0 },
      { key: 'entities', label: 'Entities', level: 'ready', detail: '5 extracted · 5 resolved', warningCount: 0 },
      { key: 'relationships', label: 'Relationships', level: 'ready', detail: '4 relationships', warningCount: 1 },
      { key: 'evidence', label: 'Evidence', level: 'ready', detail: '4 items', warningCount: 1 },
      { key: 'findings', label: 'Findings', level: 'ready', detail: '2 findings', warningCount: 0 },
      { key: 'network', label: 'Network', level: 'ready', detail: '1 network', warningCount: 0 },
      { key: 'analytics', label: 'Analytics', level: 'ready', detail: 'Computed', warningCount: 0 },
      { key: 'timeline', label: 'Timeline', level: 'ready', detail: '3 events', warningCount: 0 },
      { key: 'ai', label: 'AI', level: 'ready', detail: 'Available', warningCount: 0 },
    ],
  },
};

// ------------------------------------------------------------
// Health
// ------------------------------------------------------------

const inv001Health: InvestigationHealth = {
  investigationId: 'inv-001',
  computedAt: iso('2026-08-26T10:10:00Z'),
  openReviewCount: 4,
  metrics: [
    { key: 'data_completeness', label: 'Data completeness', value: 89, total: null, detail: '4 of 4 datasets ingested', hasIssues: false },
    { key: 'entity_resolution_coverage', label: 'Entity resolution coverage', value: 100, total: 6, detail: '6 of 6 entities resolved', hasIssues: false },
    { key: 'relationship_coverage', label: 'Relationship coverage', value: 60, total: 5, detail: '3 of 5 relationships corroborated', hasIssues: true },
    { key: 'evidence_coverage', label: 'Evidence coverage', value: 80, total: 5, detail: '4 of 5 evidence items fully referenced', hasIssues: false },
    { key: 'network_readiness', label: 'Network readiness', value: 100, total: null, detail: '1 network computed', hasIssues: false },
    { key: 'analytics_readiness', label: 'Analytics readiness', value: 100, total: null, detail: 'Analytics computed', hasIssues: false },
    { key: 'open_review_items', label: 'Open review items', value: 0, total: 4, detail: '4 items await investigator review', hasIssues: true },
  ],
};

const inv003Health: InvestigationHealth = {
  investigationId: 'inv-003',
  computedAt: iso('2026-08-25T18:00:00Z'),
  openReviewCount: 3,
  metrics: [
    { key: 'data_completeness', label: 'Data completeness', value: 83, total: null, detail: '5 of 6 datasets ingested', hasIssues: false },
    { key: 'entity_resolution_coverage', label: 'Entity resolution coverage', value: 80, total: 5, detail: '4 of 5 entities resolved', hasIssues: true },
    { key: 'relationship_coverage', label: 'Relationship coverage', value: 66, total: 3, detail: '2 of 3 relationships corroborated', hasIssues: true },
    { key: 'evidence_coverage', label: 'Evidence coverage', value: 100, total: 4, detail: '4 of 4 evidence items referenced', hasIssues: false },
    { key: 'network_readiness', label: 'Network readiness', value: 100, total: null, detail: '2 networks linked', hasIssues: false },
    { key: 'analytics_readiness', label: 'Analytics readiness', value: 100, total: null, detail: 'Baseline computed', hasIssues: false },
    { key: 'open_review_items', label: 'Open review items', value: 0, total: 3, detail: '3 items await investigator review', hasIssues: true },
  ],
};

export const mockHealthByInvestigation: Record<string, InvestigationHealth> = {
  'inv-001': inv001Health,
  'inv-002': {
    investigationId: 'inv-002',
    computedAt: iso('2026-08-24T16:00:00Z'),
    openReviewCount: 0,
    metrics: [
      { key: 'data_completeness', label: 'Data completeness', value: 100, total: null, detail: 'Datasets ingested', hasIssues: false },
      { key: 'entity_resolution_coverage', label: 'Entity resolution coverage', value: 100, total: 3, detail: '3 of 3 entities resolved', hasIssues: false },
      { key: 'relationship_coverage', label: 'Relationship coverage', value: 100, total: 1, detail: '1 relationship corroborated', hasIssues: false },
      { key: 'evidence_coverage', label: 'Evidence coverage', value: 100, total: 2, detail: '2 of 2 evidence items referenced', hasIssues: false },
      { key: 'network_readiness', label: 'Network readiness', value: 100, total: null, detail: '1 network computed', hasIssues: false },
      { key: 'analytics_readiness', label: 'Analytics readiness', value: 0, total: null, detail: 'Analytics not yet computed', hasIssues: true },
      { key: 'open_review_items', label: 'Open review items', value: 0, total: 0, detail: 'No open review items', hasIssues: false },
    ],
  },
  'inv-003': inv003Health,
  'inv-004': {
    investigationId: 'inv-004',
    computedAt: iso('2026-08-28T08:00:00Z'),
    openReviewCount: 2,
    metrics: [
      { key: 'data_completeness', label: 'Data completeness', value: 50, total: null, detail: '1 of 2 datasets ingested', hasIssues: true },
      { key: 'entity_resolution_coverage', label: 'Entity resolution coverage', value: 50, total: 2, detail: '1 of 2 entities resolved', hasIssues: true },
      { key: 'relationship_coverage', label: 'Relationship coverage', value: 0, total: 0, detail: 'No relationships yet', hasIssues: false },
      { key: 'evidence_coverage', label: 'Evidence coverage', value: 0, total: 1, detail: 'Evidence not yet referenced', hasIssues: true },
      { key: 'network_readiness', label: 'Network readiness', value: 0, total: null, detail: 'No network built', hasIssues: false },
      { key: 'analytics_readiness', label: 'Analytics readiness', value: 0, total: null, detail: 'Analytics not yet available', hasIssues: false },
      { key: 'open_review_items', label: 'Open review items', value: 0, total: 2, detail: '2 items await investigator review', hasIssues: true },
    ],
  },
  'inv-005': {
    investigationId: 'inv-005',
    computedAt: iso('2026-07-01T09:00:00Z'),
    openReviewCount: 0,
    metrics: [
      { key: 'data_completeness', label: 'Data completeness', value: 100, total: null, detail: 'Datasets ingested', hasIssues: false },
      { key: 'entity_resolution_coverage', label: 'Entity resolution coverage', value: 100, total: 2, detail: '2 of 2 entities resolved', hasIssues: false },
      { key: 'relationship_coverage', label: 'Relationship coverage', value: 100, total: 1, detail: '1 relationship corroborated', hasIssues: false },
      { key: 'evidence_coverage', label: 'Evidence coverage', value: 100, total: 1, detail: '1 evidence item referenced', hasIssues: false },
      { key: 'network_readiness', label: 'Network readiness', value: 0, total: null, detail: 'No network built', hasIssues: false },
      { key: 'analytics_readiness', label: 'Analytics readiness', value: 0, total: null, detail: 'Analytics not yet available', hasIssues: false },
      { key: 'open_review_items', label: 'Open review items', value: 0, total: 0, detail: 'No open review items', hasIssues: false },
    ],
  },
  'inv-006': {
    investigationId: 'inv-006',
    computedAt: iso('2026-08-23T09:05:00Z'),
    openReviewCount: 2,
    metrics: [
      { key: 'data_completeness', label: 'Data completeness', value: 100, total: null, detail: '4 of 4 datasets ingested', hasIssues: false },
      { key: 'entity_resolution_coverage', label: 'Entity resolution coverage', value: 100, total: 5, detail: '5 of 5 entities resolved', hasIssues: false },
      { key: 'relationship_coverage', label: 'Relationship coverage', value: 75, total: 4, detail: '3 of 4 relationships corroborated', hasIssues: true },
      { key: 'evidence_coverage', label: 'Evidence coverage', value: 75, total: 4, detail: '3 of 4 evidence items fully referenced', hasIssues: true },
      { key: 'network_readiness', label: 'Network readiness', value: 100, total: null, detail: '1 network computed', hasIssues: false },
      { key: 'analytics_readiness', label: 'Analytics readiness', value: 100, total: null, detail: 'Analytics computed', hasIssues: false },
      { key: 'open_review_items', label: 'Open review items', value: 0, total: 2, detail: '2 items await investigator review', hasIssues: true },
    ],
  },
};

// ------------------------------------------------------------
// Pipeline
// ------------------------------------------------------------

export const mockPipelineByInvestigation: Record<string, InvestigationPipeline> = {
  'inv-001': {
    investigationId: 'inv-001',
    currentStage: 'relationships',
    progress: 80,
    completedStages: ['data', 'extraction', 'resolution', 'network', 'analytics'],
    needReview: ['relationships', 'evidence'],
    nextRecommendedAction: 'Review 3 validation issues before regenerating the network',
    stages: [
      { stage: 'data', label: 'Data', description: 'Ingest and validate datasets', status: 'COMPLETED', startedAt: iso('2026-08-01T09:00:00Z'), completedAt: iso('2026-08-02T09:00:00Z'), count: 4, warningCount: 0, errorCount: 0, targetWorkspace: '/data-intelligence' },
      { stage: 'extraction', label: 'Extraction', description: 'Extract entities from sources', status: 'COMPLETED', startedAt: iso('2026-08-02T09:00:00Z'), completedAt: iso('2026-08-03T09:00:00Z'), count: 6, warningCount: 1, errorCount: 0, targetWorkspace: '/entity-intelligence' },
      { stage: 'resolution', label: 'Resolution', description: 'Resolve duplicate entities', status: 'COMPLETED', startedAt: iso('2026-08-03T09:00:00Z'), completedAt: iso('2026-08-04T09:00:00Z'), count: 6, warningCount: 0, errorCount: 0, targetWorkspace: '/entity-intelligence' },
      { stage: 'relationships', label: 'Relationships', description: 'Build relationship links', status: 'NEEDS_REVIEW', startedAt: iso('2026-08-04T09:00:00Z'), completedAt: null, count: 5, warningCount: 3, errorCount: 0, targetWorkspace: '/networks' },
      { stage: 'network', label: 'Network', description: 'Generate the network graph', status: 'COMPLETED', startedAt: iso('2026-08-05T09:00:00Z'), completedAt: iso('2026-08-05T10:00:00Z'), count: 1, warningCount: 0, errorCount: 0, targetWorkspace: '/networks/NET-001' },
      { stage: 'analytics', label: 'Analytics', description: 'Compute network analytics', status: 'COMPLETED', startedAt: iso('2026-08-05T10:00:00Z'), completedAt: iso('2026-08-05T11:00:00Z'), count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/networks/NET-001/analytics' },
      { stage: 'evidence', label: 'Evidence', description: 'Link evidence items', status: 'NEEDS_REVIEW', startedAt: iso('2026-08-01T09:15:00Z'), completedAt: null, count: 5, warningCount: 1, errorCount: 0, targetWorkspace: '/evidence' },
      { stage: 'findings', label: 'Findings', description: 'Record analytical findings', status: 'COMPLETED', startedAt: iso('2026-08-09T08:00:00Z'), completedAt: iso('2026-08-11T09:00:00Z'), count: 2, warningCount: 0, errorCount: 0, targetWorkspace: '/findings' },
      { stage: 'timeline', label: 'Timeline', description: 'Aggregate the event timeline', status: 'COMPLETED', startedAt: iso('2026-08-01T09:00:00Z'), completedAt: iso('2026-08-12T14:30:00Z'), count: 3, warningCount: 0, errorCount: 0, targetWorkspace: '/timeline' },
    ],
  },
  'inv-002': {
    investigationId: 'inv-002',
    currentStage: 'analytics',
    progress: 50,
    completedStages: ['data', 'extraction', 'resolution', 'network'],
    needReview: [],
    nextRecommendedAction: 'Compute analytics for the movement correlation graph',
    stages: [
      { stage: 'data', label: 'Data', description: 'Ingest and validate datasets', status: 'COMPLETED', startedAt: iso('2026-08-05T08:00:00Z'), completedAt: iso('2026-08-05T08:20:00Z'), count: 2, warningCount: 0, errorCount: 0, targetWorkspace: '/data-intelligence' },
      { stage: 'extraction', label: 'Extraction', description: 'Extract entities from sources', status: 'COMPLETED', startedAt: iso('2026-08-05T08:20:00Z'), completedAt: iso('2026-08-06T09:00:00Z'), count: 3, warningCount: 0, errorCount: 0, targetWorkspace: '/entity-intelligence' },
      { stage: 'resolution', label: 'Resolution', description: 'Resolve duplicate entities', status: 'COMPLETED', startedAt: iso('2026-08-06T09:00:00Z'), completedAt: iso('2026-08-06T09:10:00Z'), count: 3, warningCount: 0, errorCount: 0, targetWorkspace: '/entity-intelligence' },
      { stage: 'relationships', label: 'Relationships', description: 'Build relationship links', status: 'COMPLETED', startedAt: iso('2026-08-06T09:10:00Z'), completedAt: iso('2026-08-06T09:30:00Z'), count: 1, warningCount: 0, errorCount: 0, targetWorkspace: '/networks' },
      { stage: 'network', label: 'Network', description: 'Generate the network graph', status: 'COMPLETED', startedAt: iso('2026-08-07T09:00:00Z'), completedAt: iso('2026-08-07T09:15:00Z'), count: 1, warningCount: 0, errorCount: 0, targetWorkspace: '/networks/NET-002' },
      { stage: 'analytics', label: 'Analytics', description: 'Compute network analytics', status: 'NOT_STARTED', startedAt: null, completedAt: null, count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/networks/NET-002/analytics' },
      { stage: 'evidence', label: 'Evidence', description: 'Link evidence items', status: 'COMPLETED', startedAt: iso('2026-08-05T08:20:00Z'), completedAt: iso('2026-08-06T09:10:00Z'), count: 2, warningCount: 0, errorCount: 0, targetWorkspace: '/evidence' },
      { stage: 'findings', label: 'Findings', description: 'Record analytical findings', status: 'COMPLETED', startedAt: iso('2026-08-07T09:30:00Z'), completedAt: iso('2026-08-07T09:30:00Z'), count: 1, warningCount: 0, errorCount: 0, targetWorkspace: '/findings' },
      { stage: 'timeline', label: 'Timeline', description: 'Aggregate the event timeline', status: 'COMPLETED', startedAt: iso('2026-08-05T08:00:00Z'), completedAt: iso('2026-08-14T10:00:00Z'), count: 2, warningCount: 0, errorCount: 0, targetWorkspace: '/timeline' },
    ],
  },
  'inv-003': {
    investigationId: 'inv-003',
    currentStage: 'resolution',
    progress: 70,
    completedStages: ['data', 'extraction', 'relationships', 'network', 'analytics'],
    needReview: ['resolution', 'relationships'],
    nextRecommendedAction: 'Resolve 2 pending validation issues flagged during review',
    stages: [
      { stage: 'data', label: 'Data', description: 'Ingest and validate datasets', status: 'COMPLETED', startedAt: iso('2026-07-20T09:00:00Z'), completedAt: iso('2026-07-21T09:00:00Z'), count: 5, warningCount: 1, errorCount: 0, targetWorkspace: '/data-intelligence' },
      { stage: 'extraction', label: 'Extraction', description: 'Extract entities from sources', status: 'COMPLETED', startedAt: iso('2026-07-21T09:00:00Z'), completedAt: iso('2026-07-22T09:00:00Z'), count: 5, warningCount: 0, errorCount: 0, targetWorkspace: '/entity-intelligence' },
      { stage: 'resolution', label: 'Resolution', description: 'Resolve duplicate entities', status: 'NEEDS_REVIEW', startedAt: iso('2026-07-22T09:00:00Z'), completedAt: null, count: 4, warningCount: 1, errorCount: 0, targetWorkspace: '/entity-intelligence' },
      { stage: 'relationships', label: 'Relationships', description: 'Build relationship links', status: 'NEEDS_REVIEW', startedAt: iso('2026-07-23T09:00:00Z'), completedAt: null, count: 3, warningCount: 1, errorCount: 0, targetWorkspace: '/networks' },
      { stage: 'network', label: 'Network', description: 'Generate the network graph', status: 'COMPLETED', startedAt: iso('2026-07-24T09:00:00Z'), completedAt: iso('2026-07-24T10:00:00Z'), count: 2, warningCount: 0, errorCount: 0, targetWorkspace: '/networks/NET-001' },
      { stage: 'analytics', label: 'Analytics', description: 'Compute network analytics', status: 'COMPLETED', startedAt: iso('2026-08-02T09:00:00Z'), completedAt: iso('2026-08-02T09:30:00Z'), count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/networks/NET-001/analytics' },
      { stage: 'evidence', label: 'Evidence', description: 'Link evidence items', status: 'COMPLETED', startedAt: iso('2026-07-20T10:00:00Z'), completedAt: iso('2026-07-23T10:00:00Z'), count: 4, warningCount: 0, errorCount: 0, targetWorkspace: '/evidence' },
      { stage: 'findings', label: 'Findings', description: 'Record analytical findings', status: 'COMPLETED', startedAt: iso('2026-07-24T09:00:00Z'), completedAt: iso('2026-08-25T18:00:00Z'), count: 1, warningCount: 0, errorCount: 0, targetWorkspace: '/findings' },
      { stage: 'timeline', label: 'Timeline', description: 'Aggregate the event timeline', status: 'COMPLETED', startedAt: iso('2026-07-20T09:00:00Z'), completedAt: iso('2026-08-25T18:00:00Z'), count: 2, warningCount: 0, errorCount: 0, targetWorkspace: '/timeline' },
    ],
  },
  'inv-006': {
    investigationId: 'inv-006',
    currentStage: 'evidence',
    progress: 90,
    completedStages: ['data', 'extraction', 'resolution', 'relationships', 'network', 'analytics', 'findings', 'timeline'],
    needReview: ['evidence'],
    nextRecommendedAction: 'Review 2 evidence items referencing Meridian Freight before closing the demo journey',
    stages: [
      { stage: 'data', label: 'Data', description: 'Ingest and validate datasets', status: 'COMPLETED', startedAt: iso('2026-08-18T09:00:00Z'), completedAt: iso('2026-08-18T09:30:00Z'), count: 4, warningCount: 0, errorCount: 0, targetWorkspace: '/data-intelligence' },
      { stage: 'extraction', label: 'Extraction', description: 'Extract entities from sources', status: 'COMPLETED', startedAt: iso('2026-08-18T09:30:00Z'), completedAt: iso('2026-08-19T09:00:00Z'), count: 5, warningCount: 0, errorCount: 0, targetWorkspace: '/entity-intelligence' },
      { stage: 'resolution', label: 'Resolution', description: 'Resolve duplicate entities', status: 'COMPLETED', startedAt: iso('2026-08-19T09:00:00Z'), completedAt: iso('2026-08-20T09:00:00Z'), count: 5, warningCount: 0, errorCount: 0, targetWorkspace: '/entity-intelligence' },
      { stage: 'relationships', label: 'Relationships', description: 'Build relationship links', status: 'COMPLETED', startedAt: iso('2026-08-20T09:00:00Z'), completedAt: iso('2026-08-21T11:00:00Z'), count: 4, warningCount: 1, errorCount: 0, targetWorkspace: '/networks' },
      { stage: 'network', label: 'Network', description: 'Generate the network graph', status: 'COMPLETED', startedAt: iso('2026-08-22T09:00:00Z'), completedAt: iso('2026-08-22T09:15:00Z'), count: 1, warningCount: 0, errorCount: 0, targetWorkspace: '/networks/NET-001' },
      { stage: 'analytics', label: 'Analytics', description: 'Compute network analytics', status: 'COMPLETED', startedAt: iso('2026-08-23T09:00:00Z'), completedAt: iso('2026-08-23T09:05:00Z'), count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/networks/NET-001/analytics' },
      { stage: 'evidence', label: 'Evidence', description: 'Link evidence items', status: 'NEEDS_REVIEW', startedAt: iso('2026-08-18T09:15:00Z'), completedAt: null, count: 4, warningCount: 1, errorCount: 0, targetWorkspace: '/evidence' },
      { stage: 'findings', label: 'Findings', description: 'Record analytical findings', status: 'COMPLETED', startedAt: iso('2026-08-24T09:00:00Z'), completedAt: iso('2026-08-25T10:00:00Z'), count: 2, warningCount: 0, errorCount: 0, targetWorkspace: '/findings' },
      { stage: 'timeline', label: 'Timeline', description: 'Aggregate the event timeline', status: 'COMPLETED', startedAt: iso('2026-08-18T09:00:00Z'), completedAt: iso('2026-08-26T12:00:00Z'), count: 3, warningCount: 0, errorCount: 0, targetWorkspace: '/timeline' },
    ],
  },
};

// ------------------------------------------------------------
// Review queue (informational — investigator decides)
// ------------------------------------------------------------

export const mockReviewByInvestigation: Record<string, ReviewItem[]> = {
  'inv-001': [
    { id: 'rvq-001-1', investigationId: 'inv-001', kind: 'relationship_review', priority: 'MEDIUM', title: 'Relationship needs corroboration', description: 'KNOWS link between Rahul Kumar and Vikram Patel is based on a single source record (confidence 0.70).', refType: 'relationship', refId: 'inr-001-2', createdAt: iso('2026-08-04T09:00:00Z'), resolved: false },
    { id: 'rvq-001-2', investigationId: 'inv-001', kind: 'data_validation', priority: 'HIGH', title: 'Duplicate records in CDR dataset', description: '45 duplicate subscriber rows detected during validation.', refType: 'dataset', refId: 'ds-002', createdAt: iso('2026-08-22T11:00:00Z'), resolved: false },
    { id: 'rvq-001-3', investigationId: 'inv-001', kind: 'evidence_missing_metadata', priority: 'LOW', title: 'Evidence missing source reference', description: 'One evidence item has no linked source record.', refType: 'evidence', refId: 'inev-001-5', createdAt: iso('2026-08-06T09:00:00Z'), resolved: false },
    { id: 'rvq-001-4', investigationId: 'inv-001', kind: 'low_confidence_extraction', priority: 'MEDIUM', title: 'Low-confidence entity extraction', description: 'Alias reference R. Kumar extracted at confidence 0.55.', refType: 'entity', refId: 'ine-004-2', createdAt: iso('2026-08-28T08:06:00Z'), resolved: false },
  ],
  'inv-003': [
    { id: 'rvq-003-1', investigationId: 'inv-003', kind: 'unresolved_entity', priority: 'HIGH', title: 'Unresolved entity in account set', description: 'One account entity is not yet resolved to a canonical profile.', refType: 'entity', refId: 'ine-003-4', createdAt: iso('2026-07-22T09:00:00Z'), resolved: false },
    { id: 'rvq-003-2', investigationId: 'inv-003', kind: 'relationship_review', priority: 'MEDIUM', title: 'Relationship referencing unresolved entity', description: 'PART_OF link cannot be corroborated until the entity resolves.', refType: 'relationship', refId: 'inr-003-3', createdAt: iso('2026-07-23T09:30:00Z'), resolved: false },
    { id: 'rvq-003-3', investigationId: 'inv-003', kind: 'data_validation', priority: 'LOW', title: 'Validation issue in bank transaction log', description: 'Multiple normalization issues flagged in the transaction log.', refType: 'dataset', refId: 'ds-003', createdAt: iso('2026-07-21T10:00:00Z'), resolved: false },
  ],
  'inv-004': [
    { id: 'rvq-004-1', investigationId: 'inv-004', kind: 'unresolved_entity', priority: 'HIGH', title: 'Alias entity pending resolution', description: 'R. Kumar alias needs resolution against the canonical profile.', refType: 'entity', refId: 'ine-004-2', createdAt: iso('2026-08-28T08:06:00Z'), resolved: false },
    { id: 'rvq-004-2', investigationId: 'inv-004', kind: 'evidence_missing_metadata', priority: 'LOW', title: 'Evidence missing metadata', description: 'Draft evidence item lacks a source reference.', refType: 'evidence', refId: 'inev-004-1', createdAt: iso('2026-08-28T08:10:00Z'), resolved: false },
  ],
  'inv-006': [
    { id: 'rvq-006-1', investigationId: 'inv-006', kind: 'relationship_review', priority: 'MEDIUM', title: 'Relationship needs corroboration', description: 'KNOWS link between Rahul Kumar and Vikram Patel is based on a single source record (confidence 0.74).', refType: 'relationship', refId: 'inr-006-2', createdAt: iso('2026-08-19T09:00:00Z'), resolved: false },
    { id: 'rvq-006-2', investigationId: 'inv-006', kind: 'evidence_missing_metadata', priority: 'LOW', title: 'Evidence missing source reference', description: 'One evidence item is not yet fully referenced to a source record.', refType: 'evidence', refId: 'inev-006-4', createdAt: iso('2026-08-21T11:10:00Z'), resolved: false },
  ],
};

// ------------------------------------------------------------
// Investigator activity log
// ------------------------------------------------------------

export const mockActivityByInvestigation: Record<string, InvestigationActivityLog[]> = {
  'inv-001': [
    { id: 'fact-001-8', investigationId: 'inv-001', action: 'asked_ai', label: 'Asked AI', detail: 'Assistant queried about Rahul Kumar relationships', at: iso('2026-08-26T10:10:00Z'), actor: 'Inspector Mehta' },
    { id: 'fact-001-7', investigationId: 'inv-001', action: 'opened_network', label: 'Opened network', detail: 'Viewed Operation Clean network', at: iso('2026-08-26T10:05:00Z'), actor: 'Inspector Mehta' },
    { id: 'fact-001-6', investigationId: 'inv-001', action: 'ran_analytics', label: 'Ran analytics', detail: 'Recomputed centrality for NET-001', at: iso('2026-08-26T09:40:00Z'), actor: 'Analyst Singh' },
    { id: 'fact-001-5', investigationId: 'inv-001', action: 'viewed_evidence', label: 'Viewed evidence', detail: 'Inspected CDR subscriber records', at: iso('2026-08-26T09:20:00Z'), actor: 'Analyst Singh' },
    { id: 'fact-001-4', investigationId: 'inv-001', action: 'opened_entity', label: 'Opened entity', detail: 'Inspected profile for Rahul Kumar', at: iso('2026-08-26T09:15:00Z'), actor: 'Inspector Mehta' },
    { id: 'fact-001-3', investigationId: 'inv-001', action: 'created_finding', label: 'Created finding', detail: 'Company relationship observed', at: iso('2026-08-11T09:00:00Z'), actor: 'Inspector Mehta' },
    { id: 'fact-001-2', investigationId: 'inv-001', action: 'created_note', label: 'Created note', detail: 'Probe scope note added', at: iso('2026-08-12T09:00:00Z'), actor: 'Inspector Mehta' },
    { id: 'fact-001-1', investigationId: 'inv-001', action: 'opened_investigation', label: 'Opened investigation', detail: 'Opened Operation Clean', at: iso('2026-08-01T09:00:00Z'), actor: 'Inspector Mehta' },
  ],
  'inv-003': [
    { id: 'fact-003-3', investigationId: 'inv-003', action: 'changed_status', label: 'Changed status', detail: 'Set to under review', at: iso('2026-08-25T18:00:00Z'), actor: 'Officer Rao' },
    { id: 'fact-003-2', investigationId: 'inv-003', action: 'ran_analytics', label: 'Ran analytics', detail: 'Computed review baseline', at: iso('2026-08-02T09:00:00Z'), actor: 'Analyst Singh' },
    { id: 'fact-003-1', investigationId: 'inv-003', action: 'opened_investigation', label: 'Opened investigation', detail: 'Opened Import Fraud Review', at: iso('2026-07-20T09:00:00Z'), actor: 'Inspector Mehta' },
  ],
  'inv-006': [
    { id: 'fact-006-6', investigationId: 'inv-006', action: 'asked_ai', label: 'Asked AI', detail: 'Assistant explained the primary entity and its connections', at: iso('2026-08-26T12:00:00Z'), actor: 'Inspector Mehta' },
    { id: 'fact-006-5', investigationId: 'inv-006', action: 'opened_network', label: 'Opened network', detail: 'Opened Operation Clean network', at: iso('2026-08-26T11:40:00Z'), actor: 'Inspector Mehta' },
    { id: 'fact-006-4', investigationId: 'inv-006', action: 'viewed_evidence', label: 'Viewed evidence', detail: 'Inspected flagged transaction record', at: iso('2026-08-26T11:20:00Z'), actor: 'Analyst Singh' },
    { id: 'fact-006-3', investigationId: 'inv-006', action: 'opened_entity', label: 'Opened entity', detail: 'Inspected profile for Rahul Kumar', at: iso('2026-08-26T11:10:00Z'), actor: 'Inspector Mehta' },
    { id: 'fact-006-2', investigationId: 'inv-006', action: 'created_finding', label: 'Created finding', detail: 'Shared company relationship observed', at: iso('2026-08-25T10:00:00Z'), actor: 'Inspector Mehta' },
    { id: 'fact-006-1', investigationId: 'inv-006', action: 'opened_investigation', label: 'Opened investigation', detail: 'Opened Operation Meridian', at: iso('2026-08-18T09:00:00Z'), actor: 'Inspector Mehta' },
  ],
};

// ------------------------------------------------------------
// Saved views
// ------------------------------------------------------------

export const mockSavedViewsByInvestigation: Record<string, SavedInvestigationView[]> = {
  'inv-001': [
    {
      id: 'sav-001-1',
      investigationId: 'inv-001',
      name: 'Financial Connections',
      description: 'Accounts, transactions and banking relationships.',
      networkFilters: { relationshipTypes: ['OWNS_ACCOUNT', 'SENT_TRANSACTION', 'PART_OF'] },
      timelineRange: { from: iso('2026-08-01T00:00:00Z'), to: null },
      selectedEntities: ['ent-person-001', 'ent-account-001', 'ent-txn-001'],
      analyticsScope: { centralityType: 'betweenness' },
      createdAt: iso('2026-08-12T10:00:00Z'),
    },
    {
      id: 'sav-001-2',
      investigationId: 'inv-001',
      name: 'Communication Network',
      description: 'Subscriber and usage relationships.',
      networkFilters: { relationshipTypes: ['USES'] },
      timelineRange: { from: iso('2026-08-01T00:00:00Z'), to: iso('2026-08-20T00:00:00Z') },
      selectedEntities: ['ent-person-001', 'ent-phone-001'],
      analyticsScope: {},
      createdAt: iso('2026-08-13T09:00:00Z'),
    },
  ],
  'inv-006': [
    {
      id: 'sav-006-1',
      investigationId: 'inv-006',
      name: 'Meridian Core Cluster',
      description: 'Primary device, account and flagged transaction.',
      networkFilters: { relationshipTypes: ['USES', 'OWNS_ACCOUNT', 'SENT_TRANSACTION'] },
      timelineRange: { from: iso('2026-08-18T00:00:00Z'), to: null },
      selectedEntities: ['ent-person-001', 'ent-phone-001', 'ent-account-001', 'ent-txn-001'],
      analyticsScope: { centralityType: 'pagerank' },
      createdAt: iso('2026-08-24T10:00:00Z'),
    },
  ],
};

// ------------------------------------------------------------
// Bookmarks
// ------------------------------------------------------------

export const mockGraphBookmarksByInvestigation: Record<string, GraphBookmark[]> = {
  'inv-001': [
    {
      id: 'gbm-001-1',
      investigationId: 'inv-001',
      networkId: 'NET-001',
      label: 'Core hub — primary device',
      entityIds: ['ent-person-001', 'ent-phone-001', 'ent-account-001'],
      relationshipIds: ['rel-001', 'rel-007'],
      createdAt: iso('2026-08-12T11:00:00Z'),
    },
    {
      id: 'gbm-001-2',
      investigationId: 'inv-001',
      networkId: 'NET-001',
      label: 'Bridge entities',
      entityIds: ['ent-person-003', 'ent-org-001'],
      relationshipIds: ['rel-003', 'rel-005'],
      createdAt: iso('2026-08-13T10:00:00Z'),
    },
  ],
  'inv-006': [
    {
      id: 'gbm-006-1',
      investigationId: 'inv-006',
      networkId: 'NET-001',
      label: 'Meridian core selection',
      entityIds: ['ent-person-001', 'ent-phone-001', 'ent-txn-001'],
      relationshipIds: ['rel-001', 'rel-008'],
      createdAt: iso('2026-08-24T11:00:00Z'),
    },
  ],
};

export const mockTimelineBookmarksByInvestigation: Record<string, TimelineBookmark[]> = {
  'inv-001': [
    {
      id: 'tbm-001-1',
      investigationId: 'inv-001',
      label: 'Incident Period',
      start: iso('2026-02-14T00:00:00Z'),
      end: iso('2026-02-19T23:59:59Z'),
      filters: { entityTypes: ['person', 'phone'] },
      createdAt: iso('2026-08-14T09:00:00Z'),
    },
  ],
  'inv-006': [
    {
      id: 'tbm-006-1',
      investigationId: 'inv-006',
      label: 'Meridian Incident Period',
      start: iso('2026-02-14T00:00:00Z'),
      end: iso('2026-02-19T23:59:59Z'),
      filters: { entityTypes: ['person', 'organization', 'transaction'] },
      createdAt: iso('2026-08-25T09:00:00Z'),
    },
  ],
};

// ------------------------------------------------------------
// Cross references (reference real canonical ids)
// ------------------------------------------------------------
// ENTITY-014 style chain: entity → relationship → evidence → finding.

export const mockCrossReferencesByInvestigation: Record<string, CrossReference[]> = {
  'inv-001': [
    {
      id: 'xr-001-1',
      investigationId: 'inv-001',
      entity: { type: 'entity', id: 'ent-person-001', label: 'Rahul Kumar' },
      relationships: [
        { type: 'relationship', id: 'rel-001', label: 'USES — primary device' },
        { type: 'relationship', id: 'rel-005', label: 'WORKS_FOR — Mumbai Trading Corp' },
        { type: 'relationship', id: 'rel-007', label: 'OWNS_ACCOUNT — 7731 0029 4567' },
      ],
      evidence: [
        { type: 'evidence', id: 'ev-001', label: 'FIR record — named accused' },
        { type: 'evidence', id: 'ev-004', label: 'CDR subscriber records' },
        { type: 'evidence', id: 'ev-007', label: 'GST registration' },
      ],
      findings: [
        { type: 'finding', id: 'inf-001-1', label: 'Concentrated usage around the primary device' },
        { type: 'finding', id: 'inf-001-2', label: 'Company relationship observed' },
      ],
      links: [
        { fromType: 'entity', toType: 'relationship' },
        { fromType: 'relationship', toType: 'evidence' },
        { fromType: 'entity', toType: 'finding' },
        { fromType: 'finding', toType: 'evidence' },
      ],
    },
  ],
  'inv-006': [
    {
      id: 'xr-006-1',
      investigationId: 'inv-006',
      entity: { type: 'entity', id: 'ent-person-001', label: 'Rahul Kumar' },
      relationships: [
        { type: 'relationship', id: 'rel-001', label: 'USES — primary device' },
        { type: 'relationship', id: 'rel-005', label: 'WORKS_FOR — Mumbai Trading Corp' },
        { type: 'relationship', id: 'rel-008', label: 'SENT_TRANSACTION — flagged' },
      ],
      evidence: [
        { type: 'evidence', id: 'ev-001', label: 'FIR record — named accused' },
        { type: 'evidence', id: 'ev-004', label: 'CDR subscriber records' },
        { type: 'evidence', id: 'ev-009', label: 'Flagged transaction record' },
      ],
      findings: [
        { type: 'finding', id: 'inf-006-1', label: 'Coordinate cluster around the primary device' },
        { type: 'finding', id: 'inf-006-2', label: 'Shared company relationship observed' },
      ],
      links: [
        { fromType: 'entity', toType: 'relationship' },
        { fromType: 'relationship', toType: 'evidence' },
        { fromType: 'entity', toType: 'finding' },
        { fromType: 'finding', toType: 'evidence' },
      ],
    },
  ],
};

// ------------------------------------------------------------
// Provenance chains
// ------------------------------------------------------------

export const mockProvenanceByInvestigation: Record<string, ProvenanceChain[]> = {
  'inv-001': [
    {
      id: 'prov-001-1',
      investigationId: 'inv-001',
      targetType: 'relationship',
      targetId: 'rel-007',
      timestamp: iso('2026-08-04T11:25:00Z'),
      nodes: [
        { type: 'source', id: 'src-bank', label: 'Transaction Data', detail: 'Flagged transaction source', timestamp: null },
        { type: 'dataset', id: 'ds-003', label: 'Bank Transaction Log', detail: 'Suspicious transaction patterns', timestamp: null },
        { type: 'record', id: 'rec-bank-132', label: 'Row 132', detail: 'Flagged transaction record', timestamp: iso('2026-02-14T11:05:00Z') },
        { type: 'entity', id: 'ent-account-001', label: '7731 0029 4567', detail: 'Account entity', timestamp: null },
        { type: 'relationship', id: 'rel-007', label: 'OWNS_ACCOUNT', detail: 'Account ownership link', timestamp: iso('2026-08-04T11:25:00Z') },
        { type: 'finding', id: 'inf-001-1', label: 'Concentrated usage', detail: 'Related finding', timestamp: iso('2026-08-09T08:00:00Z') },
      ],
    },
    {
      id: 'prov-001-2',
      investigationId: 'inv-001',
      targetType: 'relationship',
      targetId: 'rel-001',
      timestamp: iso('2026-08-01T09:12:00Z'),
      nodes: [
        { type: 'source', id: 'src-cdr', label: 'Communication Data', detail: 'CDR extract source', timestamp: null },
        { type: 'dataset', id: 'ds-002', label: 'CDR Extract - Operation clean', detail: 'Call detail records', timestamp: null },
        { type: 'record', id: 'rec-cdr-2241', label: 'cdr_extract.csv #2241', detail: 'Subscriber record', timestamp: iso('2026-02-14T11:05:00Z') },
        { type: 'entity', id: 'ent-phone-001', label: '+91 98765 43210', detail: 'Phone entity', timestamp: null },
        { type: 'relationship', id: 'rel-001', label: 'USES', detail: 'Subscriber link', timestamp: iso('2026-08-01T09:12:00Z') },
      ],
    },
  ],
  'inv-006': [
    {
      id: 'prov-006-1',
      investigationId: 'inv-006',
      targetType: 'relationship',
      targetId: 'rel-001',
      timestamp: iso('2026-08-18T09:12:00Z'),
      nodes: [
        { type: 'source', id: 'src-cdr', label: 'Communication Data', detail: 'CDR extract source', timestamp: null },
        { type: 'dataset', id: 'ds-002', label: 'CDR Extract - Operation clean', detail: 'Call detail records', timestamp: null },
        { type: 'record', id: 'rec-cdr-2241', label: 'cdr_extract.csv #2241', detail: 'Subscriber record', timestamp: iso('2026-02-14T11:05:00Z') },
        { type: 'entity', id: 'ent-phone-001', label: '+91 98765 43210', detail: 'Phone entity', timestamp: null },
        { type: 'relationship', id: 'rel-001', label: 'USES', detail: 'Subscriber link', timestamp: iso('2026-08-18T09:12:00Z') },
        { type: 'finding', id: 'inf-006-1', label: 'Coordinate cluster', detail: 'Related finding', timestamp: iso('2026-08-24T09:00:00Z') },
      ],
    },
  ],
};

// ------------------------------------------------------------
// Investigation-scoped search (across entities / relationships /
// evidence / findings / datasets / notes for the current investigation)
// ------------------------------------------------------------

export const mockSearchByInvestigation: Record<string, InvestigationSearchResult[]> = {
  'inv-001': [
    { id: 's1-001', investigationId: 'inv-001', kind: 'entity', label: 'Rahul Kumar', description: 'Primary person of interest', refId: 'ent-person-001', score: 0.95 },
    { id: 's2-001', investigationId: 'inv-001', kind: 'entity', label: '+91 98765 43210', description: 'Primary device', refId: 'ent-phone-001', score: 0.9 },
    { id: 's3-001', investigationId: 'inv-001', kind: 'relationship', label: 'Rahul Kumar USES +91 98765 43210', description: 'Subscriber link', refId: 'rel-001', score: 0.9 },
    { id: 's4-001', investigationId: 'inv-001', kind: 'evidence', label: 'FIR record — named accused', description: 'Case scan naming the individual', refId: 'ev-001', score: 0.88 },
    { id: 's5-001', investigationId: 'inv-001', kind: 'finding', label: 'Concentrated usage around the primary device', description: 'Association finding', refId: 'inf-001-1', score: 0.86 },
    { id: 's6-001', investigationId: 'inv-001', kind: 'dataset', label: 'CDR Extract - Operation clean', description: 'Call detail records', refId: 'ds-002', score: 0.8 },
    { id: 's7-001', investigationId: 'inv-001', kind: 'note', label: 'Probe scope', description: 'Scope note', refId: 'inn-001-1', score: 0.6 },
  ],
  'inv-006': [
    { id: 's1-006', investigationId: 'inv-006', kind: 'entity', label: 'Rahul Kumar', description: 'Person of interest', refId: 'ent-person-001', score: 0.95 },
    { id: 's2-006', investigationId: 'inv-006', kind: 'entity', label: 'Vikram Patel', description: 'Linked person', refId: 'ent-person-003', score: 0.74 },
    { id: 's3-006', investigationId: 'inv-006', kind: 'relationship', label: 'Rahul Kumar USES +91 98765 43210', description: 'Subscriber link', refId: 'rel-001', score: 0.98 },
    { id: 's4-006', investigationId: 'inv-006', kind: 'evidence', label: 'FIR record — named accused', description: 'Case scan', refId: 'ev-001', score: 0.88 },
    { id: 's5-006', investigationId: 'inv-006', kind: 'finding', label: 'Coordinate cluster around the primary device', description: 'Association finding', refId: 'inf-006-1', score: 0.87 },
    { id: 's6-006', investigationId: 'inv-006', kind: 'dataset', label: 'CDR Extract - Operation clean', description: 'Call detail records', refId: 'ds-002', score: 0.8 },
    { id: 's7-006', investigationId: 'inv-006', kind: 'note', label: 'Demo journey anchor', description: 'Scope note', refId: 'inn-006-1', score: 0.6 },
  ],
};

// Default empty collections for investigations without explicit data
const EMPTY: never[] = [];

export function defaultEmptyFor<T>(): T[] {
  return EMPTY as unknown as T[];
}
