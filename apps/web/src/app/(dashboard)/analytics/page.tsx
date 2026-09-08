'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/state/app.store';
import { BarChart3 } from 'lucide-react';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { WorkspacePlaceholder } from '@/components/shell/workspace-placeholder';

export default function AnalyticsPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  useEffect(() => {
    setContextLabel('Analytics');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="Analytics"
        description="Data analysis and statistical insights"
      />
      <WorkspacePlaceholder
        icon={BarChart3}
        accentClassName="bg-info-subtle text-info"
        title="Analytics Dashboard"
        description="Statistical analysis, trend detection, and intelligence metrics for active investigations."
      />
    </div>
  );
}