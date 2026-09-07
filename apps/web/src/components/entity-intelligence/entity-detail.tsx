'use client';

import type {
  EntityActivityItem,
  EntityEvent,
  EntityEvidenceItem,
  EntityIntelligence,
  EntityIntelligenceSummary,
  EntityRelationship,
  EntityResolutionCandidate,
  ResolutionHistoryEntry,
  RelatedEntity,
} from '@trinetra-pulse/types';
import type { EntitySourceRef } from '@/services/entity.service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@trinetra-pulse/ui';
import { EntityOverview } from './entity-overview';
import { EntityRelationships } from './entity-relationships';
import { EntityEvidence } from './entity-evidence';
import { EntityEvents } from './entity-events';
import { EntityActivity } from './entity-activity';
import { EntitySources } from './entity-sources';
import { EntityResolutionSection } from './entity-resolution-section';

// ============================================================
// ENTITY DETAIL — tabbed body
// ============================================================

export interface EntityDetailBundle {
  entity: EntityIntelligence;
  summary: EntityIntelligenceSummary;
  relationships: EntityRelationship[];
  related: RelatedEntity[];
  evidence: EntityEvidenceItem[];
  events: EntityEvent[];
  activity: EntityActivityItem[];
  sources: EntitySourceRef[];
  resolutionHistory: ResolutionHistoryEntry[];
  resolutions: EntityResolutionCandidate[];
}

interface EntityDetailProps extends EntityDetailBundle {
  onNavigate?: (entityId: string) => void;
  onConfirmResolution?: (entityId: string, reason: string) => Promise<void>;
  onRejectResolution?: (entityId: string, reason: string) => Promise<void>;
  onEvaluateResolutions?: () => Promise<void>;
}

export function EntityDetail({
  entity,
  relationships,
  evidence,
  events,
  activity,
  sources,
  resolutionHistory,
  resolutions,
  onNavigate,
  onConfirmResolution,
  onRejectResolution,
  onEvaluateResolutions,
}: EntityDetailProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="relationships">
          Relationships
          <CountBadge count={relationships.length} />
        </TabsTrigger>
        <TabsTrigger value="evidence">
          Evidence
          <CountBadge count={evidence.length} />
        </TabsTrigger>
        <TabsTrigger value="events">
          Events
          <CountBadge count={events.length} />
        </TabsTrigger>
        <TabsTrigger value="resolution">
          Identity
          <CountBadge count={resolutions.length} />
        </TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="sources">Sources</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <EntityOverview entity={entity} />
      </TabsContent>

      <TabsContent value="relationships">
        <EntityRelationships relationships={relationships} focusEntityId={entity.id} onNavigate={onNavigate} />
      </TabsContent>

      <TabsContent value="evidence">
        <EntityEvidence evidence={evidence} />
      </TabsContent>

      <TabsContent value="events">
        <EntityEvents events={events} />
      </TabsContent>

      <TabsContent value="resolution">
        <EntityResolutionSection
          entityId={entity.id}
          candidates={resolutions}
          onConfirm={onConfirmResolution ?? (async () => {})}
          onReject={onRejectResolution ?? (async () => {})}
          onEvaluate={onEvaluateResolutions ?? (async () => {})}
        />
      </TabsContent>

      <TabsContent value="activity">
        <EntityActivity activity={activity} resolutionHistory={resolutionHistory} />
      </TabsContent>

      <TabsContent value="sources">
        <EntitySources sources={sources} />
      </TabsContent>
    </Tabs>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-surface-elevated px-1 text-[10px] font-medium text-foreground-muted tabular-nums">
      {count}
    </span>
  );
}