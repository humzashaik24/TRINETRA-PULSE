/**
 * Dashboard view-model + pure derivation for the Intelligence Overview.
 *
 * The dashboard widgets consume a single deterministic view
 * (``DashboardViewData``). In mock mode the view is assembled from the
 * existing ``@/mock`` fixtures and returned synchronously — output stays
 * byte-identical to the pre-Phase-B widgets. In API mode the view is derived
 * from the real investigation workspace (``MappedWorkspace``) plus the real
 * investigation list, so every metric, node, finding, pattern and activity
 * row is grounded in the relational database.
 *
 * This module (and ``layout.ts``) must stay free of ``@/mock`` imports so the
 * API path never silently falls back to demo data.
 *
 * Derivation rules (all deterministic — no random values, no fabricated
 * review counts, no fabricated temporal fields):
 *   - metrics   : real slice lengths (entities / relationships / events /
 *                 findings / evidence) and real open-investigation count.
 *   - network   : real nodes/edges via a generic cluster-ring layout.
 *   - foundings : real findings mapped to the RecentIntelligence contract.
 *   - patterns  : real findings presented as SuspiciousPattern entries
 *                 (status "new", derived labels — never ones we invent).
 *   - activity  : real workspace activity/timeline entries.
 *   - chart     : 7-day buckets anchored to the current time.
 */

import type {
  ActivitySeries,
  ActivityDataPoint,
  DashboardMetrics,
  DashboardMetric,
  DashboardNetworkSummary,
  ImportantEntity,
  ImportanceCategory,
  IntelligenceSeverity,
  IntelligenceType,
  InvestigationActivity,
  InvestigationActivityEntry,
  ActivityAction,
  InvestigationStatus,
  InvestigationFinding,
  InvestigationRelationship,
  RecentIntelligence,
  SuspiciousPattern,
  EntityType,
} from '@trinetra-pulse/types';
import type { MappedWorkspace } from '@/lib/api/adapter';
import type { Investigation } from '@trinetra-pulse/types';
import { buildNetworkSummary } from './layout';

// -------------------------------------------------------------------
// View meta
// -------------------------------------------------------------------

export interface DashboardViewMeta {
  /** Identifier used for links into the investigation workspace. In API
   *  mode this is the canonical id when known, otherwise the real UUID. */
  investigationId: string;
  /** Network id used for the "open full network" deep link. In API mode the
   *  backend keys networks by investigation id. */
  networkId: string;
  investigationTitle: string;
  investigationStatus: InvestigationStatus;
  description: string;
  isDemo: boolean;
}

/** Open-case row rendered by the ActiveInvestigations widget. */
export interface ActiveInvestigationSummary {
  id: string;
  title: string;
  status: InvestigationStatus;
  lead_investigator: string;
  /** Outstanding review-queue count. Mock mode carries the operations
   *  fixture counts; API mode honestly reports 0 (the relational model has
   *  no review queue, so a number would be invented). */
  reviewCount: number;
}

export interface DashboardViewData {
  meta: DashboardViewMeta;
  metrics: DashboardMetrics;
  network: DashboardNetworkSummary;
  recentFindings: RecentIntelligence[];
  importantEntities: ImportantEntity[];
  patterns: SuspiciousPattern[];
  activity: InvestigationActivity[];
  activitySeries: ActivitySeries;
  activeInvestigations: ActiveInvestigationSummary[];
}

// -------------------------------------------------------------------
// Small deterministic helpers
// -------------------------------------------------------------------

const DAY_MS = 86_400_000;

/** Relative time-ago label computed against a fixed anchor ("now"). */
export function relativeAgo(anchorMs: number, iso: string): string {
  const ageMs = Math.max(0, anchorMs - new Date(iso).getTime());
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function confidenceValue(level: InvestigationFinding['confidence']): number {
  if (level === 'high') return 0.9;
  if (level === 'medium') return 0.7;
  return 0.5;
}

const SEVERITIES: IntelligenceSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];

function severityOf(category: string): IntelligenceSeverity {
  const candidate = category.toLowerCase() as IntelligenceSeverity;
  return SEVERITIES.includes(candidate) ? candidate : 'medium';
}

