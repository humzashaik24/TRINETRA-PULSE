'use client';

import React from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import type { EvidenceItem } from '@trinetra-pulse/types';
import {
  getEvidenceBlockchain,
  anchorEvidenceBlockchain,
  verifyEvidenceBlockchain,
} from '@/services/evidence-integrity.service';
import type {
  EvidenceBlockchainView,
  EvidenceAnchorResult,
  EvidenceVerifyResult,
} from '@trinetra-pulse/types';
import { EvidenceChainPanel } from './evidence-chain-panel';
import { EvidenceBlockchainPanel } from './evidence-blockchain-panel';

// ============================================================
// PHASE 21 — EVIDENCE INTEGRITY SECTION
// ============================================================
// Owns loading of the integrity + blockchain view for one evidence item and
// composes the layered chain visualisation with the raw anchor panel.
// Reads are read-only; anchoring and verifying are explicit user actions.
// ============================================================

interface EvidenceIntegritySectionProps {
  evidence: EvidenceItem;
  className?: string;
}

export function EvidenceIntegritySection({
  evidence,
  className,
}: EvidenceIntegritySectionProps) {
  const [view, setView] = React.useState<EvidenceBlockchainView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [anchorBusy, setAnchorBusy] = React.useState(false);
  const [verifyBusy, setVerifyBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getEvidenceBlockchain(evidence.id);
      setView(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load evidence integrity.');
    } finally {
      setLoading(false);
    }
  }, [evidence.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleAnchor = async (): Promise<EvidenceAnchorResult | void> => {
    setAnchorBusy(true);
    try {
      await anchorEvidenceBlockchain(evidence.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anchor failed.');
    } finally {
      setAnchorBusy(false);
    }
  };

  const handleVerify = async (): Promise<EvidenceVerifyResult | void> => {
    setVerifyBusy(true);
    try {
      await verifyEvidenceBlockchain(evidence.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifyBusy(false);
    }
  };

  if (loading && !view) {
    return (
      <div className={className} data-testid="evidence-integrity-section">
        <div className="flex items-center gap-2 py-3 text-xs text-foreground-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Computing integrity chain…
        </div>
      </div>
    );
  }

  if (error && !view) {
    return (
      <div className={className} data-testid="evidence-integrity-section">
        <div className="flex items-center gap-2 py-3 text-xs text-danger">
          <ShieldCheck className="h-3.5 w-3.5" />
          {error}
        </div>
      </div>
    );
  }

  if (!view) return null;

  return (
    <div className={className} data-testid="evidence-integrity-section">
      <EvidenceChainPanel
        integrity={view.integrity}
        anchor={view.anchor}
        verificationState={view.verificationState}
      />
      <div className="mt-2">
        <EvidenceBlockchainPanel
          view={view}
          onAnchor={handleAnchor}
          onVerify={handleVerify}
          anchorBusy={anchorBusy}
          verifyBusy={verifyBusy}
        />
      </div>
      {error && (
        <p className="mt-1 text-[10px] text-danger">{error}</p>
      )}
    </div>
  );
}