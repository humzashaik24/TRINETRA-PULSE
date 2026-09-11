import type { ImportantEntity, ImportanceCategory } from '@trinetra-pulse/types';
import { NEXUS_ENTITIES, nexusNetwork, NEXUS_FINDINGS } from './nexus-dataset';

// ============================================================
// MOCK — IMPORTANT ENTITIES (Nexus-derived)
// ============================================================
// Derived deterministically from the Operation Trinetra Nexus
// dataset — no hardcoded figures. Rankings follow connectivity,
// structural role (bridge), pattern involvement and recency.
// ============================================================

const nodeByEntityId = new Map(nexusNetwork.nodes.map((n) => [n.entityId, n]));
const MAX_CONNECTIONS = Math.max(...NEXUS_ENTITIES.map((e) => e.connectionsCount));
const findingEntityIds = new Set(
  NEXUS_FINDINGS.flatMap((f) => (f.entities ?? []).map((ref) => ref.id))
);

function centralityLabel(value: number): string {
  if (value >= 0.85) return 'Very High';
  if (value >= 0.55) return 'High';
  return 'Moderate';
}

function categoryFor(
  idx: number,
  profile: (typeof NEXUS_ENTITIES)[number],
  involvedInPattern: boolean
): { category: ImportanceCategory; categoryLabel: string } {
  if ((profile.description ?? '').toLowerCase().includes('bridge')) {
    return { category: 'bridge_position', categoryLabel: 'Bridge Position' };
  }
  if (idx === 0) {
    return { category: 'high_connectivity', categoryLabel: 'High Connectivity' };
  }
  if (involvedInPattern || profile.isFlagged) {
    return { category: 'pattern_involvement', categoryLabel: 'Pattern Involvement' };
  }
  return { category: 'recent_activity', categoryLabel: 'Recent Activity' };
}

const LATEST_ACTIVITY = nexusNetwork.updatedAt ?? '2026-09-08T14:30:00Z';
const DAY = 86_400_000;

function activityFor(activityAt: string) {
  const ageMs = Math.max(0, new Date(LATEST_ACTIVITY).getTime() - new Date(activityAt).getTime());
  const days = ageMs / DAY;
  if (days <= 4) return { activityStatus: 'active' as const, activityLabel: 'Active now' };
  if (days <= 15) return { activityStatus: 'recent' as const, activityLabel: 'Active this week' };
  if (days <= 60) return { activityStatus: 'stale' as const, activityLabel: 'Stale' };
  return { activityStatus: 'inactive' as const, activityLabel: 'Inactive' };
}

export const importantEntities: ImportantEntity[] = (() => {
  const ranked = [...NEXUS_ENTITIES]
    .filter((e) => ['person', 'organization', 'account', 'location'].includes(e.entityType))
    .sort((a, b) => b.connectionsCount - a.connectionsCount)
    .slice(0, 8);

  return ranked.map((profile, idx) => {
    const involvedInPattern = NEXUS_FINDINGS.some((f) =>
      (f.entities ?? []).some((ref) => {
        const node = nodeByEntityId.get(ref.id);
        return node?.label === profile.name;
      })
    );
    const { category, categoryLabel } = categoryFor(idx, profile, involvedInPattern || findingEntityIds.has(profile.id));
    const node = nodeByEntityId.get(profile.id);
    const activity = activityFor(node?.activityAt ?? profile.updatedAt);
    return {
      id: profile.id,
      name: profile.name,
      type: profile.entityType,
      connections: profile.connectionsCount,
      centrality: profile.connectionsCount / MAX_CONNECTIONS,
      centralityLabel: centralityLabel(profile.connectionsCount / MAX_CONNECTIONS),
      category,
      categoryLabel,
      ...activity,
      riskScore: profile.confidence,
      isFlagged: profile.isFlagged,
    };
  });
})();