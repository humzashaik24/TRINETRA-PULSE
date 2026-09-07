'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/state/app.store';
import { Settings } from 'lucide-react';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { WorkspacePlaceholder } from '@/components/shell/workspace-placeholder';

export default function SettingsPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  useEffect(() => {
    setContextLabel('Settings');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="Settings"
        description="Workspace and application preferences"
      />
      <WorkspacePlaceholder
        icon={Settings}
        accentClassName="bg-surface-elevated text-foreground-muted"
        title="Settings"
        description="Workspace, data and platform configuration will live here."
      />
    </div>
  );
}