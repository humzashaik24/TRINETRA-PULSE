'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  User,
  Smartphone,
  Car,
  MapPin,
  Building2,
  CreditCard,
  ArrowLeftRight,
  CalendarDays,
  Folder,
  FileText,
  Paperclip,
  type LucideIcon,
} from 'lucide-react';
import type { GraphNodeProps } from '@/engine/react-flow-types';
import type { RenderNode } from '@/graph/transform';
import { cn } from '@/lib/utils';
import { useGraphZoom } from './graph-zoom-context';

// ============================================================
// GRAPH NODE — REACT FLOW RENDER
// ============================================================
// Renders a Trinetra entity node in the graph. Appearance
// communicates entity type (icon + shape + accent), confidence
// (ring saturation), selection / focus state and dimension.
// Labels are zoom-sensitive: hidden until a zoom threshold.
// ============================================================

const TYPE_ICON: Record<RenderNode['entityType'], LucideIcon> = {
  person: User,
  phone: Smartphone,
  vehicle: Car,
  location: MapPin,
  organization: Building2,
  account: CreditCard,
  transaction: ArrowLeftRight,
  event: CalendarDays,
  case: Folder,
  document: FileText,
  evidence: Paperclip,
};

interface NodeVisual {
  color: string;
  icon: LucideIcon;
  shape: 'circle' | 'rounded' | 'square' | 'diamond';
}

function visualFor(node: RenderNode): NodeVisual {
  return {
    color: node.color || 'hsl(210, 80%, 55%)',
    icon: TYPE_ICON[node.entityType] ?? User,
    shape: node.shape ?? 'circle',
  };
}

const SHAPE_CLASS: Record<NonNullable<RenderNode['shape']>, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-[30%]',
  square: 'rounded-[20%]',
  diamond: 'rotate-45 rounded-[15%]',
};

function ConfidenceRing({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#fb7185';
  return (
    <span
      className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-background bg-surface"
      title={`Confidence ${pct}%`}
      aria-label={`Confidence ${pct}%`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

export const GraphNode = memo(function GraphNodeComponent({ data, selected }: GraphNodeProps) {
  const node: RenderNode = data;
  const zoom = useGraphZoom();
  const { color, icon: Icon, shape } = visualFor(node);

  const sizeScale = node.analyticsSizeScale ?? 1;
  const displaySize = node.size * sizeScale;
  const nodeColor = node.analyticsTint ?? color;
  const isDimmed = node.dimmed || (node.analyticsDim ?? false);

  // Zoom-based label visibility: show only on selection or when
  // zoomed in far enough that labels stay readable. Important
  // (high confidence) nodes always label themselves sooner.
  const showLabel =
    !node.dimmed &&
    (zoom >= 0.75 || (zoom >= 0.45 && node.confidence >= 0.8) || selected);

  // Contract shape (diamond glyphs must be counter-rotated by parent).
  const shapeClass = shape === 'diamond' ? `${SHAPE_CLASS.diamond} -rotate-45` : SHAPE_CLASS[shape];

  const ring =
    selected
      ? 'ring-2 ring-offset-2 ring-[hsl(210,100%,70%)]'
      : node.analyticsAccent
        ? 'ring-1 ring-offset-1 ring-[hsl(12,85%,55%)]'
        : node.focused
          ? 'ring-1 ring-offset-1 ring-[hsl(210,80%,60%)]'
          : '';

  return (
    <div
      className={cn('relative flex flex-col items-center select-none', ring)}
      data-testid="graph-node"
    >
      <div
        className={cn(
          'flex items-center justify-center border',
          shapeClass,
          isDimmed ? 'opacity-30 saturate-50' : 'opacity-100'
        )}
        style={{
          width: displaySize * 2,
          height: displaySize * 2,
          backgroundColor: `color-mix(in srgb, ${nodeColor} 24%, transparent)`,
          borderColor: nodeColor,
        }}
      >
        <Icon
          className="pointer-events-none text-foreground"
          style={{ color: nodeColor }}
          size={Math.max(12, displaySize * 0.9)}
        />
      </div>
      <ConfidenceRing confidence={node.confidence} />

      {showLabel && (
        <span
          className="mt-1 max-w-[120px] truncate rounded bg-surface/80 px-1 text-center text-[10px] font-medium text-foreground"
        >
          {node.label}
        </span>
      )}

      <Handle type="target" position={Position.Top} className="!opacity-0 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !border-0" />
    </div>
  );
});
