'use client';

import { useState } from 'react';
import { Plus, Sparkles, Pencil, Check, X } from 'lucide-react';
import { Badge, Button, Input } from '@trinetra-pulse/ui';
import { useInvestigationStore } from '@/state/investigation.store';
import { formatDateTime } from '@/lib/format';
import type { FindingConfidenceLevel } from '@trinetra-pulse/types';

// ============================================================
// INVESTIGATION — FINDINGS TAB
// ============================================================
// Analytical findings tied to the investigation. Confidence is
// finding confidence (analytical), never guilt probability.
// Findings are created / edited manually by the investigator.
// ============================================================

const CONFIDENCE_VARIANT: Record<FindingConfidenceLevel, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  high: 'success',
  medium: 'warning',
  low: 'info',
};

const CONFIDENCE_ORDER: FindingConfidenceLevel[] = ['low', 'medium', 'high'];

export function InvestigationFindingsTab() {
  const findings = useInvestigationStore((s) => s.data.findings);
  const addFinding = useInvestigationStore((s) => s.addFinding);
  const editFinding = useInvestigationStore((s) => s.editFinding);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [confidence, setConfidence] = useState<FindingConfidenceLevel>('medium');

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
          No findings recorded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {findings.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-surface p-4" data-testid="finding-row">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
                  <div>
                    <p className="font-medium text-foreground">{f.title}</p>
                    <p className="mt-0.5 text-xs text-foreground-secondary">{f.description}</p>
                  </div>
                </div>
                {editingId === f.id ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <select
                      value={editConfidence}
                      onChange={(e) => setEditConfidence(e.target.value as FindingConfidenceLevel)}
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
                      onClick={() => {
                        editFinding(f.id, { confidence: editConfidence });
                        setEditingId(null);
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-success hover:bg-success-subtle"
                      aria-label="Save confidence"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover"
                      aria-label="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant={CONFIDENCE_VARIANT[f.confidence]} size="sm">
                      {f.confidence}
                    </Badge>
                    <button
                      onClick={() => {
                        setEditingId(f.id);
                        setEditConfidence(f.confidence);
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground"
                      aria-label={`Edit finding ${f.title}`}
                      data-testid={`edit-finding-${f.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-foreground-muted">
                <Badge variant="default" size="sm">
                  {f.category}
                </Badge>
                {f.tags.map((t) => (
                  <span key={t}>#{t}</span>
                ))}
                <span className="ml-auto">
                  {f.source} · created {formatDateTime(f.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
