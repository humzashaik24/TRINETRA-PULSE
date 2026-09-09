'use client';

import { useState } from 'react';
import { Plus, Sparkles, Pencil, Check, X, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { Badge, Button, ErrorState, Input, LoadingState } from '@trinetra-pulse/ui';
import { useInvestigationStore } from '@/state/investigation.store';
import { formatDateTime } from '@/lib/format';
import { FindingDetailPanel } from '@/components/investigation/finding-detail-panel';
import {
  FINDING_CONFIDENCE_VARIANT,
  findingSeverityLabel,
  findingSeverityVariant,
} from '@/lib/findings-labels';
import type { FindingConfidenceLevel, InvestigationFinding } from '@trinetra-pulse/types';

// ============================================================
// INVESTIGATION — FINDINGS TAB (Phase 28)
// ============================================================
// Analytical findings tied to the investigation. Confidence is
// finding confidence (analytical), never guilt probability.
// Phase 28 elevates the read surface: each persisted finding is
// expanded with grounded evidence references, related entities
// and relationships, its recorded provenance and honest
// empty/loading/error states. Findings are still created and
// edited manually by the investigator — the tab never fabricates
// rows, supporting evidence or judgements.
// ============================================================

const CONFIDENCE_ORDER: FindingConfidenceLevel[] = ['low', 'medium', 'high'];

export function InvestigationFindingsTab() {
  const investigationId = useInvestigationStore((s) => s.investigationId);
  const findings = useInvestigationStore((s) => s.data.findings);
  const loading = useInvestigationStore((s) => s.loading);
  const error = useInvestigationStore((s) => s.error);
  const load = useInvestigationStore((s) => s.loadInvestigation);
  const addFinding = useInvestigationStore((s) => s.addFinding);
  const editFinding = useInvestigationStore((s) => s.editFinding);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [confidence, setConfidence] = useState<FindingConfidenceLevel>('medium');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editConfidence, setEditConfidence] = useState<FindingConfidenceLevel>('medium');

  const submit = () => {
    if (!title.trim()) return;
    addFinding({
      title: title.trim(),
      description: description.trim() || 'No description.',
      category: category.trim() || 'general',
      confidence,
      created_by: 'Current investigator',
    });
    setTitle('');
    setDescription('');
    setCategory('');
    setConfidence('medium');
    setFormOpen(false);
  };

  if (error) {
    return (
      <div data-testid="investigation-findings-tab">
        <ErrorState
          title="Could not load findings"
          message={error}
          retry={() => investigationId && void load(investigationId)}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4" data-testid="investigation-findings-tab">
        <LoadingState message="Loading findings…" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="investigation-findings-tab">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">{findings.length} finding{findings.length === 1 ? '' : 's'}</p>
        <Button size="sm" variant="secondary" onClick={() => setFormOpen((o) => !o)} data-testid="add-finding-button">
          <Plus className="h-3.5 w-3.5" />
          New finding
        </Button>
      </div>

      {formOpen && (
        <div className="rounded-xl border border-border bg-surface p-4" data-testid="finding-form">
          <h3 className="mb-3 text-sm font-medium text-foreground">Record an analytical finding</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Finding title"
              aria-label="Finding title"
              data-testid="finding-title-input"
            />
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (e.g. association)"
              aria-label="Finding category"
            />
            <div className="sm:col-span-2">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                aria-label="Finding description"
              />
            </div>
            <select
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as FindingConfidenceLevel)}
              className="h-8 rounded-md border border-border bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Finding confidence"
              data-testid="finding-confidence-select"
            >
              {CONFIDENCE_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)} confidence
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={submit} data-testid="finding-submit">
              <Plus className="h-3.5 w-3.5" />
              Add finding
            </Button>
          </div>
        </div>
      )}

      {findings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-muted">
          No findings detected for this investigation.
        </p>
      ) : (
        <div className="space-y-3">
          {findings.map((f) => {
            const expanded = selectedId === f.id;

            return (
              <div key={f.id} className="space-y-3">
                <FindingCard
                  finding={f}
                  expanded={expanded}
                  editing={editingId === f.id}
                  editConfidence={editConfidence}
                  onToggle={() => setSelectedId(expanded ? null : f.id)}
                  onStartEdit={() => {
                    setEditingId(f.id);
                    setEditConfidence(f.confidence);
                  }}
                  onEditConfidence={() => {
                    editFinding(f.id, { confidence: editConfidence });
                    setEditingId(null);
                  }}
                  onCancelEdit={() => setEditingId(null)}
                  onEditConfidenceChange={setEditConfidence}
                />
                {expanded ? (
                  <FindingDetailPanel
                    finding={f}
                    investigationId={investigationId ?? ''}
                    onClose={() => setSelectedId(null)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-xs text-foreground-muted">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Findings are analytical observations derived from existing investigation data. They
          support review and do not establish guilt or criminal intent.
        </p>
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  expanded,
  editing,
  editConfidence,
  onToggle,
  onStartEdit,
  onEditConfidence,
  onCancelEdit,
  onEditConfidenceChange,
}: {
  finding: InvestigationFinding;
  expanded: boolean;
  editing: boolean;
  editConfidence: FindingConfidenceLevel;
  onToggle: () => void;
  onStartEdit: () => void;
  onEditConfidence: () => void;
  onCancelEdit: () => void;
  onEditConfidenceChange: (value: FindingConfidenceLevel) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4" data-testid="finding-row">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onToggle} className="flex min-w-0 items-start gap-2.5 text-left">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
          <span className="min-w-0">
            <span className="block font-medium text-foreground">{finding.title}</span>
            <span className="mt-0.5 block text-xs text-foreground-secondary">{finding.description}</span>
          </span>
        </button>
        {editing ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <select
              value={editConfidence}
              onChange={(e) => onEditConfidenceChange(e.target.value as FindingConfidenceLevel)}
              className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Edit confidence"
            >
              {CONFIDENCE_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={onEditConfidence}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-success hover:bg-success-subtle"
              aria-label="Save confidence"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onCancelEdit}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant={FINDING_CONFIDENCE_VARIANT[finding.confidence]} size="sm">
              {finding.confidence}
            </Badge>
            <button
              onClick={onStartEdit}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground"
              aria-label={`Edit finding ${finding.title}`}
              data-testid={`edit-finding-${finding.id}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-foreground-muted">
        <Badge variant={findingSeverityVariant(finding.category)} size="sm">
          {findingSeverityLabel(finding.category)}
        </Badge>
        {finding.entity_ids.length > 0 ? (
          <span className="rounded-md border border-border px-2 py-0.5" data-testid={`finding-entities-${finding.id}`}>
            {finding.entity_ids.length} entit{finding.entity_ids.length === 1 ? 'y' : 'ies'}
          </span>
        ) : null}
        {finding.evidence_ids.length > 0 ? (
          <span className="rounded-md border border-border px-2 py-0.5" data-testid={`finding-evidence-${finding.id}`}>
            {finding.evidence_ids.length} evidence reference{finding.evidence_ids.length === 1 ? '' : 's'}
          </span>
        ) : null}
        {finding.tags.map((t) => (
          <span key={t}>#{t}</span>
        ))}
        <span className="ml-auto">
          {finding.source} · created {formatDateTime(finding.created_at)}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
          data-testid={`finding-expand-${finding.id}`}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Close details
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Details
            </>
          )}
        </button>
      </div>
    </div>
  );
}