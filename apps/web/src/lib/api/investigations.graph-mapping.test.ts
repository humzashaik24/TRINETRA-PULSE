/**
 * Tests for graph mapping functions (Phase 17.2).
 *
 * Verifies that mapApiGraphToNetworkGraph correctly transforms the real
 * API response (RealNetworkGraph) into the full NetworkGraph shape
 * expected by the graph workspace (GraphNode[], GraphEdge[]).
 */

import {
  mapApiGraphToNetworkGraph,
  mapApiGraphToSummary,
  type RealNetworkGraph,
} from './investigations';
import type { NetworkGraph } from '@trinetra-pulse/types';

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

const MOCK_API_GRAPH: RealNetworkGraph = {
  investigation_id: '6c887c98-939a-50ce-ac27-f58376941de2',
  nodes: [
    {
      id: 'node-001',
      name: 'Rahul Kumar',
      entity_type: 'person',
      risk_score: 0.92,
      is_verified: true,
      is_flagged: false,
    },
    {
      id: 'node-002',
      name: '+91 98765 43210',
      entity_type: 'phone',
      risk_score: 0.45,
      is_verified: false,
      is_flagged: true,
    },
    {
      id: 'node-003',
      name: 'MH 14 BX 2231',
      entity_type: 'vehicle',
      risk_score: 0.3,
      is_verified: false,
      is_flagged: false,
    },
  ],
  edges: [
    {
      id: 'edge-001',
      source: 'node-001',
      target: 'node-002',
      relationship_type: 'OWNS_PHONE',
      weight: 0.95,
    },
    {
      id: 'edge-002',
      source: 'node-001',
      target: 'node-003',
      relationship_type: 'USES_VEHICLE',
      weight: 0.7,
    },
  ],
};

// ---------------------------------------------------------------------------
// mapApiGraphToNetworkGraph
// ---------------------------------------------------------------------------

