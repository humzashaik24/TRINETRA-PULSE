'use client';

import { useEffect, useRef, useState } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
} from 'd3-force';
import { useCanvasStore } from '../canvas-store';
import { KIND_TO_TOKEN, type CanvasEdge, type CanvasNode, type CanvasNodeKind } from '../canvas-types';

// ============================================================
// KNOWLEDGE CANVAS — VISUALIZATION
// ============================================================
// Dependency-light structural visualization of the canvas layer: a
// force-directed layout (d3-force, already in the product) rendered to
// plain SVG. Purely a visual aid — this is not the Networks feature.
// ============================================================

interface SimEdge {
  id: string;
  source: string | number;
  target: string | number;
}

interface Position {
  x: number;
  y: number;
}

type VisNode = CanvasNode & { vx: number; vy: number; x: number; y: number };

export function VisualizationView() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const investigationId = useCanvasStore((s) => s.investigationId);
  const [pos, setPos] = useState<Record<string, Position>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    if (nodes.length === 0) return;
    const positions: Record<string, Position> = {};
    const simNodes: VisNode[] = nodes.map((n, i) => {
      const p = { x: n.position.x, y: n.position.y };
      positions[n.id] = p;
      return { ...n, ...p, vx: 0, vy: 0 };
    });
    const simEdges: SimEdge[] = edges
      .map((e, i) => ({
        id: `vis-edge-${i}`,
        source: e.source,
        target: e.target,
      }))
      .filter(
        (e) =>
          positions[e.source as string] !== undefined &&
          positions[e.target as string] !== undefined,
      );

    let stop = false;
    try {
      const sim = forceSimulation(simNodes as VisNode[])
        .force('charge', forceManyBody().strength(-420))
        .force('center', forceCenter(0, 0))
        .force('link', forceLink<VisNode, SimEdge>(simEdges).id((d) => d.id).distance(150))
        .stop();
      for (let i = 0; i < 240 && !stop; i += 1) sim.tick();
      for (const n of simNodes) positions[n.id] = { x: n.x, y: n.y };
    } catch {
      // Real simulation may be unavailable in exotic environments — keep
      // the deterministic start layout in that case.
    }
    if (stop) return undefined;
    setPos(positions);
    return undefined;
  }, [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <p className="text-caption text-foreground-muted" data-testid="canvas-visualization-view">
        Nothing to visualize yet — {investigationId ?? 'investigation'} has no nodes.
      </p>
    );
  }

  const positioned: Record<string, Position> =
    Object.keys(pos).length === nodes.length
      ? pos
      : Object.fromEntries(nodes.map((n) => [n.id, n.position]));

  return (
    <div data-testid="canvas-visualization-view" className="mx-auto max-w-4xl space-y-4">
      <div>
        <h2 className="text-heading text-foreground">Visualization</h2>
        <p className="text-caption text-foreground-muted">
          Force-directed layout of the canvas layer for {investigationId ?? '…'} — read-only,
          independent of the Networks feature.
        </p>
      </div>

      <svg
        ref={svgRef}
        viewBox="-700 -520 1400 1040"
        className="h-[60vh] w-full rounded-lg border border-border-subtle bg-surface"
      >
        {edges.map((edge) => {
          const s = positioned[edge.source];
          const t = positioned[edge.target];
          if (!s || !t) return null;
          return (
            <line
              key={edge.id}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke="hsl(var(--color-foreground-secondary))"
              strokeOpacity={0.4}
              strokeWidth={1.25}
            />
          );
        })}
        {nodes.map((node) => {
          const p = positioned[node.id];
          if (!p) return null;
          const token = colorTokenFor(node);
          const stroke = `hsl(var(--color-${token}))`;
          return (
            <g key={node.id}>
              <circle cx={p.x} cy={p.y} r={9} fill={stroke} stroke="hsl(var(--color-background))" strokeWidth={1.5} />
              {node.data.label && (
                <text
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                  className="fill-foreground-secondary font-mono"
                  fontSize={9}
                >
                  {node.data.label.slice(0, 28)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Nodes" value={nodes.length} />
        <MiniStat label="Edges" value={edges.length} />
        <MiniStat label="Entities" value={nodes.filter((n) => n.data.kind === 'entity').length} />
        <MiniStat label="Evidence" value={nodes.filter((n) => n.data.kind === 'evidence').length} />
      </div>
    </div>
  );
}

function colorTokenFor(node: CanvasNode): string {
  const kind = node.data.kind as CanvasNodeKind;
  if (kind === 'entity' && node.data.entityType) return KIND_TO_TOKEN[node.data.entityType];
  return KIND_TO_TOKEN[kind] ?? 'entity-person';
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
      <p className="font-mono text-overline uppercase tracking-wider text-foreground-muted">{label}</p>
      <p className="font-mono text-subheading text-foreground">{value}</p>
    </div>
  );
}