'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileSearch, Layers, Network, Clock, ShieldCheck, CircleGauge } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger, LoadingState } from '@trinetra-pulse/ui';
import { useEvidenceStore } from '@/state/evidence.store';
import { EvidenceSearchBar } from './evidence-search-bar';
import { EvidenceListRow } from './evidence-list-row';
import { EvidenceDetailPanel } from './evidence-detail-panel';
import { EvidenceCoveragePanel } from './evidence-coverage-panel';
import { RelationshipEvidenceSupportList } from './support/relationship-evidence-support-list';
import { FindingEvidenceSupportList } from './support/finding-evidence-support-list';
import { NetworkEvidenceMode } from './network/network-evidence-mode';
import { TimelineEvidenceMode } from './timeline/timeline-evidence-mode';
import { EvidenceRetrievalPanel } from './retrieval/evidence-retrieval-panel';
import { mockEvidenceById } from '@/mock';
import { isMockData } from '@/lib/api/config';
import { DEMO_INVESTIGATION_ID as JOURNEY_DEMO_INVESTIGATION_ID } from '@/navigation/journey';
import {
  OPERATION_MERIDIAN_ID,
  OPERATION_MERIDIAN_EVIDENCE_001,
} from '@/lib/api/evidence';
import type { EvidenceType, EvidenceStatus } from '@trinetra-pulse/types';

// ============================================================
// EVIDENCE INTELLIGENCE WORKSPACE (Phase 12 / 17.6)
// ============================================================
// Evidence Repository + Grounded Retrieval + Coverage + Modes.
// Evidence items/looks reference canonical IDs only (invariant).
// Coverage "unsupported" = no linked evidence currently available.
// Phase 17.6 — in API mode the workspace anchors on the Operation
// Meridian uuid seeded into the relational database; in mock mode it
// keeps the canonical demo id. No silent fallback between modes.
// ============================================================

/** Investigation id the Evidence Workspace demonstrates: canonical demo id
 *  in mock mode, the deterministic Operation Meridian uuid in API mode. */
const DEMO_INVESTIGATION_ID = isMockData()
  ? JOURNEY_DEMO_INVESTIGATION_ID
  : OPERATION_MERIDIAN_ID;

/** Demo evidence to open from the empty detail state: canonical Nexus mock id
 *  in mock mode, the deterministic seeded evidence row in API mode. */
const DEMO_EVIDENCE_ID = isMockData() ? 'ev-nexus-001' : OPERATION_MERIDIAN_EVIDENCE_001;

