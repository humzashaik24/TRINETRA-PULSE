'use client';

import React, { useEffect } from 'react';
import { Link2, ShieldCheck, ShieldAlert, ShieldX, Loader2 } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import { useEvidenceStore } from '@/state/evidence.store';
import type {
  EvidenceChainAction,
  EvidenceChainStatus,
  EvidenceChainEntry,
} from '@trinetra-pulse/types';

// ============================================================
// PHASE 18.2 — EVIDENCE CUSTODY CHAIN PANEL
// ============================================================
// Rendes the tamper-evident SHA-256 chain of custody for an evidence item.
// The chain is relational-only: the panel loads through the evidence store and
// stays honestly absent in mock mode (no fabricated hashes for demo rows).

const ACTION_LABELS: Record<EvidenceChainAction, string> = {
  evidence_created: 'Created',
  evidence_uploaded: 'Uploaded',
  evidence_accessed: 'Accessed',
  evidence_verified: 'Verified',
  evidence_metadata_updated: 'Metadata updated',
  evidence_exported: 'Exported',
  evidence_transferred: 'Transferred',
  integrity_checked: 'Integrity checked',
};

const STATUS_CONFIG: Record<
  EvidenceChainStatus,
  { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'default' }
> = {
  VALID: { label: 'Chain valid', variant: 'success' },
  TAMPERED: { label: 'Tampered', variant: 'danger' },
  BROKEN_CHAIN: { label: 'Chain broken', variant: 'danger' },
  MISSING: { label: 'No chain', variant: 'warning' },
  INVALID_SCOPE: { label: 'Unavailable', variant: 'warning' },
};

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function EvidenceChainPanel({
  evidenceId,
  investigationId,
  className,
}: {
  evidenceId: string;
  investigationId?: string;
  className?: string;
}) {
  const chain = useEvidenceStore((s) => s.chain);
  const chainVerification = useEvidenceStore((s) => s.chainVerification);
  const chainLoading = useEvidenceStore((s) => s.chainLoading);
  const chainError = useEvidenceStore((s) => s.chainError);
  const chainAvailable = useEvidenceStore((s) => s.chainAvailable);
  const fetchChain = useEvidenceStore((s) => s.fetchChain);
  const verifyChain = useEvidenceStore((s) => s.verifyChain);

  useEffect(() => {
    if (evidenceId) {
      void fetchChain(evidenceId);
    }
    // fetchChain is bound to the stable store instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceId]);

  const verification = chainVerification ?? null;
  const status = verification?.status;

  return (
    <div className={cn('space-y-3', className)} data-testid="evidence-chain-panel">
      <div className="flex items-center justify-between gap-2">
        <h4 className="tp-data-label flex items-center gap-1.5">
          <Link2 className="h-3 w-3" />
          Tamper-Evident Evidence Chain
        </h4>
        {verification && status ? (
          <Badge size="sm" variant={STATUS_CONFIG[status].variant}>
            {verification.valid ? (
              <ShieldCheck className="mr-1 h-3 w-3" />
            ) : (
              <ShieldX className="mr-1 h-3 w-3" />
            )}
            {STATUS_CONFIG[status].label}
          </Badge>
        ) : null}
      </div>

      {!chainAvailable && !chainLoading && !chainError ? (
        <p className="text-[11px] leading-relaxed text-foreground-muted">
          Custody chains are recorded in the relational database. Point the app
          at the backend to verify this evidence&apos;s tamper-evident history.
        </p>
      ) : null}

      {chainLoading && !chain ? (
        <p className="flex items-center gap-2 text-[11px] text-foreground-muted">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading chain…
        </p>
      ) : null}

      {chainError ? (
        <div className="rounded-md bg-danger-subtle px-2 py-1.5 text-[11px] text-danger">
          <ShieldAlert className="mr-1 inline h-3 w-3" />
          {chainError}
        </div>
      ) : null}

      {chain && chain.length === 0 ? (
        <p className="text-[11px] text-foreground-muted">
          This evidence item has no custody chain yet.
        </p>
      ) : null}

      {chain && chain.length > 0 ? (
        <ul className="space-y-1">
          {chain.map((entry) => (
            <li key={entry.id} className="relative">
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                <span className="font-mono text-foreground">
                  #{entry.sequence_number}
                </span>
                <span className="flex-1 text-foreground-secondary">
                  {ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, ' ')}
                </span>
                <span className="text-right font-mono text-[10px] text-foreground-muted">
                  {shortHash(entry.entry_hash)}
                </span>
              </div>
              <p className="px-2 pb-1 text-[10px] text-foreground-muted">
                {entry.actor_email ?? 'unknown actor'}
                {entry.event_timestamp
                  ? ` · ${formatDateTime(entry.event_timestamp)}`
                  : entry.created_at
                    ? ` · ${formatDateTime(entry.created_at)}`
                    : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {(chain?.length ?? 0) > 0 ? (
        <div className="rounded-md border border-border bg-surface-elevated/40 px-2 py-1.5 text-[10px] text-foreground-muted">
          <div className="flex justify-between gap-2 py-0.5">
            <span>Links</span>
            <span className="font-mono">{chain?.length ?? 0}</span>
          </div>
          {verification ? (
            <div className="flex justify-between gap-2 py-0.5">
              <span>Verified</span>
              <span>{formatDateTime(verification.verified_at)}</span>
            </div>
          ) : null}
          {verification?.reason ? (
            <div className="flex justify-between gap-2 py-0.5">
              <span>Reason</span>
              <span className="text-right">{verification.reason}</span>
            </div>
          ) : null}
          {verification?.failures?.length ? (
            <div className="mt-1 border-t border-border pt-1">
              <div className="font-medium text-danger">Verification failures</div>
              <ul className="mt-1 space-y-0.5">
                {verification.failures.map((failure, index) => (
                  <li key={`${failure.event_id ?? 'chain'}-${index}`}>
                    {failure.event_id ? `${failure.event_id}: ` : ''}
                    {failure.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <details className="mt-1" data-testid="evidence-chain-technical">
            <summary className="cursor-pointer text-[10px] text-evidence hover:underline">
              Technical details
            </summary>
            <div className="mt-1 space-y-1.5">
              {chain?.map((entry) => (
                <div key={entry.id} className="rounded bg-surface px-1.5 py-1 leading-relaxed">
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">Action</span>
                    <span className="text-right">{entry.action}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">Evidence hash</span>
                    <span className="text-right font-mono">{shortHash(entry.payload_hash)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">Metadata hash</span>
                    <span className="text-right font-mono">{shortHash(entry.metadata_hash)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">Previous hash</span>
                    <span className="text-right font-mono">
                      {entry.previous_entry_hash ? shortHash(entry.previous_entry_hash) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">Current hash</span>
                    <span className="text-right font-mono">{shortHash(entry.entry_hash)}</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : null}

      {chainAvailable ? (
        <div className="flex justify-end">
          <button
            onClick={() => void verifyChain(evidenceId)}
            disabled={chainLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-evidence/30 bg-evidence-subtle px-2.5 py-1 text-[11px] font-medium text-evidence tp-transition hover:bg-evidence/10 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="evidence-chain-verify"
          >
            {chainLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ShieldCheck className="h-3 w-3" />
            )}
            Verify chain
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default EvidenceChainPanel;