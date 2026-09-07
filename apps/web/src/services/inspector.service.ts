import type {
  Dataset,
  EntityEvidenceItem,
  EntityRelationship,
  EntityType,
  EvidenceItem,
  InvestigationFinding,
  RecentIntelligence,
  RelationshipEvidenceLink,
  RelationshipIntelligence,
  SuspiciousPattern,
} from '@trinetra-pulse/types';
import {
  fetchEntity,
  fetchEntityIntelligenceSummary,
  fetchRelationship,
} from '@/services/entity.service';
import {
  getRelationshipIntelligence,
  fetchRelationshipEvidenceLinks,
} from '@/services/relationship-intelligence.service';
import { mockDatasetById } from '@/mock/datasets';
import { recentIntelligenceFindings } from '@/mock/findings';
import { suspiciousPatterns } from '@/mock/patterns';
import { mockEntityEvidence } from '@/mock/entity-evidence';
import { mockEntityProfileById } from '@/mock/entity-profiles';
import { mockEvidenceById } from '@/mock/evidence-intelligence';
import { dashboardNetwork } from '@/mock/network';
import { useAnalyticsStore } from '@/state/analytics.store';
import {
  type CaseContext,
  type CentralityContext,
  type CommunityContext,
  type ComponentContext,
  type DatasetContext,
  type EntityContext,
  type EvidenceContext,
  type FindingContext,
  type InspectorContext,
  type InvestigationContext,
  type NoteContext,
  type EventContext,
  type AnalyticsSnapshotContext,
  type NetworkContext,
  type PatternContext,
  type RelationshipContext,
} from '@/state/shell.store';
import { mockInvestigationById } from '@/mock/investigations';

// ============================================================
// PHASE 3.5 — INSPECTOR DATA RESOLUTION
// ============================================================
// Resolves an InspectorContext into render-ready view data.
// Pure read paths over the existing mock/service architecture.
// ============================================================

export interface InspectorEntityView {
  kind: 'entity';
  id: string;
  name: string;
  entityType: EntityType;
  resolutionState: string;
  confidence: number;
  connections: number;
  evidence: number;
  sources: number;
  events: number;
  verified: boolean;
  flagged: boolean;
  aliases: string[];
  description?: string;
  /** Investigation scope so the inspector can route back correctly. */
  investigationId?: string;
}

export interface InspectorRelationshipView {
  kind: 'relationship';
  id: string;
  type: string;
  sourceEntityName: string;
  sourceEntityType: EntityType;
  targetEntityName: string;
  targetEntityType: EntityType;
  confidence: number;
  verificationStatus: string;
  source: string;
  evidence: string[];
  /** Investigation scope so the inspector can route back correctly. */
  investigationId?: string;
  /** Phase 21 — multi-source correlation intelligence (when available). */
  intelligence?: RelationshipIntelligence;
  evidenceLinks?: RelationshipEvidenceLink[];
}

export interface InspectorDatasetView {
  kind: 'dataset';
  id: string;
  name: string;
  description?: string;
  format: string;
  category: string;
  status: string;
  recordCount: number;
  fileSize: number;
  qualityScore: number;
  qualityLevel: string;
  warnings: number;
  errors: number;
  createdAt: string;
  updatedAt: string;
}

export interface InspectorFindingView {
  kind: 'finding';
  id: string;
  title: string;
  description?: string;
  type: string;
  confidence: number;
  severity: string;
  source: string;
  timestamp: string;
  entities: { id: string; name: string; type: string }[];
  /** Investigation findings are resolvable back into their workspace. */
  investigationId?: string;
  /** Canonical evidence ids backing an investigation finding. */
  evidenceIds?: string[];
}

