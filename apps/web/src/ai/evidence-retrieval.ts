import type {
  AIContextSource,
  AISourceReference,
  AIContextScope,
  EvidenceItem,
  EvidenceSource,
} from '@trinetra-pulse/types';
import * as evidenceService from '@/services/evidence.service';
import type { ContextSourceBundle } from './context-builder';

// ============================================================
// PHASE 12 — EVIDENCE RETRIEVAL (Grounded AI)
// ============================================================
// Pipeline from user query → evidence retrieval → context builder.
// Deterministic ranking in mock mode. Bounded by retrieval budget.
// Every evidence-grounded response exposes clickable sources.
// ============================================================

const DEFAULT_BUDGET = {
  maxEvidenceItems: 10,
  maxSnippetLength: 200,
  maxLinkedEntities: 6,
  maxLinkedFindings: 3,
};

const LATENCY = 120;

const delay = (ms: number = LATENCY) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

// ------------------------------------------------------------
// Snippet truncation
// ------------------------------------------------------------

function truncateSnippet(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// ------------------------------------------------------------
// Relevance scoring (deterministic in mock mode)
// ------------------------------------------------------------

function scoreEvidenceRelevance(evidence: EvidenceSource, query: string): number {
  const q = query.toLowerCase();
  const titleMatch = evidence.title.toLowerCase().includes(q) ? 0.3 : 0;
  const typeMatch = evidence.evidenceType.toLowerCase().includes(q) ? 0.2 : 0;
  const sourceMatch = evidence.sourceName.toLowerCase().includes(q) ? 0.1 : 0;
  const snippetMatch = evidence.snippet?.text.toLowerCase().includes(q) ? 0.2 : 0;
  const statusBoost = evidence.status === 'VERIFIED' ? 0.1 : evidence.status === 'AVAILABLE' ? 0.05 : 0;
  return Math.min(1, titleMatch + typeMatch + sourceMatch + snippetMatch + statusBoost + 0.1);
}

// ------------------------------------------------------------
// Evidence → context source conversion
// ------------------------------------------------------------

function evidenceToContextSource(
  item: EvidenceItem,
  relevance: number
): AIContextSource {
  const snippet = item.snippet
    ? truncateSnippet(item.snippet.text, DEFAULT_BUDGET.maxSnippetLength)
    : item.description.slice(0, DEFAULT_BUDGET.maxSnippetLength);

  return {
    type: 'Evidence',
    sourceId: item.id,
    label: item.title,
    summary: snippet,
    references: [
      {
        id: `Evidence:${item.id}`,
        sourceType: 'Evidence',
        sourceId: item.id,
        label: item.title,
        relevance,
        payload: {
          evidenceType: item.evidenceType,
          status: item.status,
          sourceName: item.sourceName,
          extractionConfidence: item.extractionConfidence,
          isDemoData: item.isDemoData,
        },
      },
      ...item.links
        .filter((l) => l.targetType === 'entity')
        .slice(0, 3)
        .map((l): AISourceReference => ({
          id: `Entity:${l.targetId}`,
          sourceType: 'Entity',
          sourceId: l.targetId,
          label: l.targetId,
          relevance: l.confidence,
        })),
    ],
  };
}

// ------------------------------------------------------------
// Evidence bundle from service
// ------------------------------------------------------------

async function retrieveEvidenceBundle(params: {
  query: string;
  investigationId: string;
  scope: AIContextScope;
  budget?: Partial<typeof DEFAULT_BUDGET>;
}): Promise<{
  contextSources: AIContextSource[];
  evidenceItems: EvidenceItem[];
  linkedEntityIds: string[];
  linkedFindingIds: string[];
  truncated: boolean;
}> {
  const budget = { ...DEFAULT_BUDGET, ...params.budget };

  const retrievalResult = await evidenceService.retrieveEvidence({
    query: params.query,
    investigationId: params.investigationId,
    scope: {
      entityIds: params.scope.entityId ? [params.scope.entityId] : undefined,
      findingIds: params.scope.selectedFindingIds,
      eventIds: undefined,
      networkId: params.scope.networkId,
    },
    budget,
  });

  const fullItems: EvidenceItem[] = [];
  for (const source of retrievalResult.evidence) {
    try {
      const item = await evidenceService.getEvidence(source.id);
      fullItems.push(item);
    } catch {
      // Skip missing items
    }
  }

  const contextSources = fullItems.map((item) => {
    const relevance = scoreEvidenceRelevance(
      retrievalResult.evidence.find((e) => e.id === item.id) ?? {
        id: item.id,
        title: item.title,
        evidenceType: item.evidenceType,
        status: item.status,
        sourceName: item.sourceName,
        observedAt: item.observedAt,
        entityIds: [],
        findingIds: [],
        eventIds: [],
        isDemoData: item.isDemoData,
      },
      params.query
    );
    return evidenceToContextSource(item, relevance);
  });

  return {
    contextSources,
    evidenceItems: fullItems,
    linkedEntityIds: retrievalResult.entities,
    linkedFindingIds: retrievalResult.findings,
    truncated: retrievalResult.truncated,
  };
}

// ------------------------------------------------------------
// Public API: enrich context bundle with evidence
// ------------------------------------------------------------

/**
 * Retrieve evidence-grounded context for an AI query.
 * Returns context sources ready to merge into the AI context builder.
 */
export async function retrieveEvidenceContext(params: {
  query: string;
  investigationId: string;
  scope: AIContextScope;
  budget?: Partial<typeof DEFAULT_BUDGET>;
}): Promise<{
  evidenceSources: AIContextSource[];
  linkedEntityIds: string[];
  linkedFindingIds: string[];
  truncated: boolean;
  note?: string;
}> {
  await delay();
  try {
    const result = await retrieveEvidenceBundle(params);
    const notes: string[] = [];
    if (result.truncated) {
      notes.push('Evidence context was truncated due to budget limits. Some evidence may not be included.');
    }
    return {
      evidenceSources: result.contextSources,
      linkedEntityIds: result.linkedEntityIds,
      linkedFindingIds: result.linkedFindingIds,
      truncated: result.truncated,
      note: notes.length > 0 ? notes.join(' ') : undefined,
    };
  } catch {
    return {
      evidenceSources: [],
      linkedEntityIds: [],
      linkedFindingIds: [],
      truncated: false,
      note: 'Evidence retrieval encountered an error. Evidence context may be incomplete.',
    };
  }
}

/**
 * Build evidence context source bundle for the context builder.
 * Integrates evidence retrieval into the existing AI context pipeline.
 */
export async function buildEvidenceContextBundle(params: {
  query: string;
  investigationId: string;
  scope: AIContextScope;
}): Promise<ContextSourceBundle> {
  await delay(80);
  try {
    const retrievalResult = await evidenceService.retrieveEvidence({
      query: params.query,
      investigationId: params.investigationId,
      scope: {
        entityIds: params.scope.entityId ? [params.scope.entityId] : undefined,
        findingIds: params.scope.selectedFindingIds,
        networkId: params.scope.networkId,
      },
    });

    const evidence: NonNullable<ContextSourceBundle['evidence']> = [];
    for (const source of retrievalResult.evidence) {
      try {
        const item = await evidenceService.getEvidence(source.id);
        evidence.push({
          id: item.id,
          title: item.title,
          summary: item.snippet?.text ?? item.description,
          evidenceType: item.evidenceType,
        });
      } catch {
        // Skip missing evidence
      }
    }
    return { evidence };
  } catch {
    return { evidence: [] };
  }
}

/**
 * Generate source references for evidence-grounded AI responses.
 * Returns clickable source chips for the AI response panel.
 */
export async function generateEvidenceSourceReferences(params: {
  evidenceIds: string[];
  query: string;
}): Promise<AISourceReference[]> {
  await delay(60);
  const references: AISourceReference[] = [];
  for (const id of params.evidenceIds) {
    try {
      const item = await evidenceService.getEvidence(id);
      references.push({
        id: `Evidence:${item.id}`,
        sourceType: 'Evidence',
        sourceId: item.id,
        label: item.title,
        relevance: item.extractionConfidence,
        payload: {
          evidenceType: item.evidenceType,
          status: item.status,
          sourceName: item.sourceName,
          isDemoData: item.isDemoData,
        },
      });
    } catch {
      // Skip missing evidence
    }
  }
  return references;
}
