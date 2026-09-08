/**
 * API-mode tests for the graph store (Phase 17.2).
 *
 * Forces `isMockData` to false and asserts that `loadNetwork` routes
 * through `getNetworkGraph` + the mapping functions rather than the
 * mock network service.
 */

import { useGraphStore } from './graph.store';
import type { RealNetworkGraph } from '@/lib/api/investigations';

// ---------------------------------------------------------------------------
// MOCKS
// ---------------------------------------------------------------------------

// Force API mode.
jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

// Mock the investigations module (mapping functions + API client).
jest.mock('@/lib/api/investigations', () => ({
  getNetworkGraph: jest.fn(),
  findNetworkPath: jest.fn(),
  mapApiGraphToNetworkGraph: jest.fn(),
  mapApiGraphToSummary: jest.fn(),
}));

// Mock the graph engine (no real engine in unit tests).
jest.mock('@/engine/graph-engine', () => ({}));

// Mock network service (should NOT be called in API mode).
jest.mock('@/services/network.service', () => ({
  getNetwork: jest.fn(),
  getNetworkSummary: jest.fn(),
  getClusters: jest.fn(),
  getNodes: jest.fn(),
  getEdges: jest.fn(),
  getTimeline: jest.fn(),
  searchNetwork: jest.fn(),
  findPath: jest.fn(),
  getNeighbors: jest.fn(),
}));

import {
  getNetworkGraph,
  findNetworkPath,
  mapApiGraphToNetworkGraph,
  mapApiGraphToSummary,
} from '@/lib/api/investigations';
import {
  getNetwork,
  getNetworkSummary,
  getClusters,
  getNodes,
  getEdges,
  getTimeline,
} from '@/services/network.service';

const mockedGetNetworkGraph = jest.mocked(getNetworkGraph);
const mockedFindNetworkPath = jest.mocked(findNetworkPath);
const mockedMapGraph = jest.mocked(mapApiGraphToNetworkGraph);
const mockedMapSummary = jest.mocked(mapApiGraphToSummary);
const mockedGetNetwork = jest.mocked(getNetwork);

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

const FAKE_API_GRAPH: RealNetworkGraph = {
  investigation_id: '6c887c98-939a-50ce-ac27-f58376941de2',
  nodes: [
    { id: 'n1', name: 'Alice', entity_type: 'person', risk_score: 0.8, is_verified: true, is_flagged: false },
    { id: 'n2', name: 'Bob', entity_type: 'person', risk_score: 0.4, is_verified: false, is_flagged: false },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', relationship_type: 'KNOWS', weight: 0.9 },
  ],
};

