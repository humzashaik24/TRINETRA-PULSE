import type { DashboardMetrics } from '@trinetra-pulse/types';
import { nexusNetwork, nexusInvestigationRecord } from './nexus-dataset';
import { NEXUS_PATTERNS } from './nexus-dataset';
import { NEXUS_EVIDENCE_ITEMS } from './nexus-dataset';
import { mockInvestigationRecords } from './investigations';
import { isPresentationInvestigation } from './investigations';

// ============================================================
// OVERVIEW METRICS — OPERATION TRINETRA NEXUS
// ============================================================
// Derived live from the single demo universe (inv-demo-nexus /
// NET-004), not a hardcoded catalogue-wide snapshot. Every card
// resolves from the Nexus graph, evidence set, patterns, findings
// and investigation record so the numbers can never drift from the
// graph the jury actually explores. Presented neutrally as
// demonstration data.
// ============================================================

const nexus = nexusInvestigationRecord;

export const dashboardMetrics: DashboardMetrics = {
  entities: {
    id: 'entities',
    label: 'Entities',
    value: nexusNetwork.nodes.length,
    formattedValue: String(nexusNetwork.nodes.length),
    icon: 'users',
    description: 'Entities in Operation Trinetra Nexus (demonstration data)',
  },
  relationships: {
    id: 'relationships',
    label: 'Relationships',
    value: nexusNetwork.edges.length,
    formattedValue: String(nexusNetwork.edges.length),
    icon: 'network',
    description: 'Relationships in the Operation Trinetra Nexus graph (demonstration data)',
  },
  events: {
    id: 'events',
    label: 'Events',
    value: nexus.events.length,
    formattedValue: String(nexus.events.length),
    icon: 'calendar',
    description: 'Events recorded against Operation Trinetra Nexus',
  },
  activeInvestigations: {
    id: 'active-investigations',
    label: 'Active Investigations',
    value: mockInvestigationRecords.filter((r) => isPresentationInvestigation(r.investigation.id))
      .length,
    formattedValue: String(
      mockInvestigationRecords.filter((r) => isPresentationInvestigation(r.investigation.id))
        .length
    ),
    icon: 'folder-open',
    description: 'Active investigation in the presentation workspace (Operation Trinetra Nexus)',
  },
  suspiciousPatterns: {
    id: 'suspicious-patterns',
    label: 'Suspicious Patterns',
    value: NEXUS_PATTERNS.length,
    formattedValue: String(NEXUS_PATTERNS.length),
    icon: 'alert-triangle',
    description: 'Patterns flagged by the intelligence engine for Operation Trinetra Nexus',
  },
  findings: {
    id: 'findings',
    label: 'Findings',
    value: nexus.findings.length,
    formattedValue: String(nexus.findings.length),
    icon: 'layers',
    description: 'Analytical findings produced during Operation Trinetra Nexus',
  },
  evidenceItems: {
    id: 'evidence-items',
    label: 'Evidence Items',
    value: NEXUS_EVIDENCE_ITEMS.length,
    formattedValue: String(NEXUS_EVIDENCE_ITEMS.length),
    icon: 'file-text',
    description: 'Evidence items catalogued and integrity-chained for Operation Trinetra Nexus',
  },
  clusters: {
    id: 'clusters',
    label: 'Clusters',
    value: nexusNetwork.clusters.length,
    formattedValue: String(nexusNetwork.clusters.length),
    icon: 'boxes',
    description: 'Communities detected across the Operation Trinetra Nexus graph',
  },
};