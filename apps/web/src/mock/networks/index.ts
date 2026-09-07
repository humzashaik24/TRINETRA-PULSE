import type { NetworkGraph, NetworkSummary } from '@trinetra-pulse/types';
import { networkClean } from './network-clean';
import { networkHarbour } from './network-harbour';
import { networkSkyline } from './network-skyline';
import { summarizeNetwork } from './build';

// ============================================================
// MOCK — NETWORKS
// ============================================================

export const mockNetworkGraphs: NetworkGraph[] = [
  networkClean,
  networkHarbour,
  networkSkyline,
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

export { networkClean, networkHarbour, networkSkyline };