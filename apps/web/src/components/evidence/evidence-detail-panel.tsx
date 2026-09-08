'use client';

import React from 'react';
import {
  FileText,
  BadgeCheck,
  Clock,
  Database,
  GitBranch,
  ShieldCheck,
  History,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { Badge, Button } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import type { EvidenceItem, EvidenceLink } from '@trinetra-pulse/types';
import {
  EVIDENCE_TYPE_LABELS,
  EVIDENCE_STATUS_LABELS,
  formatDateTime,
  formatPercent,
  EXTRACTION_METHOD_LABELS,
} from '@/lib/format';
import {
  EVIDENCE_TYPE_ICON,
  EVIDENCE_TYPE_VARIANT,
  EVIDENCE_STATUS_VARIANT,
} from './evidence-domain';
import { EvidenceChainPanel } from './evidence-chain-panel';
import { EvidenceAnalysisPanel } from './evidence-analysis-panel';
import { downloadEvidence } from '@/lib/api/evidence';
import { isMockData } from '@/lib/api/config';

// ============================================================
// EVIDENCE DETAIL PANEL
// ============================================================

interface EvidenceDetailPanelProps {
  evidence: EvidenceItem;
  onOpenEntity?: (id: string) => void;
  onOpenFinding?: (id: string) => void;
  className?: string;
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-foreground-muted shrink-0 pt-px">{label}</span>
      <span className={cn('text-xs text-foreground text-right min-w-0 truncate', mono && 'font-mono')}>
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h4 className="tp-data-label mb-1.5 flex items-center gap-1.5">
      {icon}
      {children}
    </h4>
  );
}

const targetLabel: Record<EvidenceLink['targetType'], string> = {
  entity: 'Linked entities',
  relationship: 'Relationship',
  finding: 'Finding',
  event: 'Event',
  evidence: 'Related evidence',
};

