/**
 * PHASE C — PATTERN NORMALIZATION LAYER
 *
 * Deterministic adapter between the authoritative backend pattern engine
 * (``PatternDetectionResult``) and the Patterns workspace presentation
 * contract (``PatternArtifact``).
 *
 * API mode ------> normalizePatternDetection(...)  (real backend rows)
 * Mock mode -----> mockPatternsToArtifacts(...)    (preserved fixture output)
 *
 * Nothing here invents values: enrichment is resolved purely from the
 * investigation-scoped persisted rows passed in; metric rows are derived
 * only from real ``metadata`` values; ``timeAgo`` is computed from the real
 * ``detected_at``.
 */

import type {
  PatternArtifact,
  PatternDetectionResult,
  PatternEntityRef,
  PatternEvidenceRef,
  PatternRelationshipRef,
  SuspiciousPattern,
} from '@trinetra-pulse/types';
import { formatRelativeTime } from '@/lib/format';

// -------------------------------------------------------------------
// Deterministic metric derivation from the backend metadata
// -------------------------------------------------------------------
// Each detector stores its analytical inputs in ``metadata``. We surface
// those real values with stable labels; unknown keys are ordered
// deterministically (sorted) so output never varies between renders.

const METRIC_ORDER: Record<string, string> = {
  degree: 'Degree',
  normalized_degree: 'Normalized degree',
  average_degree: 'Average degree',
  neighbor_count: 'Neighbors',
  connected_groups: 'Connected groups',
  cycle_length: 'Cycle length',
  phone_count: 'Phones',
  shared_phone_ids: 'Shared phones',
  previous_relationship_count: 'Previous relationships',
  current_relationship_count: 'Current relationships',
};

function formatAmount(value: unknown): string | null {
  if (typeof value !== 'number') return null;
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
}

function formatRapidSwitching(value: unknown): string | null {
  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : null;
}

/** Derive deterministic presentation metrics from real backend ``metadata``.
 *  Keys the engine does not emit are simply absent. */
export function metadataToMetrics(
  metadata: Record<string, unknown>,
): Record<string, string> {
  const metrics: Record<string, string> = {};

  for (const key of Object.keys(METRIC_ORDER)) {
    const value = metadata[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      metrics[METRIC_ORDER[key]] = String(value.length);
      continue;
    }
    if (typeof value === 'boolean') {
      metrics[METRIC_ORDER[key]] = value ? 'Yes' : 'No';
      continue;
    }
    metrics[METRIC_ORDER[key]] = String(value);
  }

  if (typeof metadata.total_observed_amount === 'number') {
    metrics['Observed amount'] = formatAmount(metadata.total_observed_amount) ?? '';
  }
  const rapid = formatRapidSwitching(metadata.rapid_switching_supported);
  if (rapid !== null) {
    metrics['Rapid switching'] = rapid;
  }
  const window = metadata.window as { from?: string; to?: string } | undefined;
  if (window?.from && window?.to) {
    metrics['Window'] = `${window.from.slice(0, 10)} → ${window.to.slice(0, 10)}`;
  }

  return metrics;
}

/** Relative "time ago" label for a real timestamp (honest formatting of
 *  ``detected_at``; never fabricated). */
export function artifactTimeAgo(detectedAt: string, anchorMs?: number): string {
  return formatRelativeTime(detectedAt, anchorMs ?? Date.now());
}

// -------------------------------------------------------------------
// Lookup builders over investigation-scoped persisted rows
// -------------------------------------------------------------------

export interface PatternContextRows {
  entities: Array<{ id: string; name: string; entity_type?: string }>;
  evidence: Array<{ id: string; title?: string }>;
  relationships: Array<{
    id: string;
    source_entity_id?: string;
    target_entity_id?: string;
    relationship_type?: string;
  }>;
}

