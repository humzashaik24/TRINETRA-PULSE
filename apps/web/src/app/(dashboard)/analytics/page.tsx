'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/state/app.store';
import { BarChart3 } from 'lucide-react';
import { Button, EmptyState } from '@trinetra-pulse/ui';
import { WorkspaceHeader } from '@/components/shell/workspace-header';

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
      <EmptyState
        icon={<BarChart3 className="h-8 w-8" />}
        title="No investigation data yet"
        description="Analytics require network data. Ingest investigation data to generate analytical insights."
        action={
          <Link href="/data-intelligence">
            <Button variant="primary" size="sm">Ingest Data</Button>
          </Link>
        }
        className="rounded-lg border border-border bg-surface"
      />
    </div>
  );
}