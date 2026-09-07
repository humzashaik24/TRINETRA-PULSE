'use client';

import React from 'react';
import { ExternalLink, Landmark, RefreshCw } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import type {
  EvidenceBlockchainView,
  EvidenceAnchorResult,
  EvidenceVerifyResult,
} from '@trinetra-pulse/types';

// ============================================================
// PHASE 21 — EVIDENCE BLOCKCHAIN PANEL
// ============================================================
// Raw blockchain anchor view + integrity actions for one evidence item.
// The anchor payload is the 64-character digest only — raw evidence and PII
// never touch a chain. Mock anchoring is clearly labelled MOCK and never
// represented as a real-chain write.
// ============================================================

interface EvidenceBlockchainPanelProps {
  view: EvidenceBlockchainView;
  onAnchor: (message?: string) => Promise<EvidenceAnchorResult | void>;
  onVerify: () => Promise<EvidenceVerifyResult | void>;
  anchorBusy?: boolean;
  verifyBusy?: boolean;
  className?: string;
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-foreground-muted pt-px">
        {label}
      </span>
      <span className={cn('min-w-0 text-[11px] text-foreground text-right truncate', mono && 'font-mono')}>
        {value}
      </span>
    </div>
  );
}

export function EvidenceBlockchainPanel({
  view,
  onAnchor,
  onVerify,
  anchorBusy = false,
  verifyBusy = false,
  className,
}: EvidenceBlockchainPanelProps) {
  const { provider, anchor, verificationState, message, lastVerifiedAt } = view;
  const mock = provider.isMock;

  return (
    <div
      data-testid="evidence-blockchain-panel"
      className={cn('rounded-lg border border-border bg-surface-elevated/50 p-3', className)}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Landmark className="h-3 w-3 text-foreground-muted" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
            Blockchain anchor
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {mock && (
            <Badge size="sm" variant="warning">
              MOCK
            </Badge>
          )}
          <Badge
            size="sm"
            variant={
              verificationState === 'VERIFIED'
                ? 'success'
                : verificationState === 'MISMATCH'
                  ? 'danger'
                  : verificationState === 'NOT_ANCHORED'
                    ? 'secondary'
                    : 'warning'
            }
          >
            {verificationState.replace(/_/g, ' ').toLowerCase()}
          </Badge>
        </div>
      </div>

      <Row label="Provider" value={provider.provider} mono />
      <Row label="Network" value={provider.network} mono />
      <Row label="Healthy" value={provider.healthy ? 'yes' : 'no'} />
      {anchor && (
        <>
          <Row label="Transaction" value={anchor.transactionId} mono />
          <Row label="Block" value={anchor.blockNumber} mono />
          <Row label="Contract" value={anchor.contractAddress} mono />
          <Row label="Anchored" value={anchor.anchoredAt ? formatDateTime(anchor.anchoredAt) : null} />
        </>
      )}
      {lastVerifiedAt && (
        <Row label="Last verified" value={formatDateTime(lastVerifiedAt)} />
      )}

      {message && (
        <p className="mt-1.5 rounded-md bg-surface-hover/60 px-2 py-1.5 text-[10px] leading-relaxed text-foreground-secondary">
          {message}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void onAnchor()}
          disabled={anchorBusy || verificationState === 'VERIFIED'}
          className="inline-flex h-6 items-center gap-1.5 rounded-md border border-evidence/40 bg-evidence-subtle px-2 text-[11px] font-medium text-evidence hover:bg-evidence-subtle/70 disabled:cursor-not-allowed disabled:opacity-50 tp-transition"
        >
          <Landmark className="h-3 w-3" />
          {anchorBusy ? 'Anchoring…' : 'Anchor digest'}
        </button>
        <button
          type="button"
          onClick={() => void onVerify()}
          disabled={verifyBusy}
          className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-2 text-[11px] font-medium text-foreground-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 tp-transition"
        >
          <RefreshCw className={cn('h-3 w-3', verifyBusy && 'animate-spin')} />
          {verifyBusy ? 'Verifying…' : 'Verify'}
        </button>
        {anchor?.transactionId && (
          <a
            href={`${view.provider.network}/tx/${anchor.transactionId}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex h-6 items-center gap-1 text-[10px] text-foreground-muted hover:text-foreground"
          >
            Explorer <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <p className="mt-2 text-[9px] leading-relaxed text-foreground-muted">
        Anchor payload is the {view.integrity.associatedAnchorDigest?.length ? '64-character' : 'server-derived'}{' '}
        digest only. Raw evidence and personally identifiable information remain off-chain.
      </p>
    </div>
  );
}