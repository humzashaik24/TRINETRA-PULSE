'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, FolderSearch, Network, Users, FileSearch, GitBranch, Sparkles } from 'lucide-react';
import { Badge, Button } from '@trinetra-pulse/ui';
import { journeyHref, DEMO_INVESTIGATION_ID, DEMO_NETWORK_ID } from '@/navigation/journey';
import { mockInvestigationById } from '@/mock/investigations';

// ============================================================
// PHASE 13 — DEMO INVESTIGATION HERO
// ============================================================
// The single, deterministic entry point for the SIH
// end-to-end demonstration ("Operation Meridian", INV-006).
// Rendered at the top of the Investigations landing page and in
// the investigation overview command center so the demo journey
// starts exactly where the reviewer expects it to.
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
  const record = mockInvestigationById.get(DEMO_INVESTIGATION_ID);
  const inv = record?.investigation;

  const entityCount = record?.entities.length ?? 0;
  const evidenceCount = record?.evidence.length ?? 0;
  const relationshipCount = record?.relationships.length ?? 0;
  const findingCount = record?.findings.length ?? 0;

  const href = journeyHref(`/investigations/${DEMO_INVESTIGATION_ID}`);

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
            <Badge size="sm" variant={inv ? (STATUS_VARIANT[inv.status] as 'success' | 'warning' | 'default') ?? 'default' : 'default'}>
              {inv?.status ?? 'active'}
            </Badge>
          </div>

          <h2 className="text-lg font-semibold text-foreground">{inv?.title ?? 'Operation Meridian'}</h2>
          <p className="mt-0.5 font-mono text-xs text-foreground-muted">
            {DEMO_INVESTIGATION_ID.toUpperCase()}
            {record?.investigation.tags?.includes('demo') ? ' · demonstration case' : ''}
          </p>

          {!compact && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary">
              {inv?.description ??
                'A guided end-to-end walk-through: investigate an active import-operation case, follow its entities, evidence, network and findings — and see the Context Inspector and AI Assistant stay grounded in the same investigation.'}
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
            href={journeyHref(`/networks/${DEMO_NETWORK_ID}`)}
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