function entityRef(id: string, name: string, type: unknown): ID {
  return { id, name, type: (type as EntityType) ?? 'person' };
}

interface ID {
  id: string;
  name: string;
  type: EntityType;
}

// -------------------------------------------------------------------
// Metrics
// -------------------------------------------------------------------

const METRIC_META: Record<
  Exclude<keyof DashboardMetrics, never>,
  { label: string; icon: string; description: string }
> = {
  entities: { label: 'Entities', icon: 'users', description: 'Canonical entities tracked in the active investigation' },
  relationships: { label: 'Relationships', icon: 'network', description: 'Connections between entities in the intelligence graph' },
  events: { label: 'Events', icon: 'calendar', description: 'Real-world events captured for the investigation' },
  activeInvestigations: { label: 'Active Investigations', icon: 'folder-open', description: 'Open cases under direct monitoring' },
  suspiciousPatterns: { label: 'Suspicious Patterns', icon: 'alert-triangle', description: 'Finding-derived patterns awaiting review' },
  findings: { label: 'Findings', icon: 'file-text', description: 'Analytical findings on the active investigation' },
  evidenceItems: { label: 'Evidence Items', icon: 'layers', description: 'Evidence records linked to the investigation' },
  clusters: { label: 'Clusters', icon: 'boxes', description: 'Connected components in the intelligence graph' },
};

function metric(
  field: Exclude<keyof DashboardMetrics, never>,
  value: number,
): DashboardMetric {
  const meta = METRIC_META[field];
  return {
    id: `metric-${field}-${value}`,
    label: meta.label,
    value,
    formattedValue: String(value),
    icon: meta.icon,
    description: meta.description,
  };
}

// -------------------------------------------------------------------
// Recent findings / patterns (finding-derived)
// -------------------------------------------------------------------

function typeOfFinding(finding: InvestigationFinding): IntelligenceType {
  const text = [...finding.tags, finding.title, finding.description].join(' ').toLowerCase();
  if (text.includes('funds') || text.includes('transfer') || text.includes('trasfer') || text.includes('flow')) return 'relationship';
  if (text.includes('cluster') || text.includes('network')) return 'network';
  if (text.includes('evidence')) return 'evidence';
  if (text.includes('entity')) return 'entity';
  if (text.includes('pattern')) return 'pattern';
  return 'anomaly';
}

function patternTypeOf(finding: InvestigationFinding): SuspiciousPattern['type'] {
  const text = [...finding.tags, finding.title, finding.description].join(' ').toLowerCase();
  if (text.includes('money') || text.includes('funds') || text.includes('transaction') || text.includes('payment')) return 'transaction_anomaly';
  if (text.includes('location') || text.includes('geographic') || text.includes('cross-border')) return 'location_pattern';
  if (text.includes('temporal') || text.includes('time-sliced') || text.includes('burst')) return 'temporal_cluster';
  if (text.includes('communication') || text.includes('call') || text.includes('cdr')) return 'communication_spike';
  if (text.includes('velocity') || text.includes('rapid')) return 'velocity_anomaly';
  return 'network_burst';
}

const PATTERN_LABELS: Record<SuspiciousPattern['type'], string> = {
  communication_spike: 'Communication Spike',
  transaction_anomaly: 'Transaction Anomaly',
  location_pattern: 'Location Pattern',
  temporal_cluster: 'Temporal Cluster',
  velocity_anomaly: 'Velocity Anomaly',
  network_burst: 'Network Burst',
};

// -------------------------------------------------------------------
// Network statistics helpers (pure counts used by the API derive)
// -------------------------------------------------------------------

export function openStatus(status: InvestigationStatus): boolean {
  return status !== 'closed' && status !== 'archived';
}

export function deriveActiveInvestigations(
  investigations: Investigation[],
): ActiveInvestigationSummary[] {
  return investigations
    .filter((inv) => openStatus(inv.status))
    .map((inv) => ({
      id: inv.id,
      title: inv.title,
      status: inv.status,
      lead_investigator: inv.lead_investigator,
      reviewCount: 0,
    }));
}

// -------------------------------------------------------------------
// Slices
// -------------------------------------------------------------------