export interface InspectorEvidenceView {
  kind: 'evidence';
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  datasetName?: string;
  confidence: number;
  extractionMethod: string;
  timestamp: string;
  /** Composition / navigation for the end-to-end journey. */
  investigationId?: string;
  evidenceType?: string;
  status?: string;
  observedAt?: string;
  isDemoData?: boolean;
  /** Linked entities (navigable in the inspector shell). */
  linkedEntities?: { id: string; name: string; type: string }[];
  /** Linked findings (navigable where present). */
  linkedFindings?: { id: string; title: string }[];
  /** Linked relationships (for network-mode contextual navigation). */
  linkedRelationships?: string[];
}

export interface InspectorNetworkView {
  kind: 'network';
  id: string;
  label: string;
  nodeLabel?: string;
  nodeType?: string;
  connections?: number;
}

export interface InspectorCaseView {
  kind: 'case';
  id: string;
  label: string;
}

// ------------------------------------------------------------
// Phase 8 analytics inspector views
// ------------------------------------------------------------

export interface InspectorCentralityView {
  kind: 'centrality';
  id: string;
  metric: string;
  definition: string;
  entityId: string;
  entityName: string;
  score: number;
  normalizedScore: number;
  rank: number;
}

export interface InspectorCommunityView {
  kind: 'community';
  id: string;
  label: string;
  size: number;
  internalEdgeCount: number;
  density: number;
  cohesion: number;
  representativeEntities: string[];
  bridgeEntityIds: string[];
}

export interface InspectorComponentView {
  kind: 'component';
  id: string;
  label: string;
  nodeCount: number;
  edgeCount: number;
  density: number;
  representativeNode: string;
}

export interface InspectorPatternView {
  kind: 'pattern';
  id: string;
  title: string;
  patternType: string;
  severity: string;
  confidence: number;
  description: string;
  entities: string[];
  period: { from: string; to: string };
}

// ------------------------------------------------------------
// Phase 9 — investigation workspace inspector views
// ------------------------------------------------------------

export interface InspectorInvestigationView {
  kind: 'investigation';
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  leadInvestigator: string;
  assigned: string[];
  entityCount: number;
  evidenceCount: number;
  relationshipCount: number;
  updatedAt: string;
}

export interface InspectorNoteView {
  kind: 'note';
  id: string;
  investigationId?: string;
  author: string;
  body: string;
  category: string | null;
}

export interface InspectorEventView {
  kind: 'event';
  id: string;
  investigationId?: string;
  title: string;
  occurredAt: string | null;
  eventType: string;
}

export interface InspectorAnalyticsSnapshotView {
  kind: 'analytics_snapshot';
  id: string;
  investigationId?: string;
  label: string;
  capturedAt: string | null;
  nodes: number;
  relationships: number;
  connectedComponents: number;
  communityCount: number;
  topConnectedEntity: string | null;
}

export type InspectorViewData =
  | InspectorEntityView
  | InspectorRelationshipView
  | InspectorDatasetView
  | InspectorFindingView
  | InspectorEvidenceView
  | InspectorNetworkView
  | InspectorCaseView
  | InspectorCentralityView
  | InspectorCommunityView
  | InspectorComponentView
  | InspectorPatternView
  | InspectorInvestigationView
  | InspectorNoteView
  | InspectorEventView
  | InspectorAnalyticsSnapshotView;

// ------------------------------------------------------------
// Lightweight static lookups (instant render for known ids)
// ------------------------------------------------------------

const datasetView = (ctx: DatasetContext): InspectorDatasetView | null => {
  const d = mockDatasetById.get(ctx.id);
  if (!d) return null;
  return mapDataset(d);
};

