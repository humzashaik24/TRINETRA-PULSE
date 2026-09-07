'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/state/app.store';
import { BrainCircuit } from 'lucide-react';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { WorkspacePlaceholder } from '@/components/shell/workspace-placeholder';

export default function AIAssistantPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  useEffect(() => {
    setContextLabel('AI Assistant');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="AI Assistant"
        description="AI-powered investigation assistant"
      />
      <WorkspacePlaceholder
        icon={BrainCircuit}
        accentClassName="bg-ai-subtle text-ai"
        title="Intelligence Assistant"
        description="Ask questions about your investigation data. Get insights, summaries, and recommendations powered by AI."
      />
    </div>
  );
}