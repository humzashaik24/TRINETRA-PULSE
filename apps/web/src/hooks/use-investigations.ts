/**
 * TanStack Query hooks for the relational investigation API.
 *
 * These wrap the typed client in `@/lib/api/investigations` so React
 * components can consume backend data with caching, retries and
 * invalidation, without touching the Zustand mock services or UI.
 */

import { useQuery } from '@tanstack/react-query';
import type { Uuid } from '@/lib/api/investigations';
import {
  getInvestigation,
  getInvestigationSummary,
  getNetworkAnalytics,
  getNetworkGraph,
  getTimeline,
  listEntitiesForInvestigation,
  listEvidenceForInvestigation,
  listEventsForInvestigation,
  listFindingsForInvestigation,
  listInvestigations,
  listNotesForInvestigation,
  listRelationshipsForInvestigation,
} from '@/lib/api/investigations';

const KEYS = {
  all: ['investigations'] as const,
  detail: (id: Uuid) => ['investigations', id] as const,
  entities: (id: Uuid) => ['investigations', id, 'entities'] as const,
  relationships: (id: Uuid) => ['investigations', id, 'relationships'] as const,
  findings: (id: Uuid) => ['investigations', id, 'findings'] as const,
  evidence: (id: Uuid) => ['investigations', id, 'evidence'] as const,
  events: (id: Uuid) => ['investigations', id, 'events'] as const,
  notes: (id: Uuid) => ['investigations', id, 'notes'] as const,
  timeline: (id: Uuid) => ['investigations', id, 'timeline'] as const,
  graph: (id: Uuid) => ['investigations', id, 'graph'] as const,
  analytics: (id: Uuid) => ['investigations', id, 'analytics'] as const,
};

export { KEYS as investigationQueryKeys };

export function useInvestigations(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...KEYS.all, page, pageSize],
    queryFn: () => listInvestigations({ page, page_size: pageSize }),
  });
}

export function useInvestigation(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id as Uuid),
    queryFn: () => getInvestigation(id as Uuid),
    enabled: Boolean(id),
  });
}

export function useInvestigationSummary(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id as Uuid).concat('summary'),
    queryFn: () => getInvestigationSummary(id as Uuid),
    enabled: Boolean(id),
  });
}

export function useInvestigationEntities(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.entities(id as Uuid),
    queryFn: () => listEntitiesForInvestigation(id as Uuid),
    enabled: Boolean(id),
  });
}

export function useInvestigationRelationships(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.relationships(id as Uuid),
    queryFn: () => listRelationshipsForInvestigation(id as Uuid),
    enabled: Boolean(id),
  });
}

export function useInvestigationFindings(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.findings(id as Uuid),
    queryFn: () => listFindingsForInvestigation(id as Uuid),
    enabled: Boolean(id),
  });
}

export function useInvestigationEvidence(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.evidence(id as Uuid),
    queryFn: () => listEvidenceForInvestigation(id as Uuid),
    enabled: Boolean(id),
  });
}

export function useInvestigationEvents(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.events(id as Uuid),
    queryFn: () => listEventsForInvestigation(id as Uuid),
    enabled: Boolean(id),
  });
}

export function useInvestigationNotes(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.notes(id as Uuid),
    queryFn: () => listNotesForInvestigation(id as Uuid),
    enabled: Boolean(id),
  });
}

export function useInvestigationTimeline(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.timeline(id as Uuid),
    queryFn: () => getTimeline(id as Uuid),
    enabled: Boolean(id),
  });
}

export function useNetworkGraph(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.graph(id as Uuid),
    queryFn: () => getNetworkGraph(id as Uuid),
    enabled: Boolean(id),
  });
}

export function useNetworkAnalytics(id: Uuid | undefined) {
  return useQuery({
    queryKey: KEYS.analytics(id as Uuid),
    queryFn: () => getNetworkAnalytics(id as Uuid),
    enabled: Boolean(id),
  });
}
