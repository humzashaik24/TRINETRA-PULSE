'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/state/app.store';
import { Sparkles } from 'lucide-react';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { WorkspacePlaceholder } from '@/components/shell/workspace-placeholder';

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
      <WorkspacePlaceholder
        icon={Sparkles}
        accentClassName="bg-anomaly-subtle text-anomaly"
        title="Pattern Detection"
        description="AI-powered pattern recognition across communication, financial, and movement data."
      />
    </div>
  );
}