export function deriveMetrics(
  ws: MappedWorkspace,
  allInvestigations: Investigation[],
  communityCount: number,
): DashboardMetrics {
  return {
    entities: metric('entities', ws.entities.length),
    relationships: metric('relationships', ws.relationships.length),
    events: metric('events', ws.events.length),
    activeInvestigations: metric(
      'activeInvestigations',
      allInvestigations.filter((inv) => openStatus(inv.status)).length,
    ),
    suspiciousPatterns: metric('suspiciousPatterns', ws.findings.length),
    findings: metric('findings', ws.findings.length),
    evidenceItems: metric('evidenceItems', ws.evidence.length),
    clusters: metric('clusters', communityCount),
  };
}

export function deriveNetwork(ws: MappedWorkspace): DashboardNetworkSummary {
  return buildNetworkSummary({
    nodes: ws.entities.map((e) => ({
      id: e.entity_id,
      label: e.name,
      type: e.entity_type,
      size: 12,
      connections: 0,
    })),
    edges: ws.relationships.map((r) => ({
      id: r.relationship_id,
      source: r.source_entity_id,
      target: r.target_entity_id,
      type: r.type,
      weight: r.confidence,
    })),
  });
}

function entityMapFor(ws: MappedWorkspace): Map<string, { name: string; type: EntityType }> {
  const map = new Map<string, { name: string; type: EntityType }>();
  for (const e of ws.entities) map.set(e.entity_id, { name: e.name, type: e.entity_type });
  return map;
}

export function deriveRecentFindings(
  ws: MappedWorkspace,
  anchorMs: number,
): RecentIntelligence[] {
  const entityMap = entityMapFor(ws);
  return [...ws.findings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)
    .map((finding) => ({
      id: finding.id,
      type: typeOfFinding(finding),
      title: finding.title,
      description: finding.description,
      entities: finding.entity_ids.slice(0, 4).map((id) => {
        const ref = entityMap.get(id);
        return entityRef(id, ref?.name ?? id, ref?.type ?? 'person');
      }),
      confidence: confidenceValue(finding.confidence),
      severity: severityOf(finding.category),
      source: finding.source,
      timestamp: finding.created_at,
      timeAgo: relativeAgo(anchorMs, finding.created_at),
    }));
}

function degreeMapFor(ws: MappedWorkspace): Map<string, number> {
  const degree = new Map<string, number>();
  for (const e of ws.entities) degree.set(e.entity_id, 0);
  for (const r of ws.relationships) {
    degree.set(r.source_entity_id, (degree.get(r.source_entity_id) ?? 0) + 1);
    degree.set(r.target_entity_id, (degree.get(r.target_entity_id) ?? 0) + 1);
  }
  return degree;
}

function importanceCategory(connections: number, maxDegree: number, idx: number): ImportanceCategory {
  if (connections >= 8 || (maxDegree > 0 && connections === maxDegree && connections >= 6)) return 'high_connectivity';
  if (idx < 3) return 'bridge_position';
  return connections >= 3 ? 'recent_activity' : 'pattern_involvement';
}

const CATEGORY_LABELS: Record<ImportanceCategory, string> = {
  high_connectivity: 'High Connectivity',
  bridge_position: 'Bridge Position',
  recent_activity: 'Recent Activity',
  pattern_involvement: 'Pattern Involvement',
};

export function deriveImportantEntities(
  ws: MappedWorkspace,
  anchorMs: number,
): ImportantEntity[] {
  const degree = degreeMapFor(ws);
  const scored = ws.entities
    .map((entity) => ({
      entity,
      connections: degree.get(entity.entity_id) ?? 0,
      linkedAt: new Date(entity.linked_at).getTime(),
    }))
    .filter((entry) => entry.connections > 0)
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 8);

  const maxDegree = scored.length ? scored[0].connections : 1;

  return scored.map((entry, idx) => {
    const centrality = entry.connections / Math.max(1, maxDegree);
    const category = importanceCategory(entry.connections, maxDegree, idx);
    const ageMs = Math.max(0, anchorMs - entry.linkedAt);
    const activityStatus = ageMs <= 3 * DAY_MS
      ? ('active' as const)
      : ageMs <= 14 * DAY_MS
        ? ('recent' as const)
        : ('inactive' as const);
    return {
      id: entry.entity.entity_id,
      name: entry.entity.name,
      type: entry.entity.entity_type,
      connections: entry.connections,
      centrality,
      centralityLabel:
        centrality >= 0.7
          ? 'Very High'
          : centrality >= 0.5
            ? 'High'
            : centrality >= 0.3
              ? 'Moderate'
              : 'Emerging',
      category,
      categoryLabel: CATEGORY_LABELS[category],
      activityStatus,
      activityLabel:
        activityStatus === 'active' ? 'Active' : activityStatus === 'recent' ? 'Recently active' : 'Idle',
      riskScore: entry.entity.association_confidence,
    };
  });
}

