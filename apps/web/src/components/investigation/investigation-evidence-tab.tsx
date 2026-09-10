'use client';

import { useState } from 'react';
import { Trash2, Plus, FileSearch, FlaskConical } from 'lucide-react';
import { Badge, Button, Input } from '@trinetra-pulse/ui';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { formatDateTime } from '@/lib/format';
import type { EvidenceContextKind } from '@trinetra-pulse/types';

// ============================================================
// INVESTIGATION — EVIDENCE TAB
// ============================================================
// Lists evidence linked into the investigation. Selecting opens the
// shell inspector in place. New evidence added here is DEMO data and
// is clearly labelled as such (is_mock). Providers are never
// fabricated — demo entries are explicit.
// ============================================================

const EVIDENCE_TYPE_LABELS: Record<EvidenceContextKind, string> = {
  document: 'Document',
  image: 'Image',
  communication: 'Communication',
  transaction: 'Transaction',
  location_record: 'Location record',
  vehicle_record: 'Vehicle record',
  structured_record: 'Structured record',
  other: 'Other',
};

export function InvestigationEvidenceTab() {
  const evidence = useInvestigationStore((s) => s.data.evidence);
  const investigationId = useInvestigationStore((s) => s.investigationId);
  const linkEvidence = useInvestigationStore((s) => s.linkEvidence);
  const unlinkEvidence = useInvestigationStore((s) => s.unlinkEvidence);
  const selectContext = useShellStore((s) => s.selectContext);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [type, setType] = useState<EvidenceContextKind>('document');

  const addDemoEvidence = () => {
    if (!title.trim()) return;
    linkEvidence({
      evidence_id: `demo-${Date.now()}`,
      title: title.trim(),
      evidence_type: type,
      summary: summary.trim() || 'Demo evidence record.',
      linked_by: 'Current investigator',
      isMock: true,
    });
    setTitle('');
    setSummary('');
    setFormOpen(false);
  };

  return (
    <div className="space-y-4" data-testid="investigation-evidence-tab">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">{evidence.length} linked evidence item{evidence.length === 1 ? '' : 's'}</p>
        <Button size="sm" variant="secondary" onClick={() => setFormOpen((o) => !o)} data-testid="add-evidence-button">
          <Plus className="h-3.5 w-3.5" />
          Add evidence
        </Button>
      </div>

      {formOpen && (
        <div className="rounded-xl border border-border bg-surface p-4" data-testid="evidence-form">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <FlaskConical className="mt-0.5 h-4 w-4 text-foreground-muted" />
              <div>
                <h3 className="text-sm font-medium text-foreground">Add demo evidence</h3>
                <p className="text-xs text-foreground-muted">
                  Demo entries are labelled as mock data and are not sourced from a provider.
                </p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
              Close
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title (e.g. Interview summary)"
                aria-label="Evidence title"
                data-testid="evidence-title-input"
              />
            </div>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Short summary (optional)"
              aria-label="Evidence summary"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EvidenceContextKind)}
              className="h-8 rounded-md border border-border bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Evidence type"
              data-testid="evidence-type-select"
            >
              {(Object.keys(EVIDENCE_TYPE_LABELS) as EvidenceContextKind[]).map((t) => (
                <option key={t} value={t}>
                  {EVIDENCE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={addDemoEvidence} data-testid="evidence-submit">
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      )}

      {evidence.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-muted">
          No evidence linked yet.
        </p>
      ) : (
        <div className="space-y-2">
          {evidence.map((e) => {
            const isMock = e.metadata?.is_mock === true;
            return (
              <div
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4"
                data-testid="evidence-row"
              >
                <button
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  onClick={() =>
                    selectContext({
                      type: 'evidence',
                      id: e.evidence_id,
                      title: e.title,
                      investigationId: investigationId ?? undefined,
                    })
                  }
                >
                  <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{e.title}</p>
                      {isMock && (
                        <Badge variant="warning" size="sm" data-testid="mock-evidence-badge">
                          Mock / demo
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-foreground-secondary">{e.summary}</p>
                    <p
                      className="mt-1 text-[11px] text-foreground-muted"
                      data-testid={`evidence-collected-${e.evidence_id}`}
                    >
                      Evidence collected {e.collected_at ? formatDateTime(e.collected_at) : 'Time unavailable'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-foreground-muted">
                      {EVIDENCE_TYPE_LABELS[e.evidence_type] ?? e.evidence_type} · linked by {e.linked_by} ·{' '}
                      {formatDateTime(e.linked_at)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => unlinkEvidence(e.id)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-danger-subtle hover:text-danger"
                  aria-label={`Unlink ${e.title}`}
                  data-testid={`unlink-evidence-${e.evidence_id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
