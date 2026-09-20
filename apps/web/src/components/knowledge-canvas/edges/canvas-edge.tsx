'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  MarkerType,
  type EdgeProps,
} from '@xyflow/react';
import { useCanvasStore } from '../canvas-store';
import type { CanvasEdge } from '../canvas-types';

// ============================================================
// KNOWLEDGE CANVAS — EDGE (KNOWLEDGE) RENDERING
// ============================================================

export function KnowledgeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<CanvasEdge>) {
  const showLabels = useCanvasStore((s) => s.showLabels);
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const confidence = typeof data?.confidence === 'number' ? data.confidence : null;
  const stroke = selected ? `hsl(var(--color-brand))` : `#64748b`;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeOpacity: confidence === null ? 0.7 : 0.4 + 0.6 * confidence,
          strokeWidth: selected ? 2.5 : 1.75,
          strokeDasharray: (data?.origin ?? 'system') === 'user' ? '6 4' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={
            'pointer-events-auto nodrag nopan absolute rounded-md border border-border/80 bg-surface-elevated/90 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-foreground-secondary backdrop-blur hover:border-brand hover:text-foreground cursor-pointer shadow-sm transition-all ' +
            (selected ? 'border-brand text-brand font-bold ring-1 ring-brand/30' : '')
          }
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setEditingEdge(id);
          }}
        >
          {showLabels ? (data?.label ?? 'related to') : ''}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}