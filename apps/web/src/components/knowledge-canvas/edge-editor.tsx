'use client';

import { useMemo, useState } from 'react';
import type { RelationshipKind } from '@trinetra-pulse/types';
import { Button } from '@trinetra-pulse/ui';
import { useCanvasStore } from './canvas-store';
import { relationshipLabel } from './canvas-utils';
import { RELATIONSHIP_KIND_LABELS } from '@/lib/entity-domain';

// ============================================================
// KNOWLEDGE CANVAS — EDGE EDITOR
// ============================================================
// Editing the visual relationship layer: relationship kind, display label
// and analytical confidence. Changes affect the canvas layer only — a
// canonical Trinetra relationship is never modified from the Canvas.
// ============================================================

export function EdgeEditor() {
  const edge = findEditingEdge();

  if (!edge) return null;

  return <EdgeEditorInner key={edge.id} edgeId={edge.id} />;
}

function findEditingEdge() {
  const state = useCanvasStore.getState();
  const id = state.editingEdgeId;
  return id ? state.edges.find((e) => e.id === id) : null;
}

function EdgeEditorInner({ edgeId }: { edgeId: string }) {
  const edge = useCanvasStore((s) => s.edges.find((e) => e.id === edgeId));
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge);
  const updateEdge = useCanvasStore((s) => s.updateEdge);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const appendAudit = useCanvasStore((s) => s.appendAudit);

  const options = useMemo(
    () => Object.keys(RELATIONSHIP_KIND_LABELS) as RelationshipKind[],
    [],
  );

  const [relationship, setRelationship] = useState<string | ''>(edge?.data?.relationship ?? '');

  if (!edge) return null;

  const kind: string | '' = relationship || edge.data?.relationship || '';

  const apply = () => {
    if (!kind) return;
    updateEdge(edge.id, { label: relationshipLabel(kind) });
    appendAudit({ action: 'edit-edge', detail: `Edited ${edge.id}` });
    setEditingEdge(null);
  };

  const remove = () => {
    appendAudit({ action: 'remove-edge', detail: `Removed ${edge.id}` });
    removeEdge(edge.id);
    setEditingEdge(null);
  };

  return (
    <div
      data-testid="edge-editor"
      className="absolute left-1/2 top-3 w-72 -translate-x-1/2 rounded-lg border border-border bg-surface p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-subheading text-foreground">Edit connection</h3>
        <Button variant="ghost" size="sm" onClick={() => setEditingEdge(null)}>
          Close
        </Button>
      </div>

      <label className="block space-y-1">
        <span className="font-mono text-overline uppercase tracking-wider text-foreground-secondary">
          Relationship kind
        </span>
        <select
          className="w-full rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-label text-foreground"
          value={kind ?? ''}
          onChange={(e) => setRelationship(e.target.value)}
        >
          <option value="" disabled>
            related to
          </option>
          {options.map((value) => (
            <option key={value} value={value}>
              {relationshipLabel(value)}
            </option>
          ))}
        </select>
      </label>

      <p className="mt-2 font-mono text-caption text-foreground-muted">
        {edge.data?.refId
          ? `canonical ref ${edge.data.refId}`
          : 'canvas-local connection'}
        {typeof edge.data?.confidence === 'number'
          ? ` · confidence ${Math.round(edge.data.confidence * 100)}%`
          : ''}
      </p>

      <div className="mt-3 flex gap-2">
        <Button variant="primary" size="sm" disabled={!kind} onClick={apply}>
          Apply
        </Button>
        <Button variant="danger-ghost" size="sm" onClick={remove}>
          Remove
        </Button>
      </div>
    </div>
  );
}