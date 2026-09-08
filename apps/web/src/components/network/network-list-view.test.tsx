import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { NetworkListView } from '@/components/network/network-list-view';
import { useGraphStore } from '@/state/graph.store';
import type { GraphEdge, GraphNode } from '@trinetra-pulse/types';

function makeNode(id: string, overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    entityId: `ent-${id}`,
    type: 'person',
    label: id,
    displayLabel: id,
    status: 'probable',
    confidence: 0.8,
    position: { x: 0, y: 0 },
    size: 18,
    style: { size: 18 },
    connections: 1,
    sources: ['S1'],
    metadata: {},
    ...overrides,
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  overrides: Partial<GraphEdge> = {}
): GraphEdge {
  return {
    id,
    relationshipId: `rel-${id}`,
    source,
    target,
    type: 'KNOWS',
    label: 'knows',
    confidence: 0.7,
    status: 'probable',
    direction: 'directed',
    weight: 1,
    sourceRecordLabel: 'CDR',
    evidence: [],
    extractionMethod: 'STRUCTURED_MAPPING',
    metadata: {},
    ...overrides,
  };
}

const n1 = makeNode('NET-001-n-001', { label: 'Rajesh Kumar', type: 'person' });
const n2 = makeNode('NET-001-n-002', { label: '+91 98765 43210', type: 'phone' });
const e1 = makeEdge('NET-001-e-001', 'NET-001-n-001', 'NET-001-n-002');

afterEach(() => {
  cleanup();
  useGraphStore.setState({
    nodes: [],
    edges: [],
    filters: {
      entityTypes: [],
      relationshipTypes: [],
      minConfidence: 0,
      statuses: [],
      sources: [],
      activity: 'all',
    },
    depth: { kind: 'full' },
    timeline: { from: null, to: null },
    expandedNodeIds: [],
    selectedNodeId: null,
    selectedEdgeId: null,
  });
});

describe('NetworkListView', () => {
  it('renders visible entities and relationships', () => {
    act(() => {
      useGraphStore.setState({
        nodes: [n1, n2],
        edges: [e1],
        depth: { kind: 'full' },
      });
    });
    render(<NetworkListView />);

    expect(screen.getByText('Rajesh Kumar')).toBeInTheDocument();
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
    expect(screen.getAllByText(/Rajesh Kumar/).length).toBeGreaterThan(0);
  });

  it('selects a node row and updates the graph store selection', () => {
    act(() => {
      useGraphStore.setState({
        nodes: [n1, n2],
        edges: [e1],
        depth: { kind: 'full' },
      });
    });
    render(<NetworkListView />);

    fireEvent.click(screen.getByText('Rajesh Kumar'));
    expect(useGraphStore.getState().selectedNodeId).toBe('NET-001-n-001');
    expect(useGraphStore.getState().selectedEdgeId).toBeNull();
  });

  it('shows an empty state when no nodes are visible', () => {
    render(<NetworkListView />);
    expect(screen.queryByText('Rajesh Kumar')).not.toBeInTheDocument();
  });
});
