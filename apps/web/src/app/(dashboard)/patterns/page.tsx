'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/state/app.store';
import { Sparkles } from 'lucide-react';
import { Button, EmptyState } from '@trinetra-pulse/ui';
import { WorkspaceHeader } from '@/components/shell/workspace-header';

export default function PatternsPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  useEffect(() => {
    setContextLabel('Patterns');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="Patterns"
        description="Detect and analyze behavioral and network patterns"
      />
      <EmptyState
        icon={<Sparkles className="h-8 w-8" />}
        title="No investigation data yet"
        description="Patterns become available once investigation data is ingested into the network."
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