const MAPPED_GRAPH = {
  id: 'test-investigation',
  name: 'Test Network',
  description: '',
  nodes: [
    { id: 'n1', entityId: 'n1', type: 'person', label: 'Alice', displayLabel: 'Alice', status: 'confirmed', confidence: 0.8, position: { x: 0, y: 0 }, size: 20, style: { size: 20, shape: 'circle' }, connections: 1, sources: [], metadata: {} },
    { id: 'n2', entityId: 'n2', type: 'person', label: 'Bob', displayLabel: 'Bob', status: 'probable', confidence: 0.4, position: { x: 0, y: 0 }, size: 20, style: { size: 20, shape: 'circle' }, connections: 1, sources: [], metadata: {} },
  ],
  edges: [
    { id: 'e1', relationshipId: 'e1', source: 'n1', target: 'n2', type: 'KNOWS', label: 'knows', confidence: 0.9, status: 'confirmed', direction: 'directed', weight: 0.9, sourceRecordLabel: 'CSV Import', evidence: [], extractionMethod: 'STRUCTURED_MAPPING', metadata: {} },
  ],
  clusters: [],
  metadata: { seedEntityId: null, caseId: null, sources: [], connectedComponents: 0, nodeCount: 2, relationshipCount: 1 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const MAPPED_SUMMARY = {
  id: 'test-investigation',
  name: 'Test Network',
  description: '',
  status: 'ready',
  nodeCount: 2,
  relationshipCount: 1,
  clusterCount: 0,
  connectedComponents: 0,
  sources: [],
  dateRange: { start: null, end: null },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  caseId: null,
  seedEntityId: null,
};

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('graph.store – API mode loadNetwork', () => {
  const original = useGraphStore.getState();

  beforeEach(() => {
    useGraphStore.setState({
      networkId: null,
      summary: null,
      nodes: [],
      edges: [],
      clusters: [],
      loadingState: 'idle',
      error: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      focusedNodeId: null,
    });
    jest.clearAllMocks();

    mockedGetNetworkGraph.mockResolvedValue(FAKE_API_GRAPH);
    mockedFindNetworkPath.mockResolvedValue(null);
    mockedMapGraph.mockReturnValue(MAPPED_GRAPH as ReturnType<typeof mapApiGraphToNetworkGraph>);
    mockedMapSummary.mockReturnValue(MAPPED_SUMMARY as ReturnType<typeof mapApiGraphToSummary>);
  });

  afterAll(() => {
    useGraphStore.setState(original);
  });

  it('calls getNetworkGraph instead of mock getNetwork', async () => {
    await useGraphStore.getState().loadNetwork('test-investigation');
    expect(mockedGetNetworkGraph).toHaveBeenCalledWith('test-investigation');
    expect(mockedGetNetwork).not.toHaveBeenCalled();
  });

  it('sets loadingState to ready on success', async () => {
    await useGraphStore.getState().loadNetwork('test-investigation');
    const s = useGraphStore.getState();
    expect(s.loadingState).toBe('ready');
    expect(s.error).toBeNull();
  });

  it('populates nodes and edges from the mapped graph', async () => {
    await useGraphStore.getState().loadNetwork('test-investigation');
    const s = useGraphStore.getState();
    expect(s.nodes).toHaveLength(2);
    expect(s.edges).toHaveLength(1);
  });

  it('populates the summary from the mapped summary', async () => {
    await useGraphStore.getState().loadNetwork('test-investigation');
    const s = useGraphStore.getState();
    expect(s.summary).toBeDefined();
    expect(s.summary?.nodeCount).toBe(2);
  });

  it('sets focusedNodeId to the first node', async () => {
    await useGraphStore.getState().loadNetwork('test-investigation');
    const s = useGraphStore.getState();
    expect(s.focusedNodeId).toBe('n1');
  });

  it('sets timeline to empty range', async () => {
    await useGraphStore.getState().loadNetwork('test-investigation');
    const s = useGraphStore.getState();
    expect(s.timeline).toEqual({ from: null, to: null });
  });

  it('resets selection on load', async () => {
    useGraphStore.setState({ selectedNodeId: 'old-id', selectedEdgeId: 'old-edge' });
    await useGraphStore.getState().loadNetwork('test-investigation');
    const s = useGraphStore.getState();
    expect(s.selectedNodeId).toBeNull();
    expect(s.selectedEdgeId).toBeNull();
  });

  it('sets error state when getNetworkGraph fails', async () => {
    mockedGetNetworkGraph.mockRejectedValue(new Error('Network fetch failed'));
    await useGraphStore.getState().loadNetwork('test-investigation');
    const s = useGraphStore.getState();
    expect(s.loadingState).toBe('error');
    expect(s.error).toBe('Network fetch failed');
  });

  it('uses the API path endpoint instead of mock path computation', async () => {
    mockedFindNetworkPath.mockResolvedValue({
      start_entity_id: 'n1',
      end_entity_id: 'n2',
      node_ids: ['n1', 'n2'],
      edge_ids: ['e1'],
      length: 1,
      confidence: 0.9,
    });
    useGraphStore.setState({ networkId: 'test-investigation' });
    await useGraphStore.getState().findPath('n1', 'n2');
    expect(mockedFindNetworkPath).toHaveBeenCalledWith('test-investigation', 'n1', 'n2');
    expect(useGraphStore.getState().path?.nodeIds).toEqual(['n1', 'n2']);
  });
});