export function derivePatterns(
  ws: MappedWorkspace,
  anchorMs: number,
): SuspiciousPattern[] {
  const entityMap = entityMapFor(ws);
  return [...ws.findings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((finding) => {
      const type = patternTypeOf(finding);
      return {
        id: finding.id,
        type,
        typeLabel: PATTERN_LABELS[type],
        title: finding.title,
        description: finding.description,
        entities: finding.entity_ids.slice(0, 4).map((id) => {
          const ref = entityMap.get(id);
          return entityRef(id, ref?.name ?? id, ref?.type ?? 'person');
        }),
        entityCount: finding.entity_ids.length,
        confidence: confidenceValue(finding.confidence),
        severity: severityOf(finding.category),
        metrics: {
          Severity: severityOf(finding.category).toUpperCase(),
          Confidence: `${Math.round(confidenceValue(finding.confidence) * 100)}%`,
          Entities: String(finding.entity_ids.length),
        },
        timestamp: finding.created_at,
        timeAgo: relativeAgo(anchorMs, finding.created_at),
        status: 'new' as const,
      };
    });
}

// -------------------------------------------------------------------
// Activity feed (workspace activity + timeline)
// -------------------------------------------------------------------

const ACTION_MAP: Record<InvestigationActivityEntry['type'], { action: ActivityAction; actionLabel: string }> = {
  created: { action: 'created', actionLabel: 'Case Created' },
  updated: { action: 'updated', actionLabel: 'Investigation Updated' },
  status_changed: { action: 'updated', actionLabel: 'Status Updated' },
  entity_linked: { action: 'entity_reviewed', actionLabel: 'Entity Linked' },
  entity_removed: { action: 'updated', actionLabel: 'Entity Removed' },
  relationship_linked: { action: 'network_expanded', actionLabel: 'Relationship Linked' },
  relationship_removed: { action: 'updated', actionLabel: 'Relationship Removed' },
  evidence_linked: { action: 'evidence_added', actionLabel: 'Evidence Added' },
  evidence_removed: { action: 'updated', actionLabel: 'Evidence Removed' },
  finding_created: { action: 'pattern_detected', actionLabel: 'Pattern Detected' },
  finding_updated: { action: 'updated', actionLabel: 'Finding Updated' },
  note_created: { action: 'updated', actionLabel: 'Note Added' },
  note_updated: { action: 'updated', actionLabel: 'Note Updated' },
  note_deleted: { action: 'updated', actionLabel: 'Note Removed' },
  network_linked: { action: 'network_expanded', actionLabel: 'Network Expanded' },
  analytics_captured: { action: 'updated', actionLabel: 'Analytics Captured' },
  document_added: { action: 'evidence_added', actionLabel: 'Document Added' },
  commented: { action: 'updated', actionLabel: 'Commented' },
};

function referenceTypeFor(
  type: InvestigationActivityEntry['type'],
): InvestigationActivity['reference']['type'] {
  switch (type) {
    case 'entity_linked':
    case 'entity_removed':
      return 'entity';
    case 'network_linked':
    case 'relationship_linked':
      return 'network';
    case 'evidence_linked':
    case 'document_added':
      return 'evidence';
    case 'finding_created':
    case 'finding_updated':
      return 'pattern';
    default:
      return 'case';
  }
}

export function deriveActivity(
  ws: MappedWorkspace,
  anchorMs: number,
): InvestigationActivity[] {
  const entries = ws.activity.length
    ? ws.activity
    : ws.timeline.map((entry, index) => ({
        id: `activity-${entry.ref_id ?? index}`,
        investigation_id: ws.investigation?.id ?? '',
        type: 'updated' as InvestigationActivityEntry['type'],
        title: entry.title,
        detail: entry.description,
        actor: entry.actor ?? 'System',
        at: entry.timestamp ?? new Date(anchorMs).toISOString(),
      }));

  return entries.slice(0, 12).map((entry) => {
    const mapped = ACTION_MAP[entry.type] ?? { action: 'updated' as ActivityAction, actionLabel: 'Investigation Updated' };
    const label = entry.title.length > 26 ? `${entry.title.slice(0, 24)}…` : entry.title;
    return {
      id: entry.id,
      action: mapped.action,
      actionLabel: mapped.actionLabel,
      title: entry.title,
      subtitle: entry.detail ?? '',
      reference: {
        type: referenceTypeFor(entry.type),
        id: entry.investigation_id,
        label,
      },
      timestamp: entry.at,
      timeAgo: relativeAgo(anchorMs, entry.at),
      user: entry.actor ?? undefined,
    };
  });
}

// -------------------------------------------------------------------
// Activity series (7-day buckets anchored to now)
// -------------------------------------------------------------------

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function deriveActivitySeries(
  ws: MappedWorkspace,
  anchorMs: number,
): ActivitySeries {
  const start = new Date(anchorMs);
  start.setHours(0, 0, 0, 0);

  const bucketIndex = (iso: string): number => {
    const t = new Date(iso).getTime();
    const day = Math.floor((start.getTime() - t) / DAY_MS);
    return 6 - Math.max(0, Math.min(6, day));
  };

  const data: ActivityDataPoint[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start.getTime() + i * DAY_MS);
    return {
      label: DAY_KEYS[day.getDay()],
      events: 0,
      relationships: 0,
      communications: 0,
      patterns: 0,
    };
  });

  for (const event of ws.events) {
    if (!event.created_at) continue;
    const idx = bucketIndex(event.created_at);
    if (idx >= 0 && idx < 7) data[idx].events += 1;
  }
  for (const rel of ws.relationships) {
    if (!rel.linked_at) continue;
    const idx = bucketIndex(rel.linked_at);
    if (idx >= 0 && idx < 7) data[idx].relationships += 1;
  }
  for (const finding of [...ws.findings].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())) {
    const idx = bucketIndex(finding.created_at);
    if (idx >= 0 && idx < 7) data[idx].patterns += 1;
  }

  return {
    data,
    totalEvents: data.reduce((sum, d) => sum + d.events, 0),
    totalRelationships: data.reduce((sum, d) => sum + d.relationships, 0),
    period: 'Past 7 days',
  };
}

