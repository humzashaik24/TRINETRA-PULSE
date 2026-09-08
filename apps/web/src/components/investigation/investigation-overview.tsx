'use client';

import { useRouter } from 'next/navigation';
import {
  Users,
  FileSearch,
  GitBranch,
  CalendarClock,
  User as UserIcon,
  Tag,
  Activity as ActivityIcon,
  Network as NetworkIcon,
  Waypoints,
  Clock,
  Sparkles,
  MessageSquareText,
  FileText,
} from 'lucide-react';
import { Badge, Button } from '@trinetra-pulse/ui';
import type { Investigation, EntityType } from '@trinetra-pulse/types';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { useAIStore } from '@/state/ai.store';
import { journeyHref, DEMO_INVESTIGATION_ID, DEMO_NETWORK_ID } from '@/navigation/journey';
import { DemoInvestigationHero } from '@/components/demo/demo-investigation-hero';
import { InvestigationDirectionsSummary } from '@/components/investigation/investigation-directions-summary';

// ============================================================
// PHASE 13 — INVESTIGATION OVERVIEW (COMMAND CENTER)
// ============================================================
// The overview is the investigation's command center: status and
// team summary, quick actions into the network / analytics /
// timeline / findings / AI, and the core linked objects (entities,
// evidence, findings) that can be inspected without navigating
// away. For the demonstration investigation it additionally renders
// a guided step list so a judge never loses their way.
// ============================================================

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  under_review: 'Under Review',
  suspended: 'Suspended',
  closed: 'Closed',
  archived: 'Archived',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
};

function statusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'success';
    case 'under_review':
      return 'warning';
    case 'draft':
    case 'suspended':
      return 'info';
    default:
      return 'default';
  }
}

function priorityVariant(priority: string) {
  switch (priority) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'normal':
      return 'info';
    default:
      return 'default';
  }
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-foreground-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

export interface InvestigationOverviewProps {
  investigation: Investigation;
  /** Switch the workspace tab (network / timeline / findings …). */
  onOpenTab?: (tab: string) => void;
}

