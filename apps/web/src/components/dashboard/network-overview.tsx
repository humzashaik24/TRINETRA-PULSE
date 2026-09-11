'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ExternalLink, Maximize2 } from 'lucide-react';
import { IconButton, Skeleton, EmptyState, ErrorState, useReducedMotion } from '@trinetra-pulse/ui';
import { dashboardNetwork } from '@/mock';
import { DEMO_NETWORK_ID } from '@/navigation/journey';
import type { DashboardNetworkNode } from '@trinetra-pulse/types';

const NODE_COLORS: Record<string, string> = {
  person: '#3b82f6',
  phone: '#10b981',
  vehicle: '#f59e0b',
  location: '#8b5cf6',
  organization: '#ef4444',
  account: '#06b6d4',
  transaction: '#f97316',
  event: '#ec4899',
  document: '#6b7280',
};

function NetworkPreviewSkeleton() {
  return (
    <div className="w-full aspect-[16/9] rounded-lg bg-surface-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="relative w-full h-full">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="circular"
            className="absolute"
            width={12 + Math.random() * 16}
            height={12 + Math.random() * 16}
            style={{ left: `${15 + Math.random() * 70}%`, top: `${15 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function NetworkPreviewError() {
  return (
    <ErrorState
      title="Network intelligence unavailable"
      message="We couldn't load the current network summary."
      retry={() => window.location.reload()}
    />
  );
}

function NetworkPreviewEmpty() {
  return (
    <EmptyState
      icon={<Maximize2 className="h-8 w-8" />}
      title="No network data"
      description="Network intelligence will appear once entities and relationships are processed."
    />
  );
}

export interface NetworkOverviewProps {
  /** Optional: open the Context Inspector for the clicked node. */
  onInspectNode?: (node: DashboardNetworkNode) => void;
}

export function NetworkOverview({ onInspectNode }: NetworkOverviewProps) {
  const [selectedNode, setSelectedNode] = useState<DashboardNetworkNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const { nodes, edges, clusters, density, communityCount, averageDegree } = dashboardNetwork;

  const connectedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedNode) {
      edges.forEach((e) => {
        if (e.source === selectedNode.id) set.add(e.target);
        if (e.target === selectedNode.id) set.add(e.source);
      });
    }
    return set;
  }, [selectedNode, edges]);

  const isNodeHighlighted = useCallback(
    (nodeId: string) => {
      if (!selectedNode) return true;
      return nodeId === selectedNode.id || connectedNodeIds.has(nodeId);
    },
    [selectedNode, connectedNodeIds]
  );

  const isEdgeHighlighted = useCallback(
    (edge: { source: string; target: string }) => {
      if (!selectedNode) return true;
      return edge.source === selectedNode.id || edge.target === selectedNode.id;
    },
    [selectedNode]
  );

  const getNodeOpacity = useCallback(
    (nodeId: string) => {
      if (!selectedNode) return 1;
      return isNodeHighlighted(nodeId) ? 1 : 0.15;
    },
    [selectedNode, isNodeHighlighted]
  );

  const getEdgeOpacity = useCallback(
    (edge: { source: string; target: string }) => {
      if (!selectedNode) return 0.4;
      return isEdgeHighlighted(edge) ? 0.8 : 0.08;
    },
    [selectedNode, isEdgeHighlighted]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNode(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) return <NetworkPreviewSkeleton />;
  if (error) return <NetworkPreviewError />;
  if (nodes.length === 0) return <NetworkPreviewEmpty />;

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-subheading text-foreground">Network Overview</h3>
          <p className="text-caption text-foreground-muted mt-0.5">
            {nodes.length} entities &middot; {edges.length} connections &middot; {clusters.length} clusters
          </p>
        </div>
        <Link href={`/networks/${DEMO_NETWORK_ID}`} aria-label="Open full network workspace">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Open full network workspace"
            className="text-foreground-muted hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </IconButton>
        </Link>
      </div>

      <div className="relative bg-surface-elevated/30" style={{ aspectRatio: '16/9' }}>
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className="w-full h-full"
          role="img"
          aria-label="Network graph preview showing entity relationships"
        >
          <defs>
            {clusters.map((cluster) => (
              <radialGradient key={cluster.id} id={`cluster-${cluster.id}`}>
                <stop offset="0%" stopColor={cluster.color} stopOpacity="0.08" />
                <stop offset="100%" stopColor={cluster.color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          {clusters.map((cluster) => {
            const clusterNodes = cluster.nodeIds.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as DashboardNetworkNode[];
            if (clusterNodes.length === 0) return null;
            const cx = clusterNodes.reduce((sum, n) => sum + n.x, 0) / clusterNodes.length * 100;
            const cy = clusterNodes.reduce((sum, n) => sum + n.y, 0) / clusterNodes.length * 100;
            return (
              <circle
                key={cluster.id}
                cx={cx}
                cy={cy}
                r={22}
                fill={`url(#cluster-${cluster.id})`}
                className="tp-transition"
              />
            );
          })}

          {edges.map((edge) => {
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;
            return (
              <line
                key={edge.id}
                x1={source.x * 100}
                y1={source.y * 100}
                x2={target.x * 100}
                y2={target.y * 100}
                stroke="hsl(var(--color-border))"
                strokeWidth={0.15 + edge.weight * 0.05}
                opacity={getEdgeOpacity(edge)}
                className="tp-transition"
              />
            );
          })}

          {nodes.map((node) => {
            const r = 0.8 + (node.size / 18) * 1.4;
            const opacity = getNodeOpacity(node.id);
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode === node.id;
            const color = NODE_COLORS[node.type] || '#6b7280';

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => {
                  const next = isSelected ? null : node;
                  setSelectedNode(next);
                  if (next) onInspectNode?.(next);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const next = isSelected ? null : node;
                    setSelectedNode(next);
                    if (next) onInspectNode?.(next);
                  }
                }}
                aria-label={`${node.label} - ${node.type} - ${node.connections} connections`}
                aria-pressed={isSelected}
              >
                <circle
                  cx={node.x * 100}
                  cy={node.y * 100}
                  r={r + (isHovered ? 0.3 : 0)}
                  fill={color}
                  opacity={opacity * 0.2}
                  className="tp-transition"
                />
                <circle
                  cx={node.x * 100}
                  cy={node.y * 100}
                  r={r}
                  fill={color}
                  opacity={opacity}
                  stroke={isSelected ? '#fff' : 'transparent'}
                  strokeWidth={isSelected ? 0.3 : 0}
                  className="tp-transition"
                />
                {(isHovered || isSelected) && (
                  <text
                    x={node.x * 100}
                    y={node.y * 100 - r - 1.2}
                    textAnchor="middle"
                    className="fill-foreground text-[2.5px] font-medium pointer-events-none"
                  >
                    {node.label.length > 18 ? node.label.slice(0, 16) + '...' : node.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={reduced ? { duration: 0 } : { duration: 0.15 }}
              className="absolute bottom-3 left-3 right-3 rounded-md bg-surface/95 backdrop-blur-sm border border-border p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: NODE_COLORS[selectedNode.type] }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-foreground truncate">{selectedNode.label}</span>
                  <span className="text-[10px] text-foreground-muted capitalize">{selectedNode.type}</span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-foreground-muted hover:text-foreground text-xs tp-transition"
                  aria-label="Close selection"
                >
                  Esc
                </button>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-[10px] text-foreground-muted">
                <span>{selectedNode.connections} connections</span>
                <span className="capitalize">Cluster: {clusters.find((c) => c.nodeIds.includes(selectedNode.id))?.label || 'Unknown'}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 py-2.5 border-t border-border flex items-center gap-4 text-[10px] text-foreground-muted">
        <span>Density: {density.toFixed(2)}</span>
        <span aria-hidden="true">|</span>
        <span>Communities: {communityCount}</span>
        <span aria-hidden="true">|</span>
        <span>Avg Degree: {averageDegree.toFixed(1)}</span>
        <div className="ml-auto flex items-center gap-2" aria-label="Cluster legend">
          {clusters.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
              <span>{c.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
