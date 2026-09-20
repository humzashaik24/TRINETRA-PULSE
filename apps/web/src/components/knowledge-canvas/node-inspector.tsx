'use client';

import { Button } from '@trinetra-pulse/ui';
import { useCanvasStore } from './canvas-store';
import { KIND_TO_TOKEN, type CanvasNode, type CanvasNodeKind } from './canvas-types';
import { useInvestigationStore } from '@/state/investigation.store';

// ============================================================
// KNOWLEDGE CANVAS — NODE INSPECTOR
// ============================================================
// Right-hand rail for the selected node: canonical object identity,
// provenance, connected edges and quick actions (Ask Investigator,
// remove from the view layer). Removal only detaches the visual node —
// the canonical Trinetra object is never deleted from here.
// ============================================================

const KIND_LABELS: Record<CanvasNodeKind, string> = {
  entity: 'Entity',
  evidence: 'Evidence',
  finding: 'Finding',
  event: 'Event',
  note: 'Note (canvas-local)',
  source: 'Source / upload',
  concept: 'Concept (canvas-local)',
};

export function NodeInspector() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const focusNode = useCanvasStore((s) => s.focusNode);
  const focusedNodeId = useCanvasStore((s) => s.focusedNodeId);
  const setAiOpen = useCanvasStore((s) => s.setAiOpen);
  const setRightDrawerTab = useCanvasStore((s) => s.setRightDrawerTab);
  const removeNodes = useCanvasStore((s) => s.removeNodes);
  const appendAudit = useCanvasStore((s) => s.appendAudit);
  const workspace = useInvestigationStore((s) => s.data);

  const node = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  if (!node) return null;

  const data = node.data;
  const kind = data.kind as CanvasNodeKind;
  const isFocused = node.id === focusedNodeId || data.refId === focusedNodeId;
  const token = kind === 'entity' && data.entityType
    ? KIND_TO_TOKEN[data.entityType]
    : KIND_TO_TOKEN[kind];
  const accent = `hsl(var(--color-${token}))`;
  const degree = edges.filter((e) => e.source === node.id || e.target === node.id).length;
  const canonicalEntity = kind === 'entity'
    ? workspace.entities.find((entity) => entity.entity_id === data.refId)
    : null;
  const canonicalEvidence = kind === 'evidence'
    ? workspace.evidence.find((evidence) => evidence.evidence_id === data.refId)
    : null;
  const canonicalFinding = kind === 'finding'
    ? workspace.findings.find((finding) => finding.id === data.refId)
    : null;

  const askAboutNode = () => {
    setAiOpen(true);
    setRightDrawerTab('ai');
    appendAudit({
      action: 'ask-investigator',
      detail: `Asked the Investigator about ${data.label}`,
    });
  };

  const toggleFocus = () => {
    if (isFocused) {
      focusNode(null);
    } else {
      focusNode(node.id);
    }
  };

  const removeFromCanvas = () => {
    appendAudit({
      action: 'remove-node',
      detail: `Removed ${data.label} from the view layer (canonical object preserved)`,
    });
    removeNodes([node.id]);
  };

  return (
    <aside
      data-testid="node-inspector"
      className="pointer-events-auto flex w-full flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
    >
      <div className="border-b border-border-subtle px-3.5 py-2.5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <h2 className="text-subheading text-foreground font-semibold truncate">{data.label}</h2>
          </div>
          <p className="mt-0.5 font-mono text-overline uppercase tracking-wider text-foreground-secondary">
            {KIND_LABELS[kind]} · {degree} connection{degree === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          variant={isFocused ? 'primary' : 'secondary'}
          size="sm"
          onClick={toggleFocus}
          title={isFocused ? 'Clear focused subgraph' : 'Focus on this node and direct connections'}
        >
          {isFocused ? 'Focused' : 'Focus'}
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
        {typeof data.summary === 'string' && data.summary.length > 0 && (
          <p className="text-body-sm text-foreground-muted">{data.summary}</p>
        )}

        <dl className="space-y-1.5 font-mono text-caption text-foreground-secondary">
          <div className="flex justify-between gap-2">
            <dt>origin</dt>
            <dd className="truncate text-foreground">{data.origin}</dd>
          </div>
          {typeof data.confidence === 'number' && (
            <div className="flex justify-between gap-2">
              <dt>confidence</dt>
              <dd className="text-foreground">{Math.round(data.confidence * 100)}%</dd>
            </div>
          )}
          {data.refId && (
            <div className="flex justify-between gap-2">
              <dt>refId</dt>
              <dd className="truncate" title={data.refId}>{data.refId}</dd>
            </div>
          )}
          {data.createdAt && (
            <div className="flex justify-between gap-2">
              <dt>created</dt>
              <dd>{new Date(data.createdAt).toLocaleDateString()}</dd>
            </div>
          )}
        </dl>

        {canonicalEntity && (
          <section className="space-y-1.5 border-t border-border-subtle pt-3">
            <p className="font-mono text-overline uppercase tracking-wider text-foreground-muted">Investigation context</p>
            <p className="text-caption text-foreground">{canonicalEntity.entity_type} · {canonicalEntity.role ?? 'linked entity'}</p>
            <p className="text-caption text-foreground-muted">{degree} workspace connection{degree === 1 ? '' : 's'} observed</p>
          </section>
        )}

        {canonicalEvidence && (
          <section className="space-y-1.5 border-t border-border-subtle pt-3">
            <p className="font-mono text-overline uppercase tracking-wider text-foreground-muted">Evidence context</p>
            <p className="text-caption text-foreground">{canonicalEvidence.evidence_type}</p>
            {canonicalEvidence.summary && <p className="text-caption text-foreground-muted">{canonicalEvidence.summary}</p>}
          </section>
        )}

        {canonicalFinding && (
          <section className="space-y-1.5 border-t border-border-subtle pt-3">
            <p className="font-mono text-overline uppercase tracking-wider text-foreground-muted">Finding context</p>
            {canonicalFinding.description && <p className="text-caption text-foreground-muted">{canonicalFinding.description}</p>}
            <p className="text-caption text-foreground">classification: {canonicalFinding.category}</p>
          </section>
        )}

        {kind === 'entity' && (
          <p className="text-caption text-foreground-muted">
            This node references the canonical Trinetra entity. Focus centers this entity and keeps direct connections highlighted.
          </p>
        )}

        {kind === 'evidence' && (
          <p className="text-caption text-foreground-muted">
            {data.transcript
              ? 'Transcription is available locally. Evidence integrity metadata and chain of custody are preserved by Trinetra backend.'
              : 'Evidence integrity metadata and chain of custody are preserved by Trinetra backend.'}
          </p>
        )}

        {kind === 'source' && data.fileName && (
          <div className="space-y-1.5 rounded-md border border-border-subtle bg-surface-elevated/50 p-2">
            <p className="break-all font-mono text-caption text-foreground">{data.fileName}</p>
            {data.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.imageUrl} alt="" className="max-h-24 rounded border border-border" />
            )}
            {data.checksum && (
              <p className="break-all font-mono text-overline text-foreground-muted">
                sha256 {data.checksum.slice(0, 24)}…
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-2">
        <Button variant="secondary" size="sm" onClick={askAboutNode}>
          Analyze with AI
        </Button>
        <Button
          variant="danger-ghost"
          size="sm"
          onClick={removeFromCanvas}
          title="Remove from the view layer only"
        >
          Remove
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => selectNode(null)}>
          Close
        </Button>
      </div>
    </aside>
  );
}
