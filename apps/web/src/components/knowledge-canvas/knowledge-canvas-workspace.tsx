'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/state/app.store';
import { useJourneyFocus } from '@/hooks/use-journey-focus';
import { chromeText, useChromeLanguage } from '@/lib/i18n';
import { DEMO_INVESTIGATION_ID, DEMO_NETWORK_ID } from '@/navigation/journey';
import { mockInvestigationById } from '@/mock/investigations';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@trinetra-pulse/ui';
import { CdrView } from './cdr-view';
import { NetworkView } from './network-view';
import { ReportView } from './report-view';
import { LegalResearchView } from './legal-research-view';

// ============================================================
// KNOWLEDGE CANVAS — WORKSPACE
// ============================================================
// The integration workspace for the approved knowledge-canvas
// capabilities. Hosts the four Tier-1 capabilities:
//   1. CDR/CSV  -> Phone/Account network expansion (live)
//   2. Network  -> live graph preview of the expanded network
//   3. Report   -> report with integrity ledger + centrality (live)
//   4. Legal    -> offline legal research assistant (live)
// Uses the shared journey contract (?i=investigation, ?section=tab)
// so the demo can deep-link into any capability.
// ============================================================

export type CanvasTab = 'cdr' | 'network' | 'report' | 'legal';

const VALID_TABS: CanvasTab[] = ['cdr', 'network', 'report', 'legal'];

interface KnowledgeCanvasWorkspaceProps {
  networkId?: string;
}

export function KnowledgeCanvasWorkspace({ networkId }: KnowledgeCanvasWorkspaceProps) {
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const lang = useChromeLanguage();
  const { payload } = useJourneyFocus();

  const investigationId = payload.investigation ?? DEMO_INVESTIGATION_ID;
  const actualNetworkId = networkId ?? DEMO_NETWORK_ID;
  const initialTab: CanvasTab = VALID_TABS.includes(payload.section as CanvasTab)
    ? (payload.section as CanvasTab)
    : 'cdr';

  const [tab, setTab] = useState<CanvasTab>(initialTab);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setContextLabel(chromeText(lang, 'Knowledge Canvas'));
    return () => setContextLabel(null);
  }, [setContextLabel, lang]);

  const investigation = mockInvestigationById.get(investigationId);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-display-sm font-bold text-foreground">
              {chromeText(lang, 'Knowledge Canvas')}
            </h1>
            <p className="text-body text-foreground-muted mt-1">
              {chromeText(
                lang,
                'Expand, report and research the investigation from raw communication data.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <span className="text-caption text-foreground-secondary font-mono uppercase">
              {investigationId.toUpperCase()}
            </span>
            <span className="text-caption text-foreground-muted">
              {investigation?.investigation.title ?? 'Operation Meridian'}
            </span>
          </div>
        </div>
      </motion.div>

      <Tabs value={tab} defaultValue={tab} onValueChange={(v) => setTab(v as CanvasTab)}>
        <TabsList>
          <TabsTrigger value="cdr">{chromeText(lang, 'CDR / CSV')}</TabsTrigger>
          <TabsTrigger value="network">{chromeText(lang, 'Network')}</TabsTrigger>
          <TabsTrigger value="report">{chromeText(lang, 'Report')}</TabsTrigger>
          <TabsTrigger value="legal">{chromeText(lang, 'Legal Research')}</TabsTrigger>
        </TabsList>

        <TabsContent value="cdr" className="mt-4">
          <CdrView
            networkId={actualNetworkId}
            investigationId={investigationId}
            onExpanded={() => setReloadKey((k) => k + 1)}
          />
        </TabsContent>

        <TabsContent value="network" className="mt-4">
          <NetworkView
            networkId={actualNetworkId}
            investigationId={investigationId}
            reloadKey={reloadKey}
          />
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <ReportView investigationId={investigationId} networkId={actualNetworkId} />
        </TabsContent>

        <TabsContent value="legal" className="mt-4">
          <LegalResearchView investigationId={investigationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}