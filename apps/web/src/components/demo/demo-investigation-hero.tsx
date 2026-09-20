'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, FolderSearch, Network, Users, FileSearch, GitBranch, Sparkles } from 'lucide-react';
import { Badge, Button } from '@trinetra-pulse/ui';
import { journeyHref, DEMO_INVESTIGATION_ID, DEMO_NETWORK_ID } from '@/navigation/journey';
import { mockInvestigationById } from '@/mock/investigations';
import { isMockData } from '@/lib/api/config';
import { useDashboardView } from '@/state/dashboard.store';

// ============================================================
// PHASE 13 — DEMO INVESTIGATION HERO
// ============================================================
// The single, deterministic entry point for the SIH
// end-to-end demonstration (Operation Trinetra Nexus,
// INV-DEMO-NEXUS / NET-004). Rendered at the top of the
// Investigations landing page and in the investigation overview
// command center so the demo journey starts exactly where the
// reviewer expects it to.
// ============================================================

export interface DemoInvestigationHeroProps {
  /** Compact mode hides the descriptive copy (used on overview). */
  compact?: boolean;
}

const STATUS_VARIANT: Record<string, string> = {
  active: 'success',
  under_review: 'warning',
};

export function DemoInvestigationHero({ compact = false }: DemoInvestigationHeroProps) {
  const view = useDashboardView();
  const isPresentation = isMockData();
  const record = isPresentation ? mockInvestigationById.get(DEMO_INVESTIGATION_ID) : undefined;
  const inv = isPresentation ? record?.investigation : undefined;

  const entityCount = isPresentation
    ? record?.entities.length ?? 0
    : view?.metrics.entities.value ?? 0;
  const evidenceCount = isPresentation
    ? record?.evidence.length ?? 0
    : view?.metrics.evidenceItems.value ?? 0;
  const relationshipCount = isPresentation
    ? record?.relationships.length ?? 0
    : view?.metrics.relationships.value ?? 0;
  const findingCount = isPresentation
    ? record?.findings.length ?? 0
    : view?.metrics.findings.value ?? 0;

  const heroTitle = inv?.title ?? view?.meta.investigationTitle ?? 'Operation Trinetra Nexus';
  const heroStatus = inv?.status ?? view?.meta.investigationStatus ?? 'active';
  const heroDescription =
    inv?.description ??
    view?.meta.description ??
    'A guided end-to-end walk-through: investigate an active import-operation case, follow its entities, evidence, network and findings — and see the Context Inspector and AI Assistant stay grounded in the same investigation.';

  // Deep-link targets: mock mode uses the canonical demo ids; API mode uses
  // the real backend ids from the dashboard view (kept in-sync with the
  // investigation loaded by the hosting page).
  const heroId = view?.meta.investigationId ?? DEMO_INVESTIGATION_ID;
  const networkId = view?.meta.networkId ?? DEMO_NETWORK_ID;
  const href = journeyHref(`/investigations/${heroId}`);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-surface"
      data-testid="demo-investigation-hero"
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-brand/5 blur-3xl" />

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Badge size="sm" variant="default">
              <Sparkles className="mr-1 h-3 w-3" />
              SIH Demo Investigation
            </Badge>
            <Badge size="sm" variant={(STATUS_VARIANT[heroStatus] as 'success' | 'warning' | 'default') ?? 'default'}>
              {heroStatus}
            </Badge>
          </div>

          <h2 className="text-lg font-semibold text-foreground">{heroTitle}</h2>
          <p className="mt-0.5 font-mono text-xs text-foreground-muted">
            {heroId.toUpperCase()}
            {record?.investigation.tags?.includes('demo') ? ' · demonstration case' : ''}
          </p>

          {!compact && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary">
              {heroDescription}
            </p>
          )}

          {!compact && (
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-foreground-muted">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {entityCount} entities
              </span>
              <span className="inline-flex items-center gap-1">
                <FileSearch className="h-3.5 w-3.5" />
                {evidenceCount} evidence
              </span>
              <span className="inline-flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5" />
                {relationshipCount} relationships
              </span>
              <span className="inline-flex items-center gap-1">
                <FolderSearch className="h-3.5 w-3.5" />
                {findingCount} findings
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <Link href={href} data-testid="demo-investigation-open">
            <Button variant="primary" size="sm">
              Explore the demo investigation
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link
            href={journeyHref(`/networks/${networkId}`)}
            className="text-xs text-foreground-muted underline-offset-2 hover:text-brand hover:underline"
            data-testid="demo-investigation-network"
          >
            <span className="inline-flex items-center gap-1">
              <Network className="h-3.5 w-3.5" />
              Jump straight to its network
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}