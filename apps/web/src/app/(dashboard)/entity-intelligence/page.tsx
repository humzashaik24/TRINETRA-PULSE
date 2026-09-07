'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/state/app.store';
import { EntityIntelligenceHeader } from '@/components/entity-intelligence';
import {
  AuditTrail,
  CandidateReview,
  ExtractionJobs,
  ResolutionReview,
} from '@/components/entity-intelligence';
import { Panel, Tabs, TabsContent, TabsList, TabsTrigger } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';

export default function EntityIntelligencePage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  useEffect(() => {
    setContextLabel('Entity Intelligence');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EntityIntelligenceHeader
        title="Entity Intelligence"
        description="Extraction pipeline, candidate review, and resolution management"
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs defaultValue="extraction">
          <TabsList>
            <TabsTrigger value="extraction">Extraction</TabsTrigger>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="resolutions">Resolutions</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="extraction">
              <Panel header={<PanelHeader title="Extraction jobs" description="Import datasets and run the extraction pipeline." />}>
                <ExtractionJobs />
              </Panel>
            </TabsContent>

            <TabsContent value="candidates">
              <Panel header={<PanelHeader title="Candidate review" description="Accept or reject extraction candidates before they resolve to entities." />}>
                <CandidateReview />
              </Panel>
            </TabsContent>

            <TabsContent value="resolutions">
              <Panel header={<PanelHeader title="Resolution review" description="Confirm candidate matches, merge profiles, or reject spurious links." />}>
                <ResolutionReview />
              </Panel>
            </TabsContent>

            <TabsContent value="audit">
              <Panel header={<PanelHeader title="Audit trail" description="Every mutation in the entity pipeline, time-ordered." />}>
                <AuditTrail />
              </Panel>
            </TabsContent>
          </div>
        </Tabs>
      </motion.div>
    </div>
  );
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="text-subheading text-foreground">{title}</div>
      <div className="text-body-sm text-foreground-muted mt-0.5">{description}</div>
    </div>
  );
}