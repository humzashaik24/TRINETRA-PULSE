'use client';

// Phase 23 — administration surface for AI/media provider configuration
// (ADMIN only). Data comes from the relational backend (/api/v2/admin/providers)
// in API mode; in mock mode deterministic sample rows keep the UI demonstrable.
// Credentials are write-only: the table shows only a masked digest and the
// form leaves the stored key untouched unless a replacement or explicit
// "clear credential" is requested. The backend remains the source of truth
// for authorization — the page hides its content from non-admins.

import { useEffect, useState } from 'react';
import {
  KeyRound,
  Pencil,
  Plus,
  PlugZap,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Input,
  Label,
  Select,
  Switch,
  Table,
  type Column,
} from '@trinetra-pulse/ui';

import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { useCurrentUser } from '@/hooks/use-auth';
import { isMockData } from '@/lib/api/config';
import {
  createProvider,
  deleteProvider,
  listProviders,
  testProvider,
  updateProvider,
  type ProviderCapability,
  type ProviderCreatePayload,
  type ProviderRow,
  type ProviderTestResult,
  type ProviderType,
  type ProviderUpdatePayload,
} from '@/lib/api/providers';

const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  mock: 'Mock',
};

const CAPABILITY_LABELS: Record<ProviderCapability, string> = {
  investigation_ai: 'Investigation AI',
  vision: 'Vision',
  video: 'Video',
  transcription: 'Transcription',
};

// Capability support mirror of the backend capability matrix.
const CAPABILITIES_BY_TYPE: Record<ProviderType, ProviderCapability[]> = {
  openai: ['investigation_ai', 'vision', 'transcription'],
  gemini: ['investigation_ai', 'vision', 'video', 'transcription'],
  openrouter: ['investigation_ai', 'vision'],
  mock: ['investigation_ai', 'vision', 'video', 'transcription'],
};

function mask(tail: string): string {
  return '\u2022'.repeat(14) + tail;
}