export function InvestigationOverview({ investigation, onOpenTab }: InvestigationOverviewProps) {
  const router = useRouter();
  const data = useInvestigationStore((s) => s.data);
  const isDemo = investigation.id === DEMO_INVESTIGATION_ID;

  const networkId = data.networks[0]?.network_id ?? (isDemo ? DEMO_NETWORK_ID : null);

  const openEntity = (id: string, name: string, entityType: string) => {
    useShellStore.getState().selectContext({
      type: 'entity',
      id,
      name,
      entityType: entityType as EntityType,
      investigationId: investigation.id,
    });
  };

  const openEvidence = (evidenceId: string, title: string) => {
    useShellStore.getState().selectContext({
      type: 'evidence',
      id: evidenceId,
      title,
      investigationId: investigation.id,
    });
  };

  const openFinding = (id: string, title: string) => {
    useShellStore.getState().selectContext({
      type: 'finding',
      id,
      title,
      investigationId: investigation.id,
    });
  };

  const goNetworks = (analytics: boolean) => {
    if (!networkId) return;
    const base = analytics ? `/networks/${networkId}/analytics` : `/networks/${networkId}`;
    router.push(journeyHref(base, { investigation: investigation.id }));
  };

  const openTimeline = () => onOpenTab?.('timeline');
  const openFindings = () => onOpenTab?.('findings');

  return (
    <div className="space-y-5" data-testid="investigation-overview">
      {isDemo && <DemoInvestigationHero compact />}

      {/* Status / priority / tags */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(investigation.status)}>
          {STATUS_LABELS[investigation.status]}
        </Badge>
        <Badge variant={priorityVariant(investigation.priority)}>
          {PRIORITY_LABELS[investigation.priority]} priority
        </Badge>
        {investigation.tags.map((t) => (
          <Badge key={t} variant="default">
            <Tag className="mr-1 h-3 w-3" />
            {t}
          </Badge>
        ))}
      </div>

      {/* Counters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={Users} label="Linked entities" value={investigation.entity_count} />
        <Stat icon={GitBranch} label="Relationships" value={investigation.relationship_count} />
        <Stat icon={FileSearch} label="Evidence" value={investigation.evidence_count} />
        <div data-testid="overview-stat-findings">
          <Stat icon={FileText} label="Findings" value={investigation.finding_count ?? data.findings.length} />
        </div>
        <div data-testid="overview-stat-events">
          <Stat
            icon={CalendarClock}
            label="Timeline events"
            value={investigation.event_count ?? data.timeline.filter((t) => t.category === 'event').length}
          />
        </div>
        <Stat icon={ActivityIcon} label="Last activity" value={formatShortDate(investigation.last_activity_at)} />
      </div>

      {/* Available directions (Phase 27) */}
      <InvestigationDirectionsSummary investigationId={investigation.id} onOpenTab={onOpenTab} />

      {/* Quick actions */}
      <section className="rounded-xl border border-border bg-surface p-4" data-testid="overview-quick-actions">
        <h3 className="tp-data-label mb-3">Quick actions</h3>
        <div className="flex flex-wrap gap-2">
          {networkId && (
            <>
              <Button variant="secondary" size="sm" onClick={() => goNetworks(false)} data-testid="overview-action-network">
                <NetworkIcon className="h-3.5 w-3.5" />
                Explore network
              </Button>
              <Button variant="secondary" size="sm" onClick={() => goNetworks(true)} data-testid="overview-action-analytics">
                <Waypoints className="h-3.5 w-3.5" />
                Analyze network
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={openTimeline} data-testid="overview-action-timeline">
            <Clock className="h-3.5 w-3.5" />
            Timeline
          </Button>
          <Button variant="secondary" size="sm" onClick={openFindings} data-testid="overview-action-findings">
            <FileText className="h-3.5 w-3.5" />
            Findings
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => useAIStore.getState().openPanel()}
            data-testid="overview-action-ai"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            Ask AI
          </Button>
        </div>
      </section>

      {/* Linked entities / evidence / findings (inspect in place) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {data.entities.length > 0 && (
          <section className="rounded-xl border border-border bg-surface p-4">
            <h3 className="tp-data-label mb-2">Key entities ({data.entities.length})</h3>
            <ul className="space-y-1">
              {data.entities.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => openEntity(e.entity_id, e.name, e.entity_type)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-hover tp-transition"
                    data-testid="overview-entity"
                  >
                    <span className="truncate font-medium">{e.name}</span>
                    <span className="shrink-0 text-[11px] uppercase text-foreground-muted">{e.role}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.evidence.length > 0 && (
          <section className="rounded-xl border border-border bg-surface p-4">
            <h3 className="tp-data-label mb-2">Recent evidence ({data.evidence.length})</h3>
            <ul className="space-y-1">
              {data.evidence.slice(0, 6).map((ev) => (
                <li key={ev.id}>
                  <button
                    onClick={() => openEvidence(ev.evidence_id, ev.title)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-hover tp-transition"
                    data-testid="overview-evidence"
                  >
                    <span className="truncate font-medium">{ev.title}</span>
                    <span className="shrink-0 text-[11px] uppercase text-foreground-muted">{ev.evidence_type}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.findings.length > 0 && (
          <section className="rounded-xl border border-border bg-surface p-4">
            <h3 className="tp-data-label mb-2">Findings ({data.findings.length})</h3>
            <ul className="space-y-1">
              {data.findings.slice(0, 6).map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => openFinding(f.id, f.title)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-hover tp-transition"
                    data-testid="overview-finding"
                  >
                    <span className="truncate font-medium">{f.title}</span>
                    <Badge size="sm" variant={f.confidence === 'high' ? 'success' : f.confidence === 'medium' ? 'warning' : 'default'}>
                      {f.confidence}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Demo journey guide */}
      {isDemo && (
        <section className="rounded-xl border border-border bg-surface p-4" data-testid="overview-demo-guide">
          <h3 className="tp-data-label mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Demonstration journey
          </h3>
          <ol className="grid gap-2 text-xs text-foreground-secondary sm:grid-cols-2 lg:grid-cols-4">
            <li className="flex gap-2 rounded-lg border border-border bg-surface p-3">
              <span className="font-mono text-brand">1</span>
              <span>Open an entity from the list above to see its intelligence profile in the Context Inspector.</span>
            </li>
            <li className="flex gap-2 rounded-lg border border-border bg-surface p-3">
              <span className="font-mono text-brand">2</span>
              <span>
                Open evidence &amp; click a related entity to follow the link without losing your place.
              </span>
            </li>
            <li className="flex gap-2 rounded-lg border border-border bg-surface p-3">
              <span className="font-mono text-brand">3</span>
              <span>Explore the network — select a node and let the inspector explain its connectivity.</span>
            </li>
            <li className="flex gap-2 rounded-lg border border-border bg-surface p-3">
              <span className="font-mono text-brand">4</span>
              <span>Ask the AI a scoped question; every AI claim stays grounded in this investigation&apos;s evidence.</span>
            </li>
          </ol>
        </section>
      )}

      {/* Description + team */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="tp-data-label mb-2">Description</h3>
          <p className="text-sm leading-relaxed text-foreground-secondary">
            {investigation.description ?? 'No description yet.'}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="tp-data-label mb-3">Team</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground-muted">Lead investigator</dt>
              <dd className="flex items-center gap-1.5 text-foreground">
                <UserIcon className="h-3.5 w-3.5 text-foreground-muted" />
                {investigation.lead_investigator}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground-muted">Assigned</dt>
              <dd className="text-right text-foreground">
                {investigation.assigned.length > 0 ? investigation.assigned.join(', ') : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground-muted">Created</dt>
              <dd className="text-foreground-muted">{formatShortDate(investigation.created_at)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground-muted">Updated</dt>
              <dd className="text-foreground-muted">{formatShortDate(investigation.updated_at)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="flex items-center gap-2 text-xs text-foreground-muted">
        <ActivityIcon className="h-3.5 w-3.5" />
        Summary reflects only objects explicitly linked into this investigation.
      </div>
    </div>
  );
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}