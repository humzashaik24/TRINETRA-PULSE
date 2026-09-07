'use client';

import React from 'react';
import {
  LayoutGrid,
  Network,
  Users,
  Clock3,
  FileSearch,
  Sparkles,
  StickyNote,
  Activity,
  Gauge,
  Database,
} from 'lucide-react';
import { WorkspaceHeader } from './workspace-header';
import { WorkspaceTabs } from './workspace-tabs';
import type { WorkspaceTab } from './workspace-tabs';

// ============================================================
// PHASE 3.5 — INVESTIGATION SHELL
// ============================================================
// Foundation for investigation-mode workspaces. Establishes the
// contextual header and the canonical investigation tab set. Pages
// adopt this shell when investigation mode is filled in.
// ============================================================

export const INVESTIGATION_TABS: WorkspaceTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'entities', label: 'Entities', icon: Users },
  { id: 'evidence', label: 'Evidence', icon: FileSearch },
  { id: 'timeline', label: 'Timeline', icon: Clock3 },
  { id: 'findings', label: 'Findings', icon: Sparkles },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'operations', label: 'Operations', icon: Gauge },
  { id: 'data', label: 'Data', icon: Database },
];

export interface InvestigationShellProps {
  caseId?: string;
  title?: string;
  eyebrow?: string;
  description?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function InvestigationShell({
  caseId,
  title,
  eyebrow = 'INVESTIGATION WORKSPACE',
  description,
  activeTab = 'overview',
  onTabChange,
  headerActions,
  children,
}: InvestigationShellProps) {
  return (
    <div className="flex h-full flex-col" data-testid="investigation-shell">
      <div className="shrink-0">
        <WorkspaceHeader
          eyebrow={eyebrow}
          title={title ?? (caseId ? `Case ${caseId}` : 'Investigation')}
          description={description ?? (caseId ? `Contextual workspace for ${caseId}` : undefined)}
          actions={headerActions}
        />
        <WorkspaceTabs items={INVESTIGATION_TABS} activeId={activeTab} onActiveChange={onTabChange} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}