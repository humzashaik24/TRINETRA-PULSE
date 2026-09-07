import type {
  GraphNode,
  GraphEdge,
  StructuralPattern,
  TemporalAnalyticsResult,
  NetworkComponent,
  InfluenceResult,
} from '@trinetra-pulse/types';
import { computeBetweenness } from './centrality';

// ============================================================
// STRUCTURAL PATTERN DETECTION
// ============================================================
// Detects reproducible structural signals from the temporal
// snapshot sequence and static connectivity. A pattern's
// `severity` is ANALYTICAL significance, never a probability of
// guilt. Confidence = confidence the pattern was detected.
// ============================================================

export interface PatternContext {
  temporal: TemporalAnalyticsResult | null;
  components: NetworkComponent[];
  influence: InfluenceResult[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

let counter = 0;
function nextId(prefix: string): string {
  counter++;
  return `${prefix}-${String(counter).padStart(3, '0')}`;
}

export function detectStructuralPatterns(ctx: PatternContext): StructuralPattern[] {
  // Reset so ids are stable/deterministic per invocation.
  counter = 0;
  const patterns: StructuralPattern[] = [];
  const snapshots = ctx.temporal?.snapshots ?? [];

  if (snapshots.length >= 2) {
    const growth = detectRapidConnectionGrowth(snapshots);
    if (growth) patterns.push(growth);
    const merging = detectCommunityMerging(snapshots);
    if (merging) patterns.push(merging);
    const splitting = detectCommunitySplitting(snapshots);
    if (splitting) patterns.push(splitting);
    const degreeJumps = detectSuddenDegreeIncrease(snapshots);
    patterns.push(...degreeJumps.slice(0, 3));
    const isolated = detectNewIsolatedComponents(snapshots, ctx.components);
    patterns.push(...isolated.slice(0, 2));
  }

  const concentration = detectRelationshipConcentration(ctx.nodes, ctx.edges, ctx.influence);
  if (concentration) patterns.push(concentration);

  // Sort by descending confidence, stable.
  patterns.sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id));

  if (patterns.length === 0) {
    patterns.push(unavailablePattern());
  }
  return patterns;
}

function detectRapidConnectionGrowth(
  snapshots: TemporalAnalyticsResult['snapshots']
): StructuralPattern | null {
  const earliest = snapshots[0];
  const latest = snapshots[snapshots.length - 1];
  const newRel = latest.newRelationships;
  const newNodes = latest.newNodes;
  if (newRel >= 3 && newNodes >= 2) {
    return {
      id: nextId('pat'),
      type: 'rapid_connection_growth',
      title: 'Rapid connection growth',
      description: `${latest.label} saw ${newRel} new observed relationships and ${newNodes} new entities, a sharp rise against earlier periods.`,
      confidence: 0.9,
      severity: 'high',
      affectedEntities: latest.topEntities,
      affectedRelationships: [],
      detectedAt: latest.period.split('|')[1] || latest.label,
      evidenceReferences: [],
      period: { from: earliest.label, to: latest.label },
      sources: [],
    };
  }
  return null;
}

function detectCommunityMerging(
  snapshots: TemporalAnalyticsResult['snapshots']
): StructuralPattern | null {
  for (let i = 1; i < snapshots.length; i++) {
    if (snapshots[i].communityCount < snapshots[i - 1].communityCount) {
      return {
        id: nextId('pat'),
        type: 'community_merging',
        title: 'Communities merging',
        description: `Connected groups fell from ${snapshots[i - 1].communityCount} to ${snapshots[i].communityCount} between ${snapshots[i - 1].label} and ${snapshots[i].label}, suggesting groups drew together.`,
        confidence: 0.8,
        severity: 'medium',
        affectedEntities: snapshots[i].topEntities,
        affectedRelationships: [],
        detectedAt: snapshots[i].period.split('|')[1] || snapshots[i].label,
        evidenceReferences: [],
        period: { from: snapshots[i - 1].label, to: snapshots[i].label },
        sources: [],
      };
    }
  }
  return null;
}

function detectCommunitySplitting(
  snapshots: TemporalAnalyticsResult['snapshots']
): StructuralPattern | null {
  for (let i = 1; i < snapshots.length; i++) {
    if (snapshots[i].communityCount > snapshots[i - 1].communityCount) {
      return {
        id: nextId('pat'),
        type: 'community_splitting',
        title: 'Connected group splitting',
        description: `Connected groups rose from ${snapshots[i - 1].communityCount} to ${snapshots[i].communityCount} between ${snapshots[i - 1].label} and ${snapshots[i].label}, indicating fragmentation.`,
        confidence: 0.75,
        severity: 'medium',
        affectedEntities: snapshots[i].topEntities,
        affectedRelationships: [],
        detectedAt: snapshots[i].period.split('|')[1] || snapshots[i].label,
        evidenceReferences: [],
        period: { from: snapshots[i - 1].label, to: snapshots[i].label },
        sources: [],
      };
    }
  }
  return null;
}