function mapDataset(d: Dataset): InspectorDatasetView {
  return {
    kind: 'dataset',
    id: d.id,
    name: d.name,
    description: d.description,
    format: d.format,
    category: d.category,
    status: d.status,
    recordCount: d.recordCount,
    fileSize: d.fileSize,
    qualityScore: d.qualityScore,
    qualityLevel: d.qualityLevel,
    warnings: d.warnings,
    errors: d.errors,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

const findingView = (ctx: FindingContext): InspectorFindingView | null => {
  const f = recentIntelligenceFindings.find((x) => x.id === ctx.id);
  if (f) return mapFinding(f);
  const p = suspiciousPatterns.find((x) => x.id === ctx.id);
  if (p) return mapPattern(p);
  // Investigation findings (inf-*) live on investigation records.
  for (const rec of mockInvestigationById.values()) {
    const invFinding = rec.findings.find((x) => x.id === ctx.id);
    if (invFinding) return mapInvestigationFinding(invFinding);
  }
  return null;
};

const mapFinding = (f: RecentIntelligence): InspectorFindingView => ({
  kind: 'finding',
  id: f.id,
  title: f.title,
  description: f.description,
  type: f.type,
  confidence: f.confidence,
  severity: f.severity,
  source: f.source ?? 'Intelligence engine',
  timestamp: f.timestamp,
  entities: f.entities,
});

const mapPattern = (p: SuspiciousPattern): InspectorFindingView => ({
  kind: 'finding',
  id: p.id,
  title: p.title,
  description: p.description,
  type: p.type,
  confidence: p.confidence,
  severity: p.severity,
  source: 'Pattern Engine',
  timestamp: p.timestamp,
  entities: p.entities,
});

const evidenceView = (ctx: EvidenceContext): InspectorEvidenceView | null => {
  // Phase 12 evidence-intelligence universe (ev-intel-*).
  const ev = mockEvidenceById.get(ctx.id);
  if (ev) return { ...mapEvidenceItem(ev), investigationId: ctx.investigationId };
  // Phase 6/7 legacy canonical evidence (ev-*).
  const e = mockEntityEvidence.find((x) => x.id === ctx.id);
  if (e) return { ...mapEvidence(e), investigationId: ctx.investigationId };
  return null;
};

/** Confidence-level → numeric confidence for investigation findings. */
const FINDING_CONFIDENCE: Record<string, number> = {
  low: 0.4,
  medium: 0.7,
  high: 0.9,
};

const mapInvestigationFinding = (
  invFinding: InvestigationFinding
): InspectorFindingView => {
  const confidence = FINDING_CONFIDENCE[invFinding.confidence] ?? 0.5;
  return {
    kind: 'finding',
    id: invFinding.id,
    title: invFinding.title,
    description: invFinding.description,
    type: invFinding.category,
    confidence,
    severity: invFinding.confidence,
    source: invFinding.source,
    timestamp: invFinding.created_at,
    investigationId: invFinding.investigation_id,
    evidenceIds: invFinding.evidence_ids,
    entities: invFinding.entity_ids.map((id) => {
      const profile = mockEntityProfileById.get(id);
      return {
        id,
        name: profile?.displayName ?? id,
        type: profile?.entityType ?? 'person',
      };
    }),
  };
};

const mapEvidenceItem = (e: EvidenceItem): InspectorEvidenceView => ({
  kind: 'evidence',
  id: e.id,
  title: e.title,
  summary: e.description,
  sourceName: e.sourceName,
  datasetName: e.datasetName,
  confidence: e.extractionConfidence,
  extractionMethod: e.extractionMethod,
  timestamp: e.observedAt || e.createdAt,
  investigationId: e.investigationId,
  evidenceType: e.evidenceType,
  status: e.status,
  observedAt: e.observedAt,
  isDemoData: e.isDemoData,
  linkedEntities: e.links
    .filter((l) => l.targetType === 'entity')
    .map((l) => {
      const profile = mockEntityProfileById.get(l.targetId);
      return {
        id: l.targetId,
        name: profile?.displayName ?? l.targetId,
        type: profile?.entityType ?? 'person',
      };
    }),
  linkedFindings: e.links
    .filter((l) => l.targetType === 'finding')
    .map((l) => {
      let title = l.targetId;
      for (const rec of mockInvestigationById.values()) {
        const found = rec.findings.find((f) => f.id === l.targetId);
        if (found) {
          title = found.title;
          break;
        }
      }
      return { id: l.targetId, title };
    }),
  linkedRelationships: e.links
    .filter((l) => l.targetType === 'relationship')
    .map((l) => l.targetId),
});

const mapEvidence = (e: EntityEvidenceItem): InspectorEvidenceView => ({
  kind: 'evidence',
  id: e.id,
  title: e.title,
  summary: e.summary,
  sourceName: e.sourceName,
  datasetName: e.datasetName,
  confidence: e.confidence,
  extractionMethod: e.extractionMethod,
  timestamp: e.timestamp,
});

const networkView = (ctx: NetworkContext): InspectorNetworkView => {
  const node = ctx.id.startsWith('n')
    ? dashboardNetwork.nodes.find((n) => n.id === ctx.id)
    : undefined;
  return {
    kind: 'network',
    id: ctx.id,
    label: ctx.label ?? (ctx.id.startsWith('net-') ? ctx.id.toUpperCase() : ctx.id),
    nodeLabel: ctx.nodeLabel ?? node?.label,
    nodeType: ctx.nodeType ?? node?.type,
    connections: ctx.connections ?? node?.connections,
  };
};

const caseView = (ctx: CaseContext): InspectorCaseView => ({
  kind: 'case',
  id: ctx.id,
  label: ctx.label ?? ctx.id.toUpperCase(),
});

function optimisticEntityView(ctx: EntityContext): InspectorEntityView {
  const p = mockEntityProfileById.get(ctx.id);
  return {
    kind: 'entity',
    id: ctx.id,
    name: p?.displayName ?? ctx.name ?? ctx.id,
    entityType: ctx.entityType ?? p?.entityType ?? 'person',
    resolutionState: p?.resolutionState ?? 'NEEDS_REVIEW',
    confidence: ctx.confidence ?? p?.confidence ?? 0,
    connections: ctx.connections ?? p?.connectionsCount ?? 0,
    evidence: p?.evidenceCount ?? 0,
    sources: ctx.sources?.length ?? p?.sourcesCount ?? 0,
    events: p?.eventsCount ?? 0,
    verified: p?.isVerified ?? false,
    flagged: p?.isFlagged ?? false,
    aliases: p?.aliases ?? [],
    description: p?.description,
    investigationId: ctx.investigationId,
  };
}

/** True when the context carries enough knowledge-graph data to render
 *  the inspector without a canonical Phase 6 profile. */
function hasGraphEntityHints(ctx: EntityContext): boolean {
  return (
    ctx.confidence !== undefined ||
    ctx.connections !== undefined ||
    (ctx.sources !== undefined && ctx.sources.length > 0)
  );
}

/** True when the context carries enough knowledge-graph data to render
 *  a relationship without a canonical Phase 6 relationship record. */
function hasGraphRelationshipHints(ctx: RelationshipContext): boolean {
  return (
    (ctx.sourceEntityName !== undefined && ctx.targetEntityName !== undefined) ||
    ctx.confidence !== undefined ||
    ctx.source !== undefined ||
    (ctx.evidence !== undefined && ctx.evidence.length > 0)
  );
}

// ------------------------------------------------------------
// Public resolver
// ------------------------------------------------------------

export type InspectorResolution =
  | { status: 'loading'; view: InspectorViewData | null }
  | { status: 'ready'; view: InspectorViewData }
  | { status: 'error'; message: string; view: InspectorViewData | null };

/** Resolve an inspector context to render-ready data.
 *  Static kinds resolve synchronously; entity/relationship go
 *  through the entity service (async). */
export async function resolveInspectorContext(
  ctx: InspectorContext
): Promise<InspectorResolution> {
  switch (ctx.type) {
    case 'entity': {
      const view = optimisticEntityView(ctx);
      try {
        const [entity, summary] = await Promise.all([
          fetchEntity(ctx.id),
          fetchEntityIntelligenceSummary(ctx.id),
        ]);
        return {
          status: 'ready',
          view: {
            ...view,
            name: entity.displayName,
            entityType: entity.entityType,
            resolutionState: entity.resolutionState,
            confidence: entity.confidence,
            connections: summary.connections,
            evidence: summary.evidence,
            sources: summary.sources,
            events: summary.events,
            verified: entity.isVerified,
            flagged: entity.isFlagged,
            aliases: entity.aliases,
            description: entity.description,
          },
        };
      } catch (err) {
        // Knowledge-graph fallback: render from graph-supplied hints
        // instead of erroring when no canonical profile exists.
        if (hasGraphEntityHints(ctx)) {
          return { status: 'ready', view };
        }
        return {
          status: 'error',
          message: err instanceof Error ? err.message : 'Could not load entity',
          view,
        };
      }
    }
    case 'relationship': {
      const optimistic: InspectorRelationshipView = {
        kind: 'relationship',
        id: ctx.id,
        type: ctx.relationshipType ?? 'CONNECTED_TO',
        sourceEntityName: ctx.sourceEntityName ?? 'Source',
        sourceEntityType: ctx.sourceEntityType ?? 'person',
        targetEntityName: ctx.targetEntityName ?? 'Target',
        targetEntityType: ctx.targetEntityType ?? 'person',
        confidence: ctx.confidence ?? 0,
        verificationStatus: ctx.verificationStatus ?? 'NEEDS_REVIEW',
        source: ctx.source ?? 'Intelligence graph',
        evidence: ctx.evidence ?? [],
        investigationId: ctx.investigationId,
      };
      try {
        if (
          hasGraphRelationshipHints(ctx) &&
          typeof ctx.sourceEntityName === 'string' &&
          typeof ctx.targetEntityName === 'string'
        ) {
          return { status: 'ready', view: optimistic };
        }
        const rel = await fetchRelationship(ctx.id);
        const mapped = mapRelationship(rel);
        try {
          const [intelligence, evidenceLinks] = await Promise.all([
            getRelationshipIntelligence(ctx.id),
            fetchRelationshipEvidenceLinks(ctx.id),
          ]);
          return {
            status: 'ready',
            view: {
              ...mapped,
              investigationId: ctx.investigationId,
              intelligence,
              evidenceLinks,
            },
          };
        } catch {
          return {
            status: 'ready',
            view: { ...mapped, investigationId: ctx.investigationId },
          };
        }
      } catch (err) {
        return {
          status: 'error',
          message: err instanceof Error ? err.message : 'Could not load relationship',
          view: optimistic,
        };
      }
    }
    case 'dataset': {
      const view = datasetView(ctx);
      if (!view) {
        return {
          status: 'error',
          message: 'Dataset not found',
          view: { kind: 'dataset', id: ctx.id, name: ctx.name ?? ctx.id, format: 'unknown', category: 'unknown', status: 'unknown', recordCount: 0, fileSize: 0, qualityScore: 0, qualityLevel: 'unknown', warnings: 0, errors: 0, createdAt: '', updatedAt: '' },
        };
      }
      return { status: 'ready', view };
    }
    case 'finding': {
      const view = findingView(ctx);
      if (!view) {
        return {
          status: 'error',
          message: 'Finding not found',
          view: { kind: 'finding', id: ctx.id, title: ctx.title ?? ctx.id, type: 'unknown', confidence: 0, severity: 'info', source: 'Intelligence engine', timestamp: '', entities: [] },
        };
      }
      return { status: 'ready', view };
    }
    case 'evidence': {
      const view = evidenceView(ctx);
      if (!view) {
        return {
          status: 'error',
          message: 'Evidence not found',
          view: { kind: 'evidence', id: ctx.id, title: ctx.title ?? ctx.id, summary: 'No details available', sourceName: 'Unknown', confidence: 0, extractionMethod: 'MANUAL', timestamp: '' },
        };
      }
      return { status: 'ready', view };
    }
    case 'network':
      return { status: 'ready', view: networkView(ctx) };
    case 'case':
      return { status: 'ready', view: caseView(ctx) };
    case 'centrality':
      return { status: 'ready', view: centralityView(ctx) };
    case 'community':
      return { status: 'ready', view: communityView(ctx) };
    case 'component':
      return { status: 'ready', view: componentView(ctx) };
    case 'pattern':
      return { status: 'ready', view: patternView(ctx) };
    case 'investigation':
      return { status: 'ready', view: investigationView(ctx) };
    case 'note':
      return { status: 'ready', view: noteView(ctx) };
    case 'event':
      return { status: 'ready', view: eventView(ctx) };
    case 'analytics_snapshot':
      return { status: 'ready', view: analyticsSnapshotView(ctx) };
    default:
      return {
        status: 'error',
        message: 'Unsupported context',
        view: null,
      };
  }
}

// ------------------------------------------------------------
// Phase 8 analytics view resolvers (enriched from the analytics
// store bundle when it is loaded, else from the context payload).
// ------------------------------------------------------------

function centralityView(ctx: CentralityContext): InspectorCentralityView {
  const bundle = useAnalyticsStore.getState().bundle;
  const set = bundle?.degree?.type === ctx.metric ? bundle.degree
    : bundle?.betweenness?.type === ctx.metric ? bundle.betweenness
      : bundle?.closeness?.type === ctx.metric ? bundle.closeness
        : bundle?.pagerank?.type === ctx.metric ? bundle.pagerank
          : null;
  const result = set?.results.find((r) => r.entityId === ctx.entityId);
  return {
    kind: 'centrality',
    id: ctx.id,
    metric: ctx.metric,
    definition: set?.definition ?? 'Structural importance of an entity within the observed network.',
    entityId: ctx.entityId,
    entityName: ctx.entityName ?? ctx.entityId,
    score: result?.score ?? ctx.score ?? 0,
    normalizedScore: result?.normalizedScore ?? 0,
    rank: result?.rank ?? ctx.rank ?? 0,
  };
}

function communityView(ctx: CommunityContext): InspectorCommunityView {
  const bundle = useAnalyticsStore.getState().bundle;
  const community = bundle?.communities.find((c) => c.id === ctx.id);
  return {
    kind: 'community',
    id: ctx.id,
    label: community?.label ?? ctx.label ?? ctx.id,
    size: community?.size ?? ctx.size ?? 0,
    internalEdgeCount: community?.internalEdgeCount ?? 0,
    density: community?.density ?? 0,
    cohesion: community?.cohesion ?? 0,
    representativeEntities: community?.representativeEntities ?? ctx.entityIds ?? [],
    bridgeEntityIds: community?.bridgeEntityIds ?? [],
  };
}

function componentView(ctx: ComponentContext): InspectorComponentView {
  const bundle = useAnalyticsStore.getState().bundle;
  const component = bundle?.components.find((c) => c.componentId === ctx.id);
  return {
    kind: 'component',
    id: ctx.id,
    label: component ? `Component ${ctx.id.replace('comp', '')}` : ctx.label ?? ctx.id,
    nodeCount: component?.nodeCount ?? ctx.nodeCount ?? 0,
    edgeCount: component?.edgeCount ?? 0,
    density: component?.density ?? 0,
    representativeNode: component?.representativeNode ?? ctx.entityIds?.[0] ?? '',
  };
}

function patternView(ctx: PatternContext): InspectorPatternView {
  const bundle = useAnalyticsStore.getState().bundle;
  const pattern = bundle?.patterns.find((p) => p.id === ctx.id);
  if (pattern && ctx.patternType) {
    return {
      kind: 'pattern',
      id: ctx.id,
      title: pattern.title,
      patternType: pattern.type,
      severity: pattern.severity,
      confidence: pattern.confidence,
      description: pattern.description,
      entities: pattern.affectedEntities,
      period: pattern.period,
    };
  }
  return {
    kind: 'pattern',
    id: ctx.id,
    title: ctx.title ?? ctx.id,
    patternType: ctx.patternType ?? 'unknown',
    severity: 'info',
    confidence: 0,
    description: 'Structural pattern detected in the observed network.',
    entities: ctx.entities ?? [],
    period: { from: '', to: '' },
  };
}

function mapRelationship(rel: EntityRelationship): InspectorRelationshipView {
  return {
    kind: 'relationship',
    id: rel.id,
    type: rel.type,
    sourceEntityName: rel.sourceEntityName,
    sourceEntityType: rel.sourceEntityType,
    targetEntityName: rel.targetEntityName,
    targetEntityType: rel.targetEntityType,
    confidence: rel.confidence,
    verificationStatus: rel.verificationStatus,
    source: rel.source,
    evidence: rel.evidence,
  };
}

// ------------------------------------------------------------
// Phase 9 investigation workspace view resolvers
// ------------------------------------------------------------

function investigationView(ctx: InvestigationContext): InspectorInvestigationView {
  const rec = mockInvestigationById.get(ctx.id);
  const inv = rec?.investigation;
  return {
    kind: 'investigation',
    id: ctx.id,
    title: inv?.title ?? ctx.label ?? ctx.id,
    description: inv?.description ?? null,
    status: inv?.status ?? ctx.status ?? 'draft',
    priority: inv?.priority ?? ctx.priority ?? 'normal',
    leadInvestigator: inv?.lead_investigator ?? 'Unassigned',
    assigned: inv?.assigned ?? [],
    entityCount: rec?.entities.length ?? 0,
    evidenceCount: rec?.evidence.length ?? 0,
    relationshipCount: rec?.relationships.length ?? 0,
    updatedAt: inv?.updated_at ?? '',
  };
}

function noteView(ctx: NoteContext): InspectorNoteView {
  const rec = ctx.investigationId ? mockInvestigationById.get(ctx.investigationId) : undefined;
  const note = rec?.notes.find((n) => n.id === ctx.id);
  return {
    kind: 'note',
    id: ctx.id,
    investigationId: ctx.investigationId,
    author: note?.author ?? ctx.author ?? 'Unknown',
    body: note?.body ?? ctx.body ?? '',
    category: note?.category ?? null,
  };
}

function eventView(ctx: EventContext): InspectorEventView {
  const rec = ctx.investigationId ? mockInvestigationById.get(ctx.investigationId) : undefined;
  const event = rec?.events.find((e) => e.id === ctx.id);
  return {
    kind: 'event',
    id: ctx.id,
    investigationId: ctx.investigationId,
    title: event?.title ?? ctx.title ?? ctx.id,
    occurredAt: event?.occurred_at ?? ctx.occurredAt ?? null,
    eventType: event?.event_type ?? ctx.eventType ?? 'other',
  };
}

function analyticsSnapshotView(
  ctx: AnalyticsSnapshotContext
): InspectorAnalyticsSnapshotView {
  const rec = ctx.investigationId ? mockInvestigationById.get(ctx.investigationId) : undefined;
  const snap = rec?.analyticsSnapshots.find((s) => s.id === ctx.id);
  return {
    kind: 'analytics_snapshot',
    id: ctx.id,
    investigationId: ctx.investigationId,
    label: snap?.label ?? ctx.label ?? ctx.id,
    capturedAt: snap?.captured_at ?? ctx.capturedAt ?? null,
    nodes: snap?.summary.nodes ?? 0,
    relationships: snap?.summary.relationships ?? 0,
    connectedComponents: snap?.summary.connectedComponents ?? 0,
    communityCount: snap?.summary.communityCount ?? 0,
    topConnectedEntity: snap?.summary.topConnectedEntity ?? null,
  };
}