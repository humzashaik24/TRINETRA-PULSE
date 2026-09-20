'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/state/app.store';
import { useInvestigationStore } from '@/state/investigation.store';
import { useJourneyFocus } from '@/hooks/use-journey-focus';
import { chromeText, useChromeLanguage } from '@/lib/i18n';
import { isMockData } from '@/lib/api/config';
import { DEMO_INVESTIGATION_ID, DEMO_NETWORK_ID } from '@/navigation/journey';
import { useCanvasStore } from './canvas-store';
import { buildCanonicalNodesAndEdges } from './canvas-builders';
import { CanvasToolbar } from './canvas-toolbar';
import { GraphCanvas } from './canvas-graph';
import { NodeInspector } from './node-inspector';
import { EdgeEditor } from './edge-editor';
import { AiPanel } from './ai-panel';
import { ImportModal } from './import-modal';
import { SettingsPanel } from './settings-panel';
import { NetworkView } from './views/network-view';
import { DirectionsView } from './views/directions-view';
import { ReportView } from './views/report-view';
import { LegalView } from './views/legal-view';
import { AuditView } from './views/audit-view';
import { VisualizationView } from './views/visualization-view';

// ============================================================
// KNOWLEDGE CANVAS — FULL WORKSPACE
// ============================================================
// The dedicated Canvas application, entered from the gateway. It loads the
// current investigation through the authoritative Trinetra
// investigation store (mock / API), seeds the visual layer from canonical
// objects, and composes the professional canvas workplace: toolbar, graph,
// inspector, AI panel, import and settings plus the analytical views.
// ============================================================

function CanvasRightDrawer({
  investigationId,
  disabled,
  loaded,
}: {
  investigationId: string;
  disabled: boolean;
  loaded: boolean;
}) {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const aiOpen = useCanvasStore((s) => s.aiOpen);
  const rightDrawerTab = useCanvasStore((s) => s.rightDrawerTab);
  const setRightDrawerTab = useCanvasStore((s) => s.setRightDrawerTab);
  const setAiOpen = useCanvasStore((s) => s.setAiOpen);
  const selectNode = useCanvasStore((s) => s.selectNode);

  const hasSelection = Boolean(selectedNodeId);

  if (!hasSelection && !aiOpen) return null;

  const showTabs = hasSelection && aiOpen;
  const activeTab = showTabs
    ? rightDrawerTab
    : hasSelection
      ? 'inspector'
      : 'ai';

  return (
    <div className="absolute top-3 right-3 bottom-3 z-20 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 pointer-events-none">
      {showTabs && (
        <div className="pointer-events-auto flex items-center justify-between rounded-lg border border-border bg-surface p-1 shadow-md font-mono text-xs">
          <button
            type="button"
            onClick={() => setRightDrawerTab('inspector')}
            className={
              'flex-1 rounded-md py-1 text-center font-medium transition-colors ' +
              (activeTab === 'inspector'
                ? 'bg-surface-active text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground')
            }
          >
            Inspector
          </button>
          <button
            type="button"
            onClick={() => setRightDrawerTab('ai')}
            className={
              'flex-1 rounded-md py-1 text-center font-medium transition-colors ' +
              (activeTab === 'ai'
                ? 'bg-surface-active text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground')
            }
          >
            AI Investigator
          </button>
          <button
            type="button"
            onClick={() => {
              selectNode(null);
              setAiOpen(false);
            }}
            className="px-2 text-foreground-muted hover:text-foreground"
            title="Close Drawer"
          >
            ×
          </button>
        </div>
      )}

      {activeTab === 'inspector' && hasSelection && <NodeInspector />}
      {activeTab === 'ai' && aiOpen && (
        <AiPanel disabled={disabled} investigationId={investigationId} loaded={loaded} />
      )}
    </div>
  );
}

export function CanvasWorkspace() {
  const lang = useChromeLanguage();
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const { payload } = useJourneyFocus();

  const investigationId = payload.investigation ?? DEMO_INVESTIGATION_ID;

  const data = useInvestigationStore((s) => s.data);
  const invLoading = useInvestigationStore((s) => s.loading);
  const invError = useInvestigationStore((s) => s.error);
  const loadInvestigation = useInvestigationStore((s) => s.loadInvestigation);

  const tab = useCanvasStore((s) => s.tab);
  const loaded = useCanvasStore((s) => s.loaded);
  const [seededId, setSeededId] = useState<string | null>(null);

  useEffect(() => {
    setContextLabel(chromeText(lang, 'Knowledge Canvas'));
    return () => setContextLabel(null);
  }, [setContextLabel, lang]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const store = useCanvasStore.getState();
      store.setLoading(true);
      store.setInvestigation(investigationId, null);
      try {
        await loadInvestigation(investigationId);
      } catch {
        // loadInvestigation records the error in the investigation store.
      }
      if (cancelled) return;
      const current = useInvestigationStore.getState().data;
      const networkId =
        current.networks[0]?.network_id ??
        (isMockData() ? DEMO_NETWORK_ID : investigationId);
      if (seededId === investigationId) return;
      const { nodes, edges } = buildCanonicalNodesAndEdges(current);
      useCanvasStore.getState().seedFromInvestigation({
        investigationId,
        networkId,
        dataSource: isMockData() ? 'demo' : 'persisted',
        nodes,
        edges,
      });
      setSeededId(investigationId);
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investigationId]);

  const title =
    data.investigation?.title ??
    (investigationId === DEMO_INVESTIGATION_ID
      ? 'Operation Trinetra Nexus'
      : 'Investigation');

  if (invError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-body text-foreground-muted">Could not load the investigation.</p>
        <p className="max-w-md text-caption text-danger">{invError}</p>
      </div>
    );
  }

  return (
    <div data-testid="canvas-workspace" className="flex h-full min-h-[70vh] flex-col">
      <CanvasToolbar title={title} />
      <main className="relative flex-1 overflow-hidden">
        {tab === 'graph' && (
          <ReactFlowProvider>
            <GraphCanvas />
            <CanvasRightDrawer
              disabled={invLoading}
              investigationId={investigationId}
              loaded={loaded}
            />
            <EdgeEditor />
          </ReactFlowProvider>
        )}
        {!invLoading && tab !== 'graph' && (
          <div className="h-full overflow-auto p-6 lg:p-8">
            {tab === 'network' && <NetworkView />}
            {tab === 'directions' && <DirectionsView />}
            {tab === 'report' && <ReportView />}
            {tab === 'legal' && <LegalView />}
            {tab === 'visualization' && <VisualizationView />}
            {tab === 'audit' && <AuditView />}
            {tab === 'settings' && <SettingsPanel mode="inline" />}
          </div>
        )}
        <ImportModal />
        <SettingsPanel mode="overlay" />
      </main>
    </div>
  );
}