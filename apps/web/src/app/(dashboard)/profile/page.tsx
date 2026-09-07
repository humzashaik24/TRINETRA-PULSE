'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/state/app.store';
import { CircleUserRound } from 'lucide-react';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { WorkspacePlaceholder } from '@/components/shell/workspace-placeholder';

export default function ProfilePage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  useEffect(() => {
    setContextLabel('User');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="User Profile"
        description="Account and access management"
      />
      <WorkspacePlaceholder
        icon={CircleUserRound}
        accentClassName="bg-surface-elevated text-foreground-muted"
        title="Profile"
        description="Account details and notification preferences will live here."
      />
    </div>
  );
}