'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/state/app.store';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { EvidenceWorkspace } from '@/components/evidence/evidence-workspace';
import { DemoDataIndicator } from '@/components/investigation/demo-data-indicator';

export default function EvidencePage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  useEffect(() => {
    setContextLabel('Evidence');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="INTELLIGENCE WORKSPACE"
        title="Evidence Intelligence"
        description="Grounded evidence repository, provenance, coverage, and AI retrieval for Operation Meridian"
        actions={<DemoDataIndicator />}
      />
      <EvidenceWorkspace />
    </div>
  );
}