const MOCK_PROVIDERS: ProviderRow[] = [
  {
    id: 'prov-openai-ai',
    provider_name: 'OpenAI Investigation',
    provider_type: 'openai',
    capability: 'investigation_ai',
    model: 'gpt-4.1',
    base_url: null,
    enabled: true,
    is_default: true,
    configuration: null,
    has_credential: true,
    credential_masked: mask('ab12'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
  },
  {
    id: 'prov-gemini-vision',
    provider_name: 'Gemini Vision',
    provider_type: 'gemini',
    capability: 'vision',
    model: 'gemini-2.5-flash',
    base_url: null,
    enabled: true,
    is_default: true,
    configuration: null,
    has_credential: true,
    credential_masked: mask('9f3c'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
  },
  {
    id: 'prov-gemini-video',
    provider_name: 'Gemini Video',
    provider_type: 'gemini',
    capability: 'video',
    model: 'gemini-2.5-pro',
    base_url: null,
    enabled: true,
    is_default: true,
    configuration: null,
    has_credential: true,
    credential_masked: mask('77ea'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
  },
  {
    id: 'prov-openai-transcription',
    provider_name: 'OpenAI Transcription',
    provider_type: 'openai',
    capability: 'transcription',
    model: 'gpt-4o-transcribe',
    base_url: null,
    enabled: true,
    is_default: true,
    configuration: null,
    has_credential: true,
    credential_masked: mask('c402'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
  },
  {
    id: 'prov-mock-audio',
    provider_name: 'Mock Provider (Audio)',
    provider_type: 'mock',
    capability: 'transcription',
    model: 'mock-transcribe',
    base_url: null,
    enabled: false,
    is_default: false,
    configuration: null,
    has_credential: false,
    credential_masked: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
  },
];

interface FormState {
  provider_name: string;
  provider_type: ProviderType;
  capability: ProviderCapability;
  model: string;
  base_url: string;
  enabled: boolean;
  is_default: boolean;
  credential: string;
  clear_credential: boolean;
}

function freshForm(): FormState {
  return {
    provider_name: '',
    provider_type: 'openai',
    capability: 'investigation_ai',
    model: '',
    base_url: '',
    enabled: true,
    is_default: false,
    credential: '',
    clear_credential: false,
  };
}

function formFromRow(row: ProviderRow): FormState {
  return {
    provider_name: row.provider_name,
    provider_type: row.provider_type,
    capability: row.capability,
    model: row.model,
    base_url: row.base_url ?? '',
    enabled: row.enabled,
    is_default: row.is_default,
    credential: '',
    clear_credential: false,
  };
}

function syntheticRow(
  editing: ProviderRow | null,
  form: FormState
): ProviderRow {
  const now = new Date().toISOString();
  const credentialChanged = form.credential.trim() !== '';
  const hasCredential = editing
    ? form.clear_credential
      ? false
      : credentialChanged
        ? true
        : editing.has_credential
      : credentialChanged;
  const maskedTail = form.clear_credential
    ? ''
    : credentialChanged
      ? form.credential.trim().slice(-4)
      : editing?.credential_masked ?? '';
  return {
    id: editing?.id ?? `prov-local-${Date.now()}`,
    provider_name: form.provider_name,
    provider_type: form.provider_type,
    capability: form.capability,
    model: form.model,
    base_url: form.base_url.trim() || null,
    enabled: form.enabled,
    is_default: form.is_default,
    configuration: null,
    has_credential: hasCredential,
    credential_masked: hasCredential && maskedTail ? mask(maskedTail) : '',
    created_at: editing?.created_at ?? now,
    updated_at: now,
    created_by: editing?.created_by ?? null,
    updated_by: null,
  };
}

export default function SecurityProvidersPage() {
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';

  const [providers, setProviders] = useState<ProviderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProviderRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, ProviderTestResult>>({});
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isAdmin) return;

    async function load() {
      if (isMockData()) {
        if (!cancelled) setProviders(MOCK_PROVIDERS);
        return;
      }
      try {
        const rows = await listProviders();
        if (!cancelled) {
          setProviders(rows);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load providers');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  function applySaved(row: ProviderRow, wasCreating: boolean) {
    setProviders((prev) => {
      const base = prev ?? [];
      return wasCreating ? [row, ...base] : base.map((r) => (r.id === row.id ? row : r));
    });
  }

  function applyDeleted(id: string) {
    setProviders((prev) => prev?.filter((r) => r.id !== id) ?? null);
  }

  function applyToggle(row: ProviderRow, next: boolean) {
    setProviders((prev) =>
      prev?.map((r) =>
        r.id === row.id
          ? { ...r, enabled: next, is_default: next ? r.is_default : false }
          : r
      ) ?? null
    );
  }

  async function handleToggle(row: ProviderRow, next: boolean) {
    setError(null);
    applyToggle(row, next);
    if (isMockData()) return;
    try {
      const updated = await updateProvider(row.id, { enabled: next });
      applySaved(updated, false);
    } catch (err) {
      applyToggle(row, !next);
      setError(err instanceof Error ? err.message : 'Failed to update provider');
    }
  }

  async function handleTest(row: ProviderRow) {
    setError(null);
    if (isMockData()) {
      setTestResults((prev) => ({
        ...prev,
        [row.id]: { status: 'CONNECTED', provider: row.provider_name, capability: row.capability, mode: 'MOCK' },
      }));
      return;
    }
    setTestingId(row.id);
    try {
      const result = await testProvider(row.id);
      setTestResults((prev) => ({ ...prev, [row.id]: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setError(null);
    setDeleteBusy(true);
    if (isMockData()) {
      applyDeleted(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteBusy(false);
      return;
    }
    try {
      await deleteProvider(deleteTarget.id);
      applyDeleted(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
    } finally {
      setDeleteBusy(false);
    }
  }

  const columns: Column<ProviderRow>[] = [
      {
        key: 'provider_name',
        header: 'Provider',
        render: (_value, row) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.provider_name}</span>
            <span className="font-mono text-xs text-foreground-muted">{row.model}</span>
          </div>
        ),
      },
      {
        key: 'provider_type',
        header: 'Type',
        render: (value) => {
          const type = value as ProviderType;
          return (
            <Badge variant="outline" className="font-mono">
              {PROVIDER_TYPE_LABELS[type] ?? String(value)}
            </Badge>
          );
        },
      },
      {
        key: 'capability',
        header: 'Capability',
        render: (_value, row) => (
          <div className="flex items-center gap-2">
            <span>{CAPABILITY_LABELS[row.capability] ?? row.capability}</span>
            {row.is_default && (
              <Badge variant="success">Default</Badge>
            )}
          </div>
        ),
      },
      {
        key: 'credential_masked',
        header: 'Credential',
        render: (value, row) =>
          row.has_credential ? (
            <span className="font-mono text-xs text-foreground-secondary" data-testid="provider-masked-credential">
              {String(value)}
            </span>
          ) : (
            <Badge variant="secondary">None</Badge>
          ),
      },
      {
        key: 'enabled',
        header: 'Enabled',
        render: (_value, row) => (
          <Switch
            checked={row.enabled}
            onCheckedChange={(next) => void handleToggle(row, next)}
            aria-label={`Toggle ${row.provider_name}`}
            data-testid="provider-enable-switch"
          />
        ),
      },
      {
        key: 'id',
        header: 'Test',
        render: (_value, row) => {
          const result = testResults[row.id];
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleTest(row)}
                loading={testingId === row.id}
                data-testid="provider-test-button"
              >
                <PlugZap size={14} />
                Test
              </Button>
              {result && (
                <Badge
                  variant={result.status === 'CONNECTED' ? 'success' : 'danger'}
                  data-testid="provider-test-result"
                >
                  {result.status} · {result.mode === 'MOCK' ? 'mock' : 'external'}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (_value, row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(row);
                setDialogOpen(true);
              }}
              aria-label={`Edit ${row.provider_name}`}
              data-testid="provider-edit-button"
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(row)}
              aria-label={`Delete ${row.provider_name}`}
              data-testid="provider-delete-button"
            >
              <Trash2 size={14} className="text-danger" />
            </Button>
          </div>
        ),
      },
    ];

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <WorkspaceHeader
          eyebrow="SECURITY"
          title="Provider Configuration"
          description="Administrator-only AI/media provider management"
        />
        <div
          className="flex items-start gap-3 rounded-md border border-border bg-surface-elevated px-4 py-3"
          data-testid="providers-denied"
        >
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-sm text-foreground-secondary">
            Only administrators can manage AI and media provider configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="SECURITY"
        title="Provider Configuration"
        description="AI and media providers, encrypted credentials and per-capability defaults"
      />

      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger-subtle bg-danger-subtle px-3 py-2 text-sm text-danger"
          data-testid="providers-error"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          data-testid="providers-add-button"
        >
          <Plus size={14} />
          Add provider
        </Button>
      </div>

      <div className="rounded-md border border-border bg-surface">
        {providers === null ? (
          <p className="px-4 py-8 text-center text-sm text-foreground-muted">
            Loading providers…
          </p>
        ) : (
          <Table
            columns={columns}
            data={providers}
            compact
            emptyMessage="No providers configured yet"
            className="px-2"
          />
        )}
      </div>

      {dialogOpen && (
        <ProviderFormDialog
          editing={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={(row, wasCreating) => {
            applySaved(row, wasCreating);
            setDialogOpen(false);
          }}
        />
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent onClose={() => setDeleteTarget(null)}>
            <DialogTitle>Delete provider</DialogTitle>
            <DialogDescription>
              Permanently remove „{deleteTarget.provider_name}“? Encrypted
              credentials are destroyed with it. This cannot be undone.
            </DialogDescription>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
                data-testid="provider-delete-cancel"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleteBusy}
                onClick={() => void handleDelete()}
                data-testid="provider-delete-confirm"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface ProviderFormDialogProps {
  editing: ProviderRow | null;
  onClose: () => void;
  onSaved: (row: ProviderRow, wasCreating: boolean) => void;
}

function ProviderFormDialog({ editing, onClose, onSaved }: ProviderFormDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    editing ? formFromRow(editing) : freshForm()
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function changeType(next: ProviderType) {
    const caps = CAPABILITIES_BY_TYPE[next];
    setForm((prev) => ({
      ...prev,
      provider_type: next,
      capability: caps.includes(prev.capability) ? prev.capability : caps[0],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const base = {
      provider_name: form.provider_name.trim(),
      provider_type: form.provider_type,
      capability: form.capability,
      model: form.model.trim(),
      base_url: form.base_url.trim() || null,
      enabled: form.enabled,
      is_default: form.is_default,
    };
    try {
      if (editing) {
        const payload: ProviderUpdatePayload = { ...base };
        if (form.clear_credential) {
          payload.clear_credential = true;
        } else if (form.credential.trim() !== '') {
          payload.credential = form.credential.trim();
        }
        const row = await updateProvider(editing.id, payload);
        onSaved(row, false);
      } else {
        const payload: ProviderCreatePayload = {
          ...base,
          credential: form.credential.trim() || null,
        };
        const row = await createProvider(payload);
        onSaved(row, true);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save provider');
      setSaving(false);
    }
  }

  const capabilities = CAPABILITIES_BY_TYPE[form.provider_type];
  const showClearCredential = editing !== null && editing.has_credential;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogTitle>{editing ? 'Edit provider' : 'Add provider'}</DialogTitle>
        <DialogDescription>
          {editing
            ? 'Update provider settings. Leave the credential blank to keep the stored key.'
            : 'Register an AI or media provider. Credentials are encrypted before storage.'}
        </DialogDescription>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="provider-name">Provider name</Label>
            <Input
              id="provider-name"
              value={form.provider_name}
              onChange={(e) => patch({ provider_name: e.target.value })}
              placeholder="e.g. OpenAI Investigation"
              data-testid="provider-name-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="provider-type">Type</Label>
              <Select
                id="provider-type"
                options={(Object.keys(PROVIDER_TYPE_LABELS) as ProviderType[]).map((t) => ({
                  value: t,
                  label: PROVIDER_TYPE_LABELS[t],
                }))}
                value={form.provider_type}
                onChange={(e) => changeType(e.target.value as ProviderType)}
                data-testid="provider-type-select"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="provider-capability">Capability</Label>
              <Select
                id="provider-capability"
                options={capabilities.map((c) => ({
                  value: c,
                  label: CAPABILITY_LABELS[c],
                }))}
                value={form.capability}
                onChange={(e) => patch({ capability: e.target.value as ProviderCapability })}
                data-testid="provider-capability-select"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="provider-model">Model</Label>
            <Input
              id="provider-model"
              value={form.model}
              onChange={(e) => patch({ model: e.target.value })}
              placeholder="e.g. gpt-4.1"
              data-testid="provider-model-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="provider-base-url">Base URL (optional)</Label>
            <Input
              id="provider-base-url"
              value={form.base_url}
              onChange={(e) => patch({ base_url: e.target.value })}
              placeholder="https://api.openai.com/v1"
              data-testid="provider-base-url-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="provider-credential">
              API credential{editing ? ' (optional)' : ''}
            </Label>
            <div className="relative">
              <Input
                id="provider-credential"
                type="password"
                autoComplete="new-password"
                value={form.credential}
                onChange={(e) => patch({ credential: e.target.value })}
                disabled={form.clear_credential}
                placeholder={
                  editing
                    ? 'Leave blank to keep the stored key'
                    : 'sk-… (write-only, encrypted at rest)'
                }
                data-testid="provider-credential-input"
              />
              <KeyRound
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted"
              />
            </div>
            {showClearCredential && (
              <Switch
                checked={form.clear_credential}
                onCheckedChange={(next) => patch({ clear_credential: next })}
                label="Clear stored credential"
                description="Remove the stored key; a new one is optional."
                data-testid="provider-clear-credential-switch"
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-3 pt-1">
            <Switch
              checked={form.enabled}
              onCheckedChange={(next) => patch({ enabled: next })}
              label="Enabled"
              description="Allow this provider to be resolved for its capability."
              data-testid="provider-enabled-switch"
            />
            <Switch
              checked={form.is_default}
              onCheckedChange={(next) => patch({ is_default: next })}
              label="Default for capability"
              description="Selected first when the capability has no explicit override."
              data-testid="provider-default-switch"
            />
          </div>

          {saveError && (
            <p
              role="alert"
              className="rounded-md border border-danger-subtle bg-danger-subtle px-3 py-2 text-sm text-danger"
              data-testid="provider-save-error"
            >
              {saveError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} data-testid="provider-cancel-button">
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={() => void handleSave()}
            data-testid="provider-save-button"
          >
            {editing ? 'Save changes' : 'Add provider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}