describe('mapApiGraphToNetworkGraph', () => {
  let graph: NetworkGraph;

  beforeAll(() => {
    graph = mapApiGraphToNetworkGraph(MOCK_API_GRAPH, 'inv-test-001');
  });

  it('sets the graph id to the investigationId', () => {
    expect(graph.id).toBe('inv-test-001');
  });

  it('maps all nodes from the API response', () => {
    expect(graph.nodes).toHaveLength(3);
  });

  it('maps all edges from the API response', () => {
    expect(graph.edges).toHaveLength(2);
  });

  it('sets node entityId equal to the API node id', () => {
    expect(graph.nodes[0].entityId).toBe('node-001');
  });

  it('sets node label from the API name', () => {
    expect(graph.nodes[0].label).toBe('Rahul Kumar');
    expect(graph.nodes[0].displayLabel).toBe('Rahul Kumar');
  });

  it('maps entity_type to the node type field', () => {
    expect(graph.nodes[0].type).toBe('person');
    expect(graph.nodes[1].type).toBe('phone');
    expect(graph.nodes[2].type).toBe('vehicle');
  });

  it('derives status from risk_score', () => {
    // 0.92 >= 0.8 => needs_review
    expect(graph.nodes[0].status).toBe('needs_review');
    // 0.45 < 0.5 => probable (no: 0.45 < 0.5 => 'probable' per nodeStatusFor)
    // Actually nodeStatusFor(0.45): 0.45 < 0.5 => 'probable'
    // Wait: nodeStatusFor: >=0.8 => needs_review, >=0.5 => possible, >=0.3 => probable, else confirmed
    // So 0.45 >= 0.3 => 'probable'
    expect(graph.nodes[1].status).toBe('probable');
    // 0.3 >= 0.3 => 'probable'
    expect(graph.nodes[2].status).toBe('probable');
  });

  it('copies risk_score to confidence', () => {
    expect(graph.nodes[0].confidence).toBe(0.92);
    expect(graph.nodes[1].confidence).toBe(0.45);
  });

  it('computes connections (degree) from edges', () => {
    // node-001 is source in both edges => connections = 2
    const n1 = graph.nodes.find((n) => n.id === 'node-001');
    expect(n1?.connections).toBe(2);
    // node-002 is target in 1 edge => connections = 1
    const n2 = graph.nodes.find((n) => n.id === 'node-002');
    expect(n2?.connections).toBe(1);
    // node-003 is target in 1 edge => connections = 1
    const n3 = graph.nodes.find((n) => n.id === 'node-003');
    expect(n3?.connections).toBe(1);
  });

  it('assigns a default position of {0,0}', () => {
    expect(graph.nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it('sets initial sources to empty array', () => {
    expect(graph.nodes[0].sources).toEqual([]);
  });

  // --- Edge mapping ---

  it('maps edge source and target directly', () => {
    expect(graph.edges[0].source).toBe('node-001');
    expect(graph.edges[0].target).toBe('node-002');
  });

  it('maps relationship_type to the edge type', () => {
    expect(graph.edges[0].type).toBe('OWNS_PHONE');
  });

  it('creates a human-readable label from the relationship type', () => {
    expect(graph.edges[0].label).toBe('owns phone');
  });

  it('copies weight to edge weight and confidence', () => {
    expect(graph.edges[0].confidence).toBe(0.95);
    expect(graph.edges[0].weight).toBe(0.95);
  });

  it('derives edge status from weight', () => {
    // 0.95 >= 0.9 => confirmed
    expect(graph.edges[0].status).toBe('confirmed');
    // 0.7 < 0.75 => possible
    expect(graph.edges[1].status).toBe('possible');
  });

  it('sets default extractionMethod to STRUCTURED_MAPPING', () => {
    expect(graph.edges[0].extractionMethod).toBe('STRUCTURED_MAPPING');
  });

  it('sets default sourceRecordLabel to CSV Import', () => {
    expect(graph.edges[0].sourceRecordLabel).toBe('CSV Import');
  });

  // --- Metadata ---

  it('sets metadata nodeCount and relationshipCount', () => {
    expect(graph.metadata.nodeCount).toBe(3);
    expect(graph.metadata.relationshipCount).toBe(2);
  });

  it('includes sources from all nodes (empty in this case)', () => {
    expect(graph.metadata.sources).toEqual([]);
  });

  it('sets clusters to empty array', () => {
    expect(graph.clusters).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mapApiGraphToSummary
// ---------------------------------------------------------------------------

describe('mapApiGraphToSummary', () => {
  it('maps a NetworkGraph into a valid NetworkSummary', () => {
    const graph = mapApiGraphToNetworkGraph(MOCK_API_GRAPH, 'inv-test-002');
    const summary = mapApiGraphToSummary(graph);

    expect(summary.id).toBe('inv-test-002');
    expect(summary.nodeCount).toBe(3);
    expect(summary.relationshipCount).toBe(2);
    expect(summary.clusterCount).toBe(0);
    expect(summary.status).toBe('ready');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('mapApiGraphToNetworkGraph edge cases', () => {
  it('handles an empty graph (no nodes or edges)', () => {
    const emptyGraph: RealNetworkGraph = {
      investigation_id: 'inv-empty',
      nodes: [],
      edges: [],
    };
    const result = mapApiGraphToNetworkGraph(emptyGraph, 'inv-empty');
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.metadata.nodeCount).toBe(0);
    expect(result.metadata.relationshipCount).toBe(0);
  });

  it('handles nodes with no edges (isolated nodes)', () => {
    const isolatedGraph: RealNetworkGraph = {
      investigation_id: 'inv-iso',
      nodes: [
        { id: 'a', name: 'Alpha', entity_type: 'person', risk_score: 0.6, is_verified: false, is_flagged: false },
        { id: 'b', name: 'Beta', entity_type: 'phone', risk_score: 0.4, is_verified: false, is_flagged: false },
      ],
      edges: [],
    };
    const result = mapApiGraphToNetworkGraph(isolatedGraph, 'inv-iso');
    expect(result.nodes[0].connections).toBe(0);
    expect(result.nodes[1].connections).toBe(0);
  });

  it('handles unknown entity_type gracefully (falls back to size 15)', () => {
    const customGraph: RealNetworkGraph = {
      investigation_id: 'inv-custom',
      nodes: [
        { id: 'x', name: 'Custom', entity_type: 'weapon', risk_score: 0.5, is_verified: false, is_flagged: false },
      ],
      edges: [],
    };
    const result = mapApiGraphToNetworkGraph(customGraph, 'inv-custom');
    expect(result.nodes[0].size).toBe(15);
    expect(result.nodes[0].type).toBe('weapon');
  });
});
