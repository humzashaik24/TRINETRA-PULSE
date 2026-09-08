'use client';

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  MarkerType,
} from '@xyflow/react';
import type { GraphEdgeProps } from '@/engine/react-flow-types';
import { useGraphZoom } from './graph-zoom-context';

// ============================================================
// GRAPH EDGE — REACT FLOW RENDER
// ============================================================
// Subtle relationship lines by default. Selected / focused edges
// become more prominent and reveal a relationship label. An
// arrowhead marks directed relationships. Confidence is encoded
// in stroke opacity.
// ============================================================

export const GraphEdge = memo(function GraphEdgeComponent(props: GraphEdgeProps) {
  const {
    id,
    selected,
    data,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    style,
  } = props;

  const zoom = useGraphZoom();
  const edge = data;
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const focused = selected || edge?.focused;
  const dimmed = edge?.dimmed;

  const strokeColor = focused
    ? 'hsl(210, 90%, 70%)'
    : `hsl(215, 20%, 52%)`;

  const strokeWidth = focused ? 2 : Math.max(1, (edge?.confidence ?? 0.5) * 1.6);

  const showLabel =
    !!edge?.label &&
    (focused || zoom >= 1.1) &&
    !dimmed;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          opacity: dimmed ? 0.12 : focused ? 1 : 0.4,
        }}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <span className="rounded border border-border bg-surface/90 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-foreground">
              {edge.label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export function defaultEdgeMarker(directed: boolean) {
  return directed
    ? { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'hsl(215, 20%, 52%)' }
    : undefined;
}
