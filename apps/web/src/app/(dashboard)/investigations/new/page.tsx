'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FolderPlus } from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/state/app.store';
import { useCanMutate } from '@/hooks/use-auth';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { Button, Input, Select, Label } from '@trinetra-pulse/ui';
import { createInvestigationFromSetup } from '@/services/investigation-operations.service';
import type { InvestigationPriority, InvestigationStatus } from '@trinetra-pulse/types';

// ============================================================
// INVESTIGATION — NEW (setup form)
// ============================================================
// Creates a real investigation via the Phase 9 create flow and then
// redirects into the workspace. The record is registered so the new
// case appears in the listing and can be opened normally.
// ============================================================

const PRIORITY_LABELS: Record<InvestigationPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
};

const STATUS_LABELS: Record<InvestigationStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  under_review: 'Under review',
  suspended: 'Suspended',
  closed: 'Closed',
  archived: 'Archived',
};

export default function NewInvestigationPage() {
  const router = useRouter();
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const canMutate = useCanMutate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [investigator, setInvestigator] = useState('');
  const [priority, setPriority] = useState<InvestigationPriority>('normal');
  const [status, setStatus] = useState<InvestigationStatus>('draft');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContextLabel('New investigation');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Give the investigation a title.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await createInvestigationFromSetup({
        title: title.trim(),
        description: description.trim() || undefined,
        investigator: investigator.trim() || undefined,
        priority,
        status,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      router.push(`/investigations/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create investigation');
      setCreating(false);
    }
  };

  if (!canMutate) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
        <div
          className="flex items-start gap-3 rounded-xl border border-border bg-surface p-6"
          data-testid="read-only-warning"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-warning" aria-hidden="true">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <div>
            <h2 className="font-semibold text-foreground">Read-only role</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Your account is restricted to viewing and analysis. Investigation setup is
              available to investigators and above.
            </p>
          </div>
        </div>
        <Link href="/investigations">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to investigations
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <WorkspaceHeader
        eyebrow="INVESTIGATION WORKSPACE"
        title="New investigation"
        description="Set up an investigation case to anchor your intelligence work"
        actions={
          <Link href="/investigations">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </Link>
        }
      />

      <form
        onSubmit={submit}
        className="space-y-5 rounded-xl border border-border bg-surface p-6"
        data-testid="new-investigation-form"
      >
        <div className="space-y-1.5">
          <Label htmlFor="new-inv-title">Title</Label>
          <Input
            id="new-inv-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Operation Shoreline"
            autoFocus
            data-testid="new-investigation-title"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-inv-desc">Description</Label>
          <textarea
            id="new-inv-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Scope, objectives and context for the investigation"
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="new-investigation-description"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-inv-investigator">Lead investigator</Label>
            <Input
              id="new-inv-investigator"
              value={investigator}
              onChange={(e) => setInvestigator(e.target.value)}
              placeholder="e.g. Inspector Mehta"
              data-testid="new-investigation-investigator"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-inv-tags">Tags</Label>
            <Input
              id="new-inv-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma, separated"
              data-testid="new-investigation-tags"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-inv-priority">Priority</Label>
            <Select
              id="new-inv-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as InvestigationPriority)}
              options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
              data-testid="new-investigation-priority"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-inv-status">Status</Label>
            <Select
              id="new-inv-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as InvestigationStatus)}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              data-testid="new-investigation-status"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger" data-testid="new-investigation-error">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Link href="/investigations">
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={creating} data-testid="create-investigation-submit">
            <FolderPlus className="h-4 w-4" />
            Create investigation
          </Button>
        </div>
      </form>
    </div>
  );
}