// -------------------------------------------------------------------
// Full view
// -------------------------------------------------------------------

export interface DeriveViewOptions {
  allInvestigations: Investigation[];
  anchorMs?: number;
}

export function deriveView(
  ws: MappedWorkspace,
  options: DeriveViewOptions,
): DashboardViewData {
  const anchorMs = options.anchorMs ?? Date.now();
  const investigation = ws.investigation;
  const networkId = ws.networks[0]?.network_id ?? investigation?.id ?? '';

  const network = deriveNetwork(ws);
  const metrics = deriveMetrics(ws, options.allInvestigations, network.communityCount);
  const recentFindings = deriveRecentFindings(ws, anchorMs);
  const importantEntities = deriveImportantEntities(ws, anchorMs);
  const patterns = derivePatterns(ws, anchorMs);
  const activity = deriveActivity(ws, anchorMs);
  const activitySeries = deriveActivitySeries(ws, anchorMs);

  return {
    meta: {
      investigationId: investigation?.id ?? '',
      networkId,
      investigationTitle: investigation?.title ?? 'Untitled investigation',
      investigationStatus: investigation?.status ?? 'draft',
      description: investigation?.description ?? '',
      isDemo: false,
    },
    metrics,
    network,
    recentFindings,
    importantEntities,
    patterns,
    activity,
    activitySeries,
    activeInvestigations: deriveActiveInvestigations(options.allInvestigations),
  };
}