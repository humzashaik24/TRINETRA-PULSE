'use client';

import { Check } from 'lucide-react';
import type { LandingGraphEdge, LandingGraphNode, LandingNodeType } from './landing-data';
import {
  LANDING_GRAPH_COLORS,
  LANDING_GRAPH_EDGES,
  LANDING_GRAPH_LEGEND,
  LANDING_GRAPH_NODES,
} from './landing-data';

// ============================================================
// LANDING GRAPH PREVIEW — a lightweight, stylized stand-in for
// the investigation graph. It is a static, decorative SVG (no
// D3, no React Flow, no analytics) so the landing page stays
// fast. It deliberately uses abstract node *types*, never real
// investigative facts.
// ============================================================

interface NodeRecord {
  node: LandingGraphNode;
  color: string;
}

const NODE_RADIUS: Record<LandingNodeType, number> = {
  person: 5,
  organization: 5.5,
  phone: 4.5,
  account: 5,
  evidence: 6,
  finding: 5,
};

const HUB_ID = 'evd-a';

function edgesFrom(nodes: Record<string, NodeRecord>, edges: LandingGraphEdge[]) {
  return edges
    .map((edge) => {
      const source = nodes[edge.source];
      const target = nodes[edge.target];
      if (!source || !target) return null;
      return { ...edge, sx: source.node.cx, sy: source.node.cy, tx: target.node.cx, ty: target.node.cy };
    })
    .filter((edge): edge is NonNullable<typeof edge> => edge !== null);
}

export function LandingGraphPreview() {
  const nodeMap: Record<string, NodeRecord> = Object.fromEntries(
    LANDING_GRAPH_NODES.map((node) => [node.id, { node, color: LANDING_GRAPH_COLORS[node.type] }]),
  );
  const edges = edgesFrom(nodeMap, LANDING_GRAPH_EDGES);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface" data-testid="landing-graph-preview">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border px-4 py-3 sm:px-5">
        <p className="text-overline text-foreground-muted">Investigation Graph — Stylized Preview</p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Graph node legend">
          {LANDING_GRAPH_LEGEND.map(({ type, label }) => (
            <li key={type} className="flex items-center gap-1.5 text-caption text-foreground-muted">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: LANDING_GRAPH_COLORS[type] }}
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 800 400"
          role="img"
          aria-label="Stylized preview of an investigation graph connecting persons, organizations, phones, accounts, evidence and findings"
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="landing-grid-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="hsl(var(--color-border))" opacity="0.55" />
            </pattern>
            <radialGradient id="landing-center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--color-graph-node-highlight))" stopOpacity="0.12" />
              <stop offset="100%" stopColor="hsl(var(--color-graph-node-highlight))" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="800" height="400" fill="url(#landing-grid-dots)" />
          <rect width="800" height="400" fill="url(#landing-center-glow)" />

          {edges.map((edge) => (
            <line
              key={edge.id}
              x1={edge.sx}
              y1={edge.sy}
              x2={edge.tx}
              y2={edge.ty}
              stroke="hsl(var(--color-graph-edge-default))"
              strokeWidth="1"
              opacity="0.85"
            />
          ))}

          {Object.values(nodeMap).map(({ node, color }) => {
            const radius = NODE_RADIUS[node.type];
            const isHub = node.id === HUB_ID;
            return (
              <g key={node.id}>
                <circle cx={node.cx} cy={node.cy} r={radius + 7} fill={color} opacity="0.12" />
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={radius + 3.5}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHub ? 1.5 : 1}
                  opacity={isHub ? 1 : 0.55}
                />
                <circle cx={node.cx} cy={node.cy} r={radius} fill={color} opacity={isHub ? 1 : 0.9} />
                {isHub && (
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={radius + 3.5}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.25"
                    className="animate-pulse-subtle"
                  />
                )}
                <text
                  x={node.cx + 10}
                  y={node.cy + 3}
                  fill="hsl(var(--color-text-secondary))"
                  fontSize="9.5"
                  fontFamily="var(--font-mono)"
                  letterSpacing="0.04em"
                >
                  {node.type.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        <p className="absolute bottom-2.5 left-1/2 w-full -translate-x-1/2 px-4 text-center text-caption text-foreground-muted">
          <Check className="mr-1 inline h-3 w-3 align-[-1px] text-evidence" aria-hidden="true" />
          Abstract representation — illustrating structure, not real case data.
        </p>
      </div>
    </div>
  );
}