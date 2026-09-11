import type { NetworkGraph, NetworkSummary } from '@trinetra-pulse/types';
import { networkClean } from './network-clean';
import { networkHarbour } from './network-harbour';
import { networkSkyline } from './network-skyline';
import { nexusNetwork } from '../nexus-dataset';
import { summarizeNetwork } from './build';
import { DEMO_NETWORK_ID } from '@/navigation/journey';

// ============================================================
// MOCK — NETWORKS
// ============================================================

export const mockNetworkGraphs: NetworkGraph[] = [
  networkClean,
  networkHarbour,
  networkSkyline,
  nexusNetwork,
];

export const mockNetworkGraphById = new Map<string, NetworkGraph>(
  mockNetworkGraphs.map((n) => [n.id, n])
);

export const mockNetworkSummaries: NetworkSummary[] = mockNetworkGraphs.map(
  (n) => summarizeNetwork(n)
);

export const mockNetworkSummaryById = new Map<string, NetworkSummary>(
  mockNetworkSummaries.map((n) => [n.id, n])
);

/**
 * Networks surfaced on presentation screens: the single Operation
 * Trinetra Nexus demo network only. Legacy fixtures (Operation Clean,
 * Harbour Ring, Skyline Cell) remain available internally for the
 * catalogue/API but never appear in the user-facing presentation.
 */
export const presentationNetworkSummaries: NetworkSummary[] = mockNetworkSummaries.filter(
  (n) => n.id === DEMO_NETWORK_ID
);

export { networkClean, networkHarbour, networkSkyline, nexusNetwork };