export function EvidenceDetailPanel({
  evidence,
  onOpenEntity,
  onOpenFinding,
  className,
}: EvidenceDetailPanelProps) {
  const TypeIcon = EVIDENCE_TYPE_ICON[evidence.evidenceType] ?? FileText;

  const entityLinks = evidence.links.filter((l) => l.targetType === 'entity');
  const findingLinks = evidence.links.filter((l) => l.targetType === 'finding');
  const eventLinks = evidence.links.filter((l) => l.targetType === 'event');
  const relationshipLinks = evidence.links.filter((l) => l.targetType === 'relationship');
  const evidenceLinks = evidence.links.filter((l) => l.targetType === 'evidence');
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const handleDownload = async () => {
    if (isMockData()) {
      setDownloadError('Payload retrieval is available in API mode only.');
      return;
    }
    setDownloadError(null);
    try {
      const blob = await downloadEvidence(evidence.id, evidence.investigationId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = evidence.filename ?? `${evidence.id}.payload`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed');
    }
  };

  return (
    <div className={cn('space-y-5', className)} data-testid="evidence-detail-panel">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-evidence/30 bg-evidence-subtle p-2 text-evidence">
          <TypeIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-snug">{evidence.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge size="sm" variant={EVIDENCE_TYPE_VARIANT[evidence.evidenceType]}>
              {EVIDENCE_TYPE_LABELS[evidence.evidenceType]}
            </Badge>
            <Badge size="sm" variant={EVIDENCE_STATUS_VARIANT[evidence.status]}>
              {EVIDENCE_STATUS_LABELS[evidence.status]}
            </Badge>
            {evidence.isDemoData && (
              <Badge size="sm" variant="warning">
                DEMO
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <SectionTitle>Description</SectionTitle>
        <p className="text-xs leading-relaxed text-foreground-secondary">{evidence.description}</p>
      </div>

      {/* Snippet */}
      {evidence.snippet && (
        <div>
          <SectionTitle>Preview</SectionTitle>
          <blockquote className="rounded-md border-l-2 border-evidence bg-surface-elevated/50 px-3 py-2 text-xs italic leading-relaxed text-foreground-secondary">
            {evidence.snippet.text}
            {evidence.snippet.truncated && '…'}
          </blockquote>
        </div>
      )}

      {/* Extraction */}
      <div>
        <SectionTitle icon={<GitBranch className="h-3 w-3" />}>Extraction</SectionTitle>
        <DetailRow label="Method" value={EXTRACTION_METHOD_LABELS[evidence.extractionMethod]} />
        <DetailRow label="Confidence" value={formatPercent(evidence.extractionConfidence)} />
        <DetailRow label="Observed" value={formatDateTime(evidence.observedAt)} />
        <DetailRow label="Ingested" value={formatDateTime(evidence.createdAt)} />
      </div>

      {/* Provenance */}
      <div>
        <SectionTitle icon={<ShieldCheck className="h-3 w-3" />}>Provenance</SectionTitle>
        <DetailRow label="Source" value={evidence.provenance.source} />
        <DetailRow label="Source ID" value={evidence.provenance.sourceId} mono />
        {evidence.datasetName && (
          <DetailRow label="Dataset" value={evidence.datasetName} />
        )}
        {evidence.provenance.recordIdentifier && (
          <DetailRow label="Record" value={evidence.provenance.recordIdentifier} mono />
        )}
        {evidence.provenance.location && (
          <DetailRow label="Location" value={evidence.provenance.location} />
        )}
        {evidence.provenance.pageSection && (
          <DetailRow label="Page" value={evidence.provenance.pageSection} />
        )}
        {evidence.provenance.hash && (
          <DetailRow label="Hash" value={`${evidence.provenance.hash.slice(0, 12)}…`} mono />
        )}
        {evidence.integrity && (
          <>
            <DetailRow label="Integrity" value={evidence.integrity.status} />
            {'storage_status' in evidence.integrity && (
              <DetailRow
                label="Payload storage"
                value={String(evidence.integrity.storage_status)}
              />
            )}
          </>
        )}
        {evidence.provenance.reviewState === 'FLAGGED' && (
          <div className="flex items-center gap-1.5 rounded-md bg-danger-subtle px-2 py-1 text-xs text-danger">
            <ShieldAlert className="h-3 w-3" /> Flagged for review
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Button size="sm" variant="secondary" onClick={() => void handleDownload()}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> View / Download payload
        </Button>
        {evidence.filename && <DetailRow label="Filename" value={evidence.filename} />}
        {evidence.contentType && <DetailRow label="Type" value={evidence.contentType} />}
        {evidence.size !== undefined && <DetailRow label="Size" value={`${evidence.size} bytes`} />}
        {downloadError && <p className="text-xs text-danger">{downloadError}</p>}
      </div>

      {/* Linked entities */}
      {entityLinks.length > 0 && (
        <div>
          <SectionTitle icon={<Database className="h-3 w-3" />}>
            {targetLabel.entity} ({entityLinks.length})
          </SectionTitle>
          <ul className="space-y-1">
            {entityLinks.map((l, i) => (
              <li key={i}>
                {onOpenEntity ? (
                  <button
                    onClick={() => onOpenEntity(l.targetId)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-surface-hover tp-transition"
                  >
                    <span className="font-mono text-foreground">{l.targetId}</span>
                    <span className="text-foreground-muted">{l.relationType.replace(/_/g, ' ').toLowerCase()}</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                    <span className="font-mono text-foreground">{l.targetId}</span>
                    <span className="text-foreground-muted">{l.relationType.replace(/_/g, ' ').toLowerCase()}</span>
                  </div>
                )}
                {l.note && (
                  <p className="px-2 pb-1 text-[10px] text-foreground-muted">{l.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Linked findings */}
      {findingLinks.length > 0 && (
        <div>
          <SectionTitle icon={<BadgeCheck className="h-3 w-3" />}>
            {targetLabel.finding} ({findingLinks.length})
          </SectionTitle>
          <ul className="space-y-1">
            {findingLinks.map((l, i) => (
              <li key={i}>
                {onOpenFinding ? (
                  <button
                    onClick={() => onOpenFinding(l.targetId)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-surface-hover tp-transition"
                  >
                    <span className="font-mono text-foreground">{l.targetId}</span>
                    <span className="text-foreground-muted">{formatPercent(l.confidence)}</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                    <span className="font-mono text-foreground">{l.targetId}</span>
                    <span className="text-foreground-muted">{formatPercent(l.confidence)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Linked events */}
      {eventLinks.length > 0 && (
        <div>
          <SectionTitle icon={<Clock className="h-3 w-3" />}>
            {targetLabel.event} ({eventLinks.length})
          </SectionTitle>
          <ul className="space-y-1">
            {eventLinks.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                <span className="font-mono text-foreground">{l.targetId}</span>
                <span className="text-foreground-muted">{formatDateTime(l.timestamp)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related evidence */}
      {evidenceLinks.length > 0 && (
        <div>
          <SectionTitle icon={<History className="h-3 w-3" />}>
            {targetLabel.evidence} ({evidenceLinks.length})
          </SectionTitle>
          <ul className="space-y-1">
            {evidenceLinks.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                <span className="font-mono text-foreground">{l.targetId}</span>
                <span className="text-foreground-muted">{l.relationType.replace(/_/g, ' ').toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Relationship links */}
      {relationshipLinks.length > 0 && (
        <div>
          <SectionTitle>{targetLabel.relationship} ({relationshipLinks.length})</SectionTitle>
          <ul className="space-y-1">
            {relationshipLinks.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                <span className="font-mono text-foreground">{l.targetId}</span>
                <span className="text-foreground-muted">{formatPercent(l.confidence)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timeline */}
      {evidence.timeline.length > 0 && (
        <div>
          <SectionTitle icon={<History className="h-3 w-3" />}>Activity</SectionTitle>
          <ol className="space-y-2 border-l border-border pl-3 ml-1">
            {evidence.timeline.map((t) => (
              <li key={t.id} className="relative">
                <span className="absolute -left-[15px] top-1.5 h-1.5 w-1.5 rounded-full bg-border" aria-hidden="true" />
                <p className="text-xs text-foreground">{t.title}</p>
                <p className="text-[10px] text-foreground-muted">
                  {t.actor} · {formatDateTime(t.timestamp)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Phase 18.2 — custody chain */}
      {evidence.id && (
        <EvidenceChainPanel
          evidenceId={evidence.id}
          investigationId={evidence.investigationId}
        />
      )}

      {/* Phase 24 — multimedia understanding (+ Phase 25 local whisper) */}
      {evidence.id && (
        <EvidenceAnalysisPanel
          evidenceId={evidence.id}
          investigationId={evidence.investigationId}
          evidenceType={evidence.evidenceType}
          checksum={evidence.integrity?.checksum}
        />
      )}
    </div>
  );
}