export function EvidenceWorkspace() {
  const {
    investigationId,
    setInvestigationId,
    items,
    selectedItem,
    selectedItemId,
    loading,
    error,
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    clearFilters,
    selectItem,
    coverage,
    fetchCoverage,
    fetchRelationshipSupport,
    fetchFindingSupport,
    fetchCollections,
  } = useEvidenceStore();

  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('repository');

  // Title lookup for coverage chips: prefer persisted-sourced items from the
  // current scope, fall back to the deterministic mock universe for demo ids.
  const evidenceById = useMemo(() => {
    const map = new Map<string, { title: string }>();
    for (const item of items) map.set(item.id, { title: item.title });
    if (isMockData()) {
      for (const [id, item] of mockEvidenceById) map.set(id, { title: item.title });
    }
    return map;
  }, [items]);

  useEffect(() => {
    setInvestigationId(DEMO_INVESTIGATION_ID);
    void fetchCoverage();
    void fetchRelationshipSupport();
    void fetchFindingSupport();
    void fetchCollections();
  }, [setInvestigationId, fetchCoverage, fetchRelationshipSupport, fetchFindingSupport, fetchCollections]);

  const toggleType = (t: EvidenceType) => {
    const current = filters.evidenceTypes ?? [];
    setFilters({
      evidenceTypes: current.includes(t)
        ? current.filter((x) => x !== t)
        : [...current, t],
    });
  };

  const toggleStatus = (s: EvidenceStatus) => {
    const current = filters.statuses ?? [];
    setFilters({
      statuses: current.includes(s)
        ? current.filter((x) => x !== s)
        : [...current, s],
    });
  };

  const hasFilters = searchQuery !== '' || (filters.evidenceTypes?.length ?? 0) > 0 || (filters.statuses?.length ?? 0) > 0;

  return (
    <Tabs defaultValue="repository" value={activeTab} onValueChange={setActiveTab}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="repository">
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Repository
          </TabsTrigger>
          <TabsTrigger value="coverage">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Coverage
          </TabsTrigger>
          <TabsTrigger value="support">
            <FileSearch className="mr-1.5 h-3.5 w-3.5" />
            Support
          </TabsTrigger>
          <TabsTrigger value="retrieval">
            <CircleGauge className="mr-1.5 h-3.5 w-3.5" />
            Retrieval
          </TabsTrigger>
          <TabsTrigger value="network">
            <Network className="mr-1.5 h-3.5 w-3.5" />
            Network
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
        </TabsList>
        {investigationId && (
          <span className="font-mono text-[10px] text-foreground-muted">{investigationId}</span>
        )}
      </div>

      <div className="mt-4">
        <TabsContent value="repository" className="focus:outline-none">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
            <div className="space-y-3">
              <EvidenceSearchBar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                selectedTypes={filters.evidenceTypes ?? []}
                onToggleType={toggleType}
                selectedStatuses={filters.statuses ?? []}
                onToggleStatus={toggleStatus}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters((s) => !s)}
                onClear={clearFilters}
              />

              {error && (
                <p className="rounded-lg border border-danger/30 bg-danger-subtle p-3 text-xs text-danger" data-testid="evidence-error">
                  {error}
                </p>
              )}

              {loading && items.length === 0 ? (
                <LoadingState message="Loading evidence…" />
              ) : (
                <div className="space-y-2" data-testid="evidence-list">
                  {items.map((e) => (
                    <EvidenceListRow
                      key={e.id}
                      evidence={e}
                      selected={selectedItemId === e.id}
                      onSelect={selectItem}
                    />
                  ))}
                  {items.length === 0 && !loading && (
                    <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-foreground-muted">
                      No evidence matches your filters.
                    </p>
                  )}
                </div>
              )}

              {hasFilters && (
                <p className="text-[10px] text-foreground-muted">
                  {items.length} result{items.length === 1 ? '' : 's'} for current filters
                </p>
              )}
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
              {selectedItem ? (
                <EvidenceDetailPanel evidence={selectedItem} />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
                  <FileSearch className="mx-auto h-6 w-6 text-foreground-muted" />
                  <p className="mt-2 text-sm text-foreground-muted">Select an evidence item to view its provenance and links.</p>
                  <button
                    onClick={() => selectItem(DEMO_EVIDENCE_ID)}
                    className="mt-3 text-xs text-evidence hover:underline"
                  >
                    Try opening a demo item
                  </button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="coverage" className="focus:outline-none">
          <EvidenceCoveragePanel
            coverage={coverage}
            evidenceById={evidenceById}
            onSelectEvidence={selectItem}
          />
        </TabsContent>

        <TabsContent value="support" className="focus:outline-none">
          <div className="space-y-6">
            <RelationshipEvidenceSupportList />
            <FindingEvidenceSupportList />
          </div>
        </TabsContent>

        <TabsContent value="retrieval" className="focus:outline-none">
          <EvidenceRetrievalPanel />
        </TabsContent>

        <TabsContent value="network" className="focus:outline-none">
          <NetworkEvidenceMode onSelectEvidence={selectItem} />
        </TabsContent>

        <TabsContent value="timeline" className="focus:outline-none">
          <TimelineEvidenceMode onSelectEvidence={selectItem} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
