/**
 * Mock-mode dashboard view builder.
 *
 * Assembles ``DashboardViewData`` from the existing ``@/mock`` fixtures so
 * the Intelligence Overview renders exactly as it did before Phase B —
 * byte-identical output. This builder is the ONLY place outside the widget
 * fixtures that imports ``@/mock`` *dashboard* slices; the API path lives in
 * ``view.ts`` / ``layout.ts`` and never touches demo data.
 */

import type { DashboardViewData } from './view';
import { dashboardMetrics } from '@/mock/metrics';
import { dashboardNetwork } from '@/mock/network';
import { presentationRecentIntelligenceFindings } from '@/mock/findings';
import { importantEntities } from '@/mock/entities';
import { presentationPatterns } from '@/mock/patterns';
import { investigationActivity } from '@/mock/activity';
import { activitySeries } from '@/mock/activity-series';
import { mockInvestigations } from '@/mock/investigations';
import { isPresentationInvestigation } from '@/mock/investigations';
import { mockReviewByInvestigation } from '@/mock/investigation-operations';
import { nexusInvestigationRecord } from '@/mock/nexus-dataset';
import { DEMO_INVESTIGATION_ID, DEMO_NETWORK_ID } from '@/navigation/journey';
import type { ActiveInvestigationSummary } from './view';

/** Open-case rows — identical selection + review counts to the legacy
 *  ActiveInvestigations widget logic. */
function activeInvestigations(): ActiveInvestigationSummary[] {
  return mockInvestigations
    .filter((i) => i.status !== 'closed' && i.status !== 'archived' && isPresentationInvestigation(i.id))
    .map((inv) => ({
      id: inv.id,
      title: inv.title,
      status: inv.status,
      lead_investigator: inv.lead_investigator,
      reviewCount: (mockReviewByInvestigation[inv.id] ?? []).filter((r) => !r.resolved).length,
    }));
}

export function buildMockDashboardView(): DashboardViewData {
  const record = nexusInvestigationRecord;
  return {
    meta: {
      investigationId: DEMO_INVESTIGATION_ID,
      networkId: DEMO_NETWORK_ID,
      investigationTitle: record.investigation.title,
      investigationStatus: record.investigation.status,
      description: record.investigation.description ?? '',
      isDemo: true,
    },
    metrics: dashboardMetrics,
    network: dashboardNetwork,
    recentFindings: presentationRecentIntelligenceFindings,
    importantEntities,
    patterns: presentationPatterns,
    activity: investigationActivity,
    activitySeries,
    activeInvestigations: activeInvestigations(),
  };
}