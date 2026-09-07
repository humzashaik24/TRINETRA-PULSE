import type {
  NetworkAnalytics,
  CentralityType,
} from '@trinetra-pulse/types';
import type { AnalyticsOverlay } from '@/state/analytics.store';

// ============================================================
// GRAPH ANALYTICS OVERLAY
// ============================================================
// Maps the active analytics overlay + bundle onto per-node visual
// overrides consumed by the graph renderer. Pure + deterministic:
// the same bundle always yields the same override map. Visual
// emphasis is structural, never accusatory.
// ============================================================

export interface AnalyticsNodeVisual {
  sizeScale: number;
  tint?: string;
  accent: boolean;
  dim: boolean;
}

const HUE_PALETTE = [210, 160, 30, 285, 340, 100, 12, 195, 60, 250, 320, 140, 0, 220];

function hueForIndex(i: number): string {
  const h = HUE_PALETTE[i % HUE_PALETTE.length];
  return `hsl(${h}, 70%, 55%)`;
}

function sizeScaleFor(score: number): number {
  return 1 + score * 1.8;
}

function centralityScores(
  bundle: NetworkAnalytics,
  type: CentralityType
): Map<string, number> {
  const set =
    type === 'degree' ? bundle.degree
      : type === 'betweenness' ? bundle.betweenness
        : type === 'closeness' ? bundle.closeness
          : bundle.pagerank;
  const map = new Map<string, number>();
  if (set) {
    for (const r of set.results) map.set(r.entityId, r.normalizedScore);
  }
  return map;
}

export function computeNodeOverlays(
  bundle: NetworkAnalytics | null,
  overlay: AnalyticsOverlay
): Map<string, AnalyticsNodeVisual> {
  const out = new Map<string, AnalyticsNodeVisual>();
  if (!bundle) return out;
  const allEntities = new Set<string>();
  for (const c of bundle.communities) c.representativeEntities.forEach((e) => allEntities.add(e));
  for (const e of bundle.influence ?? []) allEntities.add(e.entityId);
  if (allEntities.size === 0) return out;

  switch (overlay) {
    case 'degree':
    case 'betweenness':
    case 'closeness':
    case 'pagerank': {
      const scores = centralityScores(bundle, overlay);
      const max = scores.size ? Math.max(...scores.values(), 0.000001) : 1;
      for (const entityId of allEntities) {
        const s = scores.get(entityId) ?? 0;
        const rel = max > 0 ? s / max : 0;
        out.set(entityId, {
          sizeScale: sizeScaleFor(rel),
          tint: `hsl(210, 80%, 55%)`,
          accent: rel >= 0.75,
          dim: rel < 0.15,
        });
      }
      break;
    }
    case 'influence': {
      const max = bundle.influence?.length ? Math.max(...bundle.influence.map((i) => i.importance), 1) : 1;
      for (const i of bundle.influence ?? []) {
        const rel = max > 0 ? i.importance / max : 0;
        out.set(i.entityId, {
          sizeScale: sizeScaleFor(rel),
          tint: `hsl(160, 70%, 50%)`,
          accent: rel >= 0.7,
          dim: rel < 0.2,
        });
      }
      break;
    }
    case 'community': {
      const sorted = [...bundle.communities].sort((a, b) => b.size - a.size);
      sorted.forEach((c, i) => {
        const hue = hueForIndex(i);
        for (const entityId of c.representativeEntities) {
          out.set(entityId, {
            sizeScale: 1,
            tint: hue,
            accent: false,
            dim: false,
          });
        }
      });
      break;
    }
    case 'component': {
      const sorted = [...bundle.components].sort((a, b) => b.nodeCount - a.nodeCount);
      sorted.forEach((c, i) => {
        const hue = hueForIndex(i);
        for (const entityId of c.representativeNode ? [c.representativeNode] : []) {
          out.set(entityId, {
            sizeScale: 1,
            tint: hue,
            accent: false,
            dim: false,
          });
        }
      });
      break;
    }
    case 'bridge': {
      const bridgeSet = new Set(bundle.bridges.map((b) => b.entityId));
      for (const entityId of allEntities) {
        out.set(entityId, {
          sizeScale: bridgeSet.has(entityId) ? 1.35 : 0.85,
          tint: bridgeSet.has(entityId) ? `hsl(12, 85%, 55%)` : undefined,
          accent: bridgeSet.has(entityId),
          dim: !bridgeSet.has(entityId),
        });
      }
      break;
    }
    case 'none':
    default:
      return out;
  }
  return out;
}