function detectSuddenDegreeIncrease(
  snapshots: TemporalAnalyticsResult['snapshots']
): StructuralPattern[] {
  const out: StructuralPattern[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    for (const [entityId, delta] of Object.entries(snapshots[i].centralityChange)) {
      const d = delta.degree ?? 0;
      if (d >= 0.3) {
        out.push({
          id: nextId('pat'),
          type: 'sudden_degree_increase',
          title: 'Sudden connectivity increase',
          description: `${entityId} showed a large jump in direct connectivity (${(d * 100).toFixed(0)}%) between ${snapshots[i - 1].label} and ${snapshots[i].label}.`,
          confidence: 0.85,
          severity: 'high',
          affectedEntities: [entityId],
          affectedRelationships: [],
          detectedAt: snapshots[i].period.split('|')[1] || snapshots[i].label,
          evidenceReferences: [],
          period: { from: snapshots[i - 1].label, to: snapshots[i].label },
          sources: [],
        });
      }
    }
  }
  return out;
}

function detectNewIsolatedComponents(
  snapshots: TemporalAnalyticsResult['snapshots'],
  components: NetworkComponent[]
): StructuralPattern[] {
  const out: StructuralPattern[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].relationshipCount;
    const cur = snapshots[i].relationshipCount;
    const isolatedNow = components.filter(
      (c) => c.nodeCount === 1 || (c.nodeCount > 1 && c.density < 0.25)
    );
    if (cur > prev && isolatedNow.length > 0 && snapshots[i].newRelationships > 0) {
      out.push({
        id: nextId('pat'),
        type: 'new_isolated_component',
        title: 'New separated component',
        description: `${isolatedNow.length} sparsely-connected component(s) are present by ${snapshots[i].label}, with ${snapshots[i].newRelationships} new relationships observed.`,
        confidence: 0.7,
        severity: 'info',
        affectedEntities: isolatedNow.slice(0, 3).flatMap((c) => c.nodeIds.slice(0, 1)),
        affectedRelationships: [],
        detectedAt: snapshots[i].period.split('|')[1] || snapshots[i].label,
        evidenceReferences: [],
        period: { from: snapshots[i - 1].label, to: snapshots[i].label },
        sources: [],
      });
      break;
    }
  }
  return out;
}

function detectRelationshipConcentration(
  nodes: GraphNode[],
  edges: GraphEdge[],
  influence: InfluenceResult[]
): StructuralPattern | null {
  const meta = { algorithm: 'betweenness', version: '1.0.0', computedAt: '', scope: '', relationshipTypes: [], timeRange: { from: null, to: null } };
  const betweenness = computeBetweenness(nodes, edges, meta);
  const scores = betweenness.results.map((r) => r.score).sort((a, b) => b - a);
  if (scores.length < 5) return null;
  const total = scores.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const top3 = scores.slice(0, 3).reduce((a, b) => a + b, 0);
  const concentration = top3 / total;
  if (concentration >= 0.55) {
    const latestTimestamp = edges
      .map((e) => e.timestamp)
      .filter((t): t is string => Boolean(t))
      .sort()
      .reverse()[0];
    return {
      id: nextId('pat'),
      type: 'relationship_concentration',
      title: 'Relationship concentration',
      description: `${(concentration * 100).toFixed(0)}% of all-pairs shortest-path traffic in the observed network routes through just three entities — a strong connector signal.`,
      confidence: 0.8,
      severity: 'high',
      affectedEntities: influence.slice(0, 3).map((e) => e.entityId),
      affectedRelationships: [],
      detectedAt: latestTimestamp ?? '',
      evidenceReferences: [],
      period: { from: '', to: '' },
      sources: [],
    };
  }
  return null;
}

function unavailablePattern(): StructuralPattern {
  return {
    id: 'pat-unavailable',
    type: 'pattern_unavailable',
    title: 'Insufficient data for pattern detection',
    description: 'Not enough temporal or structural variation was observed to surface reproducible patterns.',
    confidence: 0.5,
    severity: 'info',
    affectedEntities: [],
    affectedRelationships: [],
    detectedAt: '',
    evidenceReferences: [],
    period: { from: '', to: '' },
    sources: [],
  };
}