function buildLookups(rows: PatternContextRows, entityNames: Map<string, string>) {
  const byId = (items: Array<{ id: string }>) => {
    const map = new Map<string, { id: string }>();
    for (const item of items) map.set(item.id, item);
    return map;
  };

  const entityById = byId(rows.entities);
  const evidenceById = byId(rows.evidence);
  const relationshipById = byId(rows.relationships);

  const entityRefs = (ids: string[]): PatternEntityRef[] => {
    const out: PatternEntityRef[] = [];
    for (const id of ids) {
      const row = entityById.get(id) as { id: string; name?: string; entity_type?: string } | undefined;
      out.push({
        id,
        name: row?.name ?? entityNames.get(id) ?? id,
        type: row?.entity_type ?? 'person',
      });
    }
    return out;
  };

  const evidenceRefs = (ids: string[]): PatternEvidenceRef[] => {
    const out: PatternEvidenceRef[] = [];
    for (const id of ids) {
      const row = evidenceById.get(id) as { id: string; title?: string } | undefined;
      out.push({ id, title: row?.title ?? id });
    }
    return out;
  };

  const relationshipRefs = (ids: string[]): PatternRelationshipRef[] => {
    const out: PatternRelationshipRef[] = [];
    for (const id of ids) {
      const row = relationshipById.get(id) as
        | {
            id: string;
            source_entity_id?: string;
            target_entity_id?: string;
            relationship_type?: string;
          }
        | undefined;
      if (!row) {
        out.push({ id });
        continue;
      }
      out.push({
        id,
        sourceName: row.source_entity_id ? entityNames.get(row.source_entity_id) : undefined,
        targetName: row.target_entity_id ? entityNames.get(row.target_entity_id) : undefined,
        type: row.relationship_type,
      });
    }
    return out;
  };

  return { entityRefs, evidenceRefs, relationshipRefs };
}

// -------------------------------------------------------------------
// API mode — backend detection → artifacts
// -------------------------------------------------------------------

/** Map one backend ``PatternDetectionResult`` into the workspace contract.
 *  Purely deterministic: same inputs always produce the same artifact. */
export function patternArtifactFromDetection(
  pattern: PatternDetectionResult,
  rows: PatternContextRows,
  anchorMs?: number,
): PatternArtifact {
  const entityNames = new Map<string, string>();
  for (const entity of rows.entities) entityNames.set(entity.id, entity.name);
  const { entityRefs, evidenceRefs, relationshipRefs } = buildLookups(rows, entityNames);

  return {
    ...pattern,
    typeLabel: pattern.pattern_type,
    metrics: metadataToMetrics(pattern.metadata),
    timeAgo: artifactTimeAgo(pattern.detected_at, anchorMs),
    entityRefs: entityRefs(pattern.entity_ids),
    evidenceRefs: evidenceRefs(pattern.evidence_ids),
    relationshipRefs: relationshipRefs(pattern.relationship_ids),
  };
}

/** Normalize a full backend patterns response into deterministic artifacts,
 *  enriched from the investigation's persisted rows. */
export function normalizePatternDetection(
  response: { investigation_id: string; patterns: PatternDetectionResult[] },
  rows: PatternContextRows,
  anchorMs?: number,
): PatternArtifact[] {
  return response.patterns.map((pattern) => patternArtifactFromDetection(pattern, rows, anchorMs));
}

// -------------------------------------------------------------------
// Mock mode — preserved fixture output
// -------------------------------------------------------------------
// The in-memory demo carries its own ``SuspiciousPattern`` contract. The
// adapter below maps it onto the same artifact shape so the workspace renders
// the familiar demo output verbatim (fixture typeLabel / status / metrics /
// timeAgo carried over, never recomputed or invented).

function mockEntityRefs(pattern: SuspiciousPattern): PatternEntityRef[] {
  return pattern.entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    type: entity.type,
  }));
}

/** Map the legacy demo fixtures onto the unified artifact contract. */
export function mockPatternsToArtifacts(patternList: SuspiciousPattern[]): PatternArtifact[] {
  return patternList.map((pattern) => ({
    id: pattern.id,
    investigation_id: 'inv-demo-nexus',
    // Mock fixtures use the in-memory demo vocabulary; the cast is scoped to
    // this mock-only adapter (mock rows are never shipped to the backend).
    pattern_type: pattern.type as unknown as PatternDetectionResult['pattern_type'],
    severity: pattern.severity as unknown as PatternDetectionResult['severity'],
    confidence: pattern.confidence,
    title: pattern.title,
    description: pattern.description,
    entity_ids: pattern.entities.map((entity) => entity.id),
    relationship_ids: [],
    evidence_ids: [],
    event_ids: [],
    metadata: {},
    detected_at: pattern.timestamp,
    typeLabel: pattern.typeLabel,
    status: pattern.status,
    metrics: pattern.metrics,
    timeAgo: pattern.timeAgo,
    entityRefs: mockEntityRefs(pattern),
    evidenceRefs: [],
    relationshipRefs: [],
  }));
}