'use client';

import React from 'react';
import { Fingerprint, GitBranch, Link2 } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import type {
  EvidenceIntegritySummary,
  EvidenceBlockchainAnchorView,
  EvidenceIntegrityVerificationState,
} from '@trinetra-pulse/types';

// ============================================================
// PHASE 21 — EVIDENCE CHAIN PANEL
// ============================================================
// Layered integrity visualisation for one evidence item:
//   1. LOCAL SHA-256 checksum   — server-derived digest
//   2. CUSTODY hash chain       — derived, deterministic, replayable
//   3. BLOCKCHAIN anchor        — optional immutable anchor digest
//
// Language is deliberately neutral: the chain proves a digest existed at a
// point in time, never that the evidence content is truthful.
// ============================================================

interface EvidenceChainPanelProps {
  integrity: EvidenceIntegritySummary;
  anchor?: EvidenceBlockchainAnchorView | null;
  verificationState: EvidenceIntegrityVerificationState;
}

const STATE_VARIANT: Record<EvidenceIntegrityVerificationState, 'success' | 'danger' | 'warning' | 'info' | 'secondary'> = {
  VERIFIED: 'success',
  MISMATCH: 'danger',
  NOT_ANCHORED: 'secondary',
  PENDING: 'warning',
  UNAVAILABLE: 'warning',
};

const STATE_LABEL: Record<EvidenceIntegrityVerificationState, string> = {
  VERIFIED: 'Verified',
  MISMATCH: 'Mismatch',
  NOT_ANCHORED: 'Not anchored',
  PENDING: 'Pending',
  UNAVAILABLE: 'Unavailable',
};

const mono = 'font-mono text-[10px] leading-tight break-all';

function LayerCard({
  index,
  icon,
  title,
  subtitle,
  digest,
  tone,
  children,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  digest?: string | null;
  tone: 'default' | 'success' | 'danger';
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        tone === 'success' && 'border-success/30 bg-success-subtle/40',
        tone === 'danger' && 'border-danger/30 bg-danger-subtle/40',
        tone === 'default' && 'border-border bg-surface-elevated/50',
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-surface-elevated text-foreground-muted">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-wider text-foreground-muted">
              {index}
            </span>
            <h5 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
              {title}
            </h5>
          </div>
          <p className="mt-0.5 text-[10px] text-foreground-muted">{subtitle}</p>
          {digest && <p className={cn(mono, 'mt-1.5 text-foreground-secondary')}>{digest}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

export function EvidenceChainPanel({
  integrity,
  anchor,
  verificationState,
}: EvidenceChainPanelProps) {
  const checksum = integrity.evidenceChecksum ?? integrity.custodyChainHash ?? null;

  return (
    <div data-testid="evidence-chain-panel" className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link2 className="h-3 w-3 text-foreground-muted" />
          <span className="text-[10px] uppercase tracking-wide text-foreground-muted">
            Integrity chain
          </span>
        </div>
        <Badge size="sm" variant={STATE_VARIANT[verificationState]}>
          {STATE_LABEL[verificationState]}
        </Badge>
      </div>

      <LayerCard
        index="1"
        icon={<Fingerprint className="h-3 w-3" />}
        title="Local checksum"
        subtitle="SHA-256 digest of the evidence record (server-derived)"
        digest={checksum}
        tone="default"
      />

      <LayerCard
        index="2"
        icon={<GitBranch className="h-3 w-3" />}
        title="Custody chain"
        subtitle={`${integrity.custodyEvents.length} chained event(s) · ${integrity.algorithmVersion}`}
        digest={integrity.custodyChainHash}
        tone="default"
      >
        <ul className="mt-2 space-y-1">
          {integrity.custodyEvents.map((event) => (
            <li key={event.sequence} className="flex items-start gap-1.5 text-[10px] text-foreground-secondary">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-foreground-muted" />
              <span className="min-w-0 flex-1">
                <span className="font-mono">#{event.sequence} {event.action}</span>
                {event.actor && <span className="text-foreground-muted"> · {event.actor}</span>}
                <span className="block truncate font-mono text-[9px] text-foreground-muted">
                  {event.currentEventHash}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </LayerCard>

      <LayerCard
        index="3"
        icon={<Link2 className="h-3 w-3" />}
        title="Blockchain anchor"
        subtitle={
          anchor
            ? `${anchor.network}${anchor.isMock ? ' · MOCK registry' : ''}`
            : 'No anchor — run verify or anchor to bind this digest'
        }
        digest={anchor?.anchorDigest ?? null}
        tone={verificationState === 'VERIFIED' ? 'success' : verificationState === 'MISMATCH' ? 'danger' : 'default'}
      />
    </div>
  );
}