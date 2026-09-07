'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/state/app.store';
import { useShellStore } from '@/state/shell.store';
import { useInvestigationStore } from '@/state/investigation.store';
import { InvestigationShell } from '@/components/shell/investigation-shell';
import { LoadingState, ErrorState, Badge } from '@trinetra-pulse/ui';
import { InvestigationOverview } from '@/components/investigation/investigation-overview';
import { InvestigationNetworkTab } from '@/components/investigation/investigation-network-tab';
import { InvestigationEntitiesTab } from '@/components/investigation/investigation-entities-tab';
import { InvestigationEvidenceTab } from '@/components/investigation/investigation-evidence-tab';
import { InvestigationTimelineTab } from '@/components/investigation/investigation-timeline-tab';
import { InvestigationFindingsTab } from '@/components/investigation/investigation-findings-tab';
import { InvestigationNotesTab } from '@/components/investigation/investigation-notes-tab';
import { InvestigationActivityTab } from '@/components/investigation/investigation-activity-tab';
import { InvestigationOperationsTab } from '@/components/investigation/investigation-operations-tab';
import { InvestigationDataTab } from '@/components/investigation/investigation-data-tab';
import { InvestigationSwitcher } from '@/components/investigation/investigation-switcher';
import { DemoDataIndicator } from '@/components/investigation/demo-data-indicator';

// ============================================================
// INVESTIGATION WORKSPACE — DETAIL
// ============================================================
// Hosts the investigation workspace shell and drives its tab set.
// Header + tabs come from the shared InvestigationShell; each tab
// renders a dedicated panel. Tab switching is workspace-scoped
// state (no nested routes). Unsaved (dirty) edits warn before the
// tab is closed or the page is left.
// ============================================================

interface PageProps {
  params: { id: string };
}

interface TabProps {
  onOpenTab: (tab: string) => void;
}

const TAB_COMPONENTS: Record<string, (props: TabProps) => React.ReactElement> = {
  overview: ({ onOpenTab }) => <InvestigationOverviewTab onOpenTab={onOpenTab} />,
  network: () => <InvestigationNetworkTab />,
  entities: () => <InvestigationEntitiesTab />,
  evidence: () => <InvestigationEvidenceTab />,
  timeline: () => <InvestigationTimelineTab />,
  findings: () => <InvestigationFindingsTab />,
  notes: () => <InvestigationNotesTab />,
  activity: () => <InvestigationActivityTab />,
  operations: () => <InvestigationOperationsTab />,
  data: () => <InvestigationDataTab />,
};

export default function InvestigationDetailPage({ params }: PageProps) {
  const id = params.id;
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const clearContext = useShellStore((s) => s.clearContext);

  const loadInvestigation = useInvestigationStore((s) => s.loadInvestigation);
  const clear = useInvestigationStore((s) => s.clear);
  const data = useInvestigationStore((s) => s.data);
  const loading = useInvestigationStore((s) => s.loading);
  const error = useInvestigationStore((s) => s.error);
  const dirty = useInvestigationStore((s) => s.dirty);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'overview';
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab && TAB_COMPONENTS[tab] ? tab : 'overview';
  });

  useEffect(() => {
    setContextLabel('Investigation');
    // Selections made inside the previous investigation (inspector,
    // graph focus, etc.) must not leak into the newly opened one.
    clearContext();
    void loadInvestigation(id);
    return () => {
      setContextLabel(null);
      clear();
    };
  }, [id, setContextLabel, clearContext, loadInvestigation, clear]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (loading || !data.investigation) {
    return (
      <div className="p-6 lg:p-8">
        <LoadingState message="Loading investigation…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState
          title="Could not load investigation"
          message={error}
          retry={() => void loadInvestigation(id)}
        />
      </div>
    );
  }

  const inv = data.investigation;

  const tabComponent = TAB_COMPONENTS[activeTab] ?? TAB_COMPONENTS.overview;
  const render = () => tabComponent({ onOpenTab: setActiveTab });

  return (
    <InvestigationShell
      caseId={id}
      title={inv.title}
      eyebrow="INVESTIGATION WORKSPACE"
      description={inv.description ?? undefined}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={
        <>
          <DemoDataIndicator />
          <InvestigationSwitcher currentId={id} />
          {dirty ? (
            <Badge variant="warning" size="sm" data-testid="dirty-indicator">
              Unsaved changes
            </Badge>
          ) : undefined}
        </>
      }
    >
      <div className="p-5 lg:p-6">{render()}</div>
    </InvestigationShell>
  );
}

function InvestigationOverviewTab({ onOpenTab }: TabProps) {
  const investigation = useInvestigationStore((s) => s.data.investigation);
  if (!investigation) return null;
  return <InvestigationOverview investigation={investigation} onOpenTab={onOpenTab} />;
}
