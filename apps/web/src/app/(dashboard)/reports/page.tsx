'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/state/app.store';
import { FileText } from 'lucide-react';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { WorkspacePlaceholder } from '@/components/shell/workspace-placeholder';

export default function ReportsPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  useEffect(() => {
    setContextLabel('Reports');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="Reports"
        description="Generate and manage investigation reports"
      />
      <WorkspacePlaceholder
        icon={FileText}
        accentClassName="bg-surface-elevated text-foreground-muted"
        title="Report Generator"
        description="Create structured investigation reports with evidence, findings, and entity summaries."
      />
    </div>
  );
}