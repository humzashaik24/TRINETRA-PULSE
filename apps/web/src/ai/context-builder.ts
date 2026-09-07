import type {
  AIContext,
  AIContextScope,
  AIContextSource,
  AISourceReference,
  AISourceType,
  EvidenceIntegrityContextPayload,
} from '@trinetra-pulse/types';

// ============================================================
// PHASE 10 — CONTEXT BUILDER + BUDGET
// ============================================================
// Builds a bounded, prioritized AI context model from the current
// workspace scope. Only retrieves what is relevant to the current
// question/selection — it NEVER dumps the whole database into the
// prompt. Truncation is DETERMINISTIC and never silently discards
// an important reference: when the budget is exceeded a `truncated`
// flag and note are set so the response can state it is based on
// the currently available context.
// ============================================================

export const CONTEXT_BUDGETS = {
  /** Max relationship summaries included. */
  relationships: 12,
  /** Max evidence summaries included. */
  evidence: 10,
  /** Max finding summaries included. */
  findings: 8,
  /** Max timeline items included. */
  timeline: 12,
  /** Max bytes for each summary string (data minimization). */
  summaryChars: 420,
};

// ------------------------------------------------------------
// Source reference factories (always reference canonical ids)
// ------------------------------------------------------------

function ref(type: AISourceType, sourceId: string, label: string, relevance: number): AISourceReference {
  return { id: `${type}:${sourceId}`, sourceType: type, sourceId, label, relevance };
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

export type ContextSourceBundle = {
  investigation?: { id: string; title: string; status: string; priority: string; description: string | null; entityCount: number; relationshipCount: number; evidenceCount: number } | null;
  entity?: { id: string; name: string; entityType: string; description?: string; resolutionState: string; confidence: number; connectionsCount: number } | null;
  relationships?: { id: string; sourceName: string; targetName: string; type: string; confidence: number; sourceEntityId: string; targetEntityId: string; intelligence?: { status: string; confidenceLabel: string; sourceCount: number; correlationKey: string } }[];
  network?: { id: string; name: string; nodeCount: number; relationshipCount: number; clusterCount: number } | null;
  analytics?: { nodes: number; relationships: number; communityCount: number; connectedComponents: number; topConnectedEntity: string | null; averageDegree: number; density: number; bridgeEntityCount: number } | null;
  evidence?: { id: string; title: string; summary: string; evidenceType: string; integrity?: EvidenceIntegrityContextPayload | null }[];
  findings?: { id: string; title: string; description: string; category: string; confidence: string }[];
  timeline?: { id: string; timestamp: string; title: string; description: string | null; category: string }[];
};

export interface BuildContextOptions {
  /** Optional override to merge over the scope. */
  bundle?: ContextSourceBundle;
}

export function buildInvestigationContext(
  scope: AIContextScope,
  opts: BuildContextOptions = {}
): AIContext {
  const bundle = opts.bundle;
  const sources: AIContextSource[] = [];
  let truncated = false;
  const notes: string[] = [];

  // Priority 1: current user selection (entity)
  if (bundle?.entity) {
    sources.push({
      type: 'Entity',
      sourceId: bundle.entity.id,
      label: bundle.entity.name,
      summary: summarize(bundle.entity.name, [
        `Type: ${bundle.entity.entityType}`,
        `Resolution: ${bundle.entity.resolutionState} (confidence ${fmtPct(bundle.entity.confidence)})`,
        `Connections: ${bundle.entity.connectionsCount}`,
        bundle.entity.description ? `Description: ${bundle.entity.description}` : null,
      ]),
      references: [ref('Entity', bundle.entity.id, bundle.entity.name, 1)],
    });
  }

  // Priority 2: current investigation
  if (bundle?.investigation) {
    sources.push({
      type: 'Investigation',
      sourceId: bundle.investigation.id,
      label: bundle.investigation.title,
      summary: summarize(bundle.investigation.title, [
        `Status: ${bundle.investigation.status.replace(/_/g, ' ')}`,
        `Priority: ${bundle.investigation.priority}`,
        `Entities: ${bundle.investigation.entityCount} · Relationships: ${bundle.investigation.relationshipCount} · Evidence: ${bundle.investigation.evidenceCount}`,
        bundle.investigation.description ? `Description: ${bundle.investigation.description}` : null,
      ]),
      references: [ref('Investigation', bundle.investigation.id, bundle.investigation.title, 0.95)],
    });
  }

  // Priority 3: relevant evidence (bounded)
  const evidence = limit(bundle?.evidence ?? [], CONTEXT_BUDGETS.evidence);
  if (evidence.length < (bundle?.evidence?.length ?? 0)) truncated = true;
  evidence.forEach((e, i) => {
    const integrityLine = e.integrity
      ? `Integrity: ${e.integrity.verificationState.replace(/_/g, ' ').toLowerCase()}${e.integrity.isMock ? ' (mock registry)' : ''}`
      : null;
    sources.push({
      type: 'Evidence',
      sourceId: e.id,
      label: e.title,
      summary: summarize(e.title, [
        `Type: ${e.evidenceType}`,
        e.summary ? `Summary: ${e.summary}` : null,
        integrityLine,
      ]),
      references: [
        ref('Evidence', e.id, e.title, 0.6 - i * 0.02),
        ...(e.integrity
          ? [
              {
                id: `evidence-integrity:${e.id}`,
                sourceType: 'Evidence' as const,
                sourceId: e.id,
                label: `${e.title} anchor state`,
                relevance: 0.6 - i * 0.02,
                payload: {
                  verificationState: e.integrity.verificationState,
                  isMock: e.integrity.isMock,
                  network: e.integrity.network ?? '',
                  anchorDigest: e.integrity.anchorDigest ?? '',
                  custodyChainHash: e.integrity.custodyChainHash ?? '',
                  checksumPrefixed: e.integrity.checksumPrefixed ?? '',
                },
              },
            ]
          : []),
      ],
    });
  });

  // Priority 4: relevant relationships (bounded)
  const relationships = limit(bundle?.relationships ?? [], CONTEXT_BUDGETS.relationships);
  if (relationships.length < (bundle?.relationships?.length ?? 0)) truncated = true;
  relationships.forEach((r, i) => {
    const intel = r.intelligence;
    const correlationLine =
      intel && intel.sourceCount >= 2
        ? `Corroborated: ${intel.sourceCount} independent sources (${intel.confidenceLabel})`
        : intel
          ? `Single-source (${intel.confidenceLabel}) — pending corroboration`
          : null;
    sources.push({
      type: 'Relationship',
      sourceId: r.id,
      label: `${r.sourceName} — ${r.type} — ${r.targetName}`,
      summary: summarize(`${r.sourceName} ${r.type} ${r.targetName}`, [
        `Confidence: ${fmtPct(r.confidence)}`,
        correlationLine,
      ]),
      references: [
        ref('Relationship', r.id, `${r.sourceName} — ${r.type} — ${r.targetName}`, 0.5 - i * 0.02),
        ...(intel
          ? [
              {
                id: `${intel.correlationKey || 'relationship-intelligence'}:${r.id}`,
                sourceType: 'Relationship' as const,
                sourceId: r.id,
                label: `${r.sourceName} — ${r.targetName} correlation`,
                relevance: 0.5 - i * 0.02,
                payload: {
                  sourceCount: intel.sourceCount,
                  confidenceLabel: intel.confidenceLabel,
                  status: intel.status,
                },
              },
            ]
          : []),
      ],
    });
  });

  // Priority 5: analytics
  if (bundle?.analytics) {
    sources.push({
      type: 'Analytics',
      sourceId: bundle.network?.id ?? 'network',
      label: 'Network analytics',
      summary: summarize('Network analytics', [
        `Nodes: ${bundle.analytics.nodes}`,
        `Relationships: ${bundle.analytics.relationships}`,
        `Communities: ${bundle.analytics.communityCount}`,
        `Components: ${bundle.analytics.connectedComponents}`,
        bundle.analytics.topConnectedEntity ? `Top connected: ${bundle.analytics.topConnectedEntity}` : null,
        `Average degree: ${bundle.analytics.averageDegree}`,
        `Density: ${bundle.analytics.density}`,
        bundle.analytics.bridgeEntityCount ? `Bridge entities: ${bundle.analytics.bridgeEntityCount}` : null,
      ]),
      references: [ref('Analytics', bundle.network?.id ?? 'network', 'Analytics', 0.7)],
    });
  }

  // Priority 6: timeline (bounded)
  const timeline = limit(bundle?.timeline ?? [], CONTEXT_BUDGETS.timeline);
  if (timeline.length < (bundle?.timeline?.length ?? 0)) truncated = true;
  timeline.forEach((t, i) => {
    sources.push({
      type: 'Timeline',
      sourceId: t.id,
      label: t.title,
      summary: summarize(t.title, [
        `Timestamp: ${fmtDate(t.timestamp)}`,
        `Category: ${t.category}`,
        t.description ? `Description: ${t.description}` : null,
      ]),
      references: [ref('Timeline', t.id, t.title, 0.4 - i * 0.01)],
    });
  });

  // Priority 7: broader network info
  if (bundle?.network) {
    sources.push({
      type: 'Network',
      sourceId: bundle.network.id,
      label: bundle.network.name,
      summary: summarize(bundle.network.name, [
        `Nodes: ${bundle.network.nodeCount}`,
        `Relationships: ${bundle.network.relationshipCount}`,
        `Communities: ${bundle.network.clusterCount}`,
      ]),
      references: [ref('Network', bundle.network.id, bundle.network.name, 0.3)],
    });
  }

  if (bundle?.findings && bundle.findings.length > 0) {
    const findings = limit(bundle.findings, CONTEXT_BUDGETS.findings);
    if (findings.length < bundle.findings.length) truncated = true;
    findings.forEach((f, i) => {
      sources.push({
        type: 'Finding',
        sourceId: f.id,
        label: f.title,
        summary: summarize(f.title, [
          `Category: ${f.category} · Confidence: ${f.confidence}`,
          f.description ? `Description: ${f.description}` : null,
        ]),
        references: [ref('Finding', f.id, f.title, 0.55 - i * 0.02)],
      });
    });
  }

  if (truncated) notes.push('Response based on the currently available context.');

  return {
    scope,
    entity: sources.find((s) => s.type === 'Entity') ?? null,
    investigation: sources.find((s) => s.type === 'Investigation') ?? null,
    relationships: sources.filter((s) => s.type === 'Relationship'),
    network: sources.find((s) => s.type === 'Network') ?? null,
    analytics: sources.find((s) => s.type === 'Analytics') ?? null,
    evidence: sources.filter((s) => s.type === 'Evidence'),
    findings: sources.filter((s) => s.type === 'Finding'),
    timeline: sources.find((s) => s.type === 'Timeline') ?? null,
    truncated,
    note: notes.length ? notes.join(' ') : undefined,
  };
}

// ------------------------------------------------------------
// Budget helpers
// ------------------------------------------------------------

/** Deterministically keep the first N highest-priority items. */
export function limit<T>(items: T[], max: number): T[] {
  return items.slice(0, max);
}

function summarize(label: string, parts: (string | null)[]): string {
  const body = parts.filter((p): p is string => Boolean(p)).join('\n');
  const text = `${label}\n${body}`;
  if (text.length <= CONTEXT_BUDGETS.summaryChars) return text;
  return `${text.slice(0, CONTEXT_BUDGETS.summaryChars)}…`;
}

function fmtPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}
