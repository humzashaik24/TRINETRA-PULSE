'use client';

import { useState } from 'react';
import { Link as LinkIcon, Trash2, Plus, Search } from 'lucide-react';
import { Badge, EntityTypeIcon, Input, Button } from '@trinetra-pulse/ui';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { getEntityLinkCandidates } from '@/services/investigation.service';
import type { EntityOption } from '@/services/investigation.service';
import { formatPercent, ENTITY_TYPE_LABELS } from '@/lib/format';

// ============================================================
// INVESTIGATION — ENTITIES TAB
// ============================================================
// Lists entities linked into the investigation. Selecting opens
// the shell inspector in place. Supports linking additional
// canonical entities and unlinking existing ones. Each linked
// entity carries provenance (linkedBy / linkedAt).
// ============================================================

export function InvestigationEntitiesTab() {
  const entities = useInvestigationStore((s) => s.data.entities);
  const linkEntity = useInvestigationStore((s) => s.linkEntity);
  const unlinkEntity = useInvestigationStore((s) => s.unlinkEntity);
  const selectContext = useShellStore((s) => s.selectContext);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState<EntityOption[] | null>(null);
  const [query, setQuery] = useState('');

  const openPicker = () => {
    setCandidates(getEntityLinkCandidates(useInvestigationStore.getState().investigationId ?? ''));
    setQuery('');
    setPickerOpen(true);
  };

  const visible = (candidates ?? []).filter((c) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4" data-testid="investigation-entities-tab">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          {entities.length} linked entit{entities.length === 1 ? 'y' : 'ies'}
        </p>
        <Button size="sm" variant="secondary" onClick={openPicker} data-testid="add-entity-button">
          <Plus className="h-3.5 w-3.5" />
          Link entity
        </Button>
      </div>

      {pickerOpen && (
        <div className="rounded-xl border border-border bg-surface p-4" data-testid="entity-picker">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Link a canonical entity</h3>
            <Button size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>
              Close
            </Button>
          </div>
          <div className="relative mb-3 max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search candidate entities…"
              className="pl-8"
              aria-label="Search entities"
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {visible.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-surface-hover"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <EntityTypeIcon type={c.entityType} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-[11px] text-foreground-muted">
                      {ENTITY_TYPE_LABELS[c.entityType] ?? c.entityType} · confidence {formatPercent(c.confidence)}
                    </p>
                  </div>
                </div>
                {c.alreadyLinked ? (
                  <Badge variant="default" size="sm">
                    Linked
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      linkEntity({
                        entity_id: c.id,
                        name: c.name,
                        entity_type: c.entityType,
                        role: 'Referenced',
                        association_confidence: c.confidence,
                        linked_by: 'Current investigator',
                      });
                      setCandidates(getEntityLinkCandidates(useInvestigationStore.getState().investigationId ?? ''));
                    }}
                    data-testid={`link-entity-${c.id}`}
                  >
                    <LinkIcon className="h-3 w-3" />
                    Link
                  </Button>
                )}
              </div>
            ))}
            {visible.length === 0 && (
              <p className="py-6 text-center text-sm text-foreground-muted">No matching entities.</p>
            )}
          </div>
        </div>
      )}

      {entities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-muted">
          No entities linked yet. Use “Link entity” to reference canonical records.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground-muted">
                  <th className="px-4 py-2.5 font-medium">Entity</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Association</th>
                  <th className="px-4 py-2.5 font-medium">Linked by</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {entities.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-2">
                      <button
                        className="flex items-center gap-2 text-left"
                        onClick={() =>
                          selectContext({
                            type: 'entity',
                            id: e.entity_id,
                            name: e.name,
                            entityType: e.entity_type,
                          })
                        }
                        data-testid={`entity-row-${e.entity_id}`}
                      >
                        <EntityTypeIcon type={e.entity_type} size="sm" />
                        <span className="font-medium text-foreground">{e.name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-2 text-foreground-secondary">{e.role}</td>
                    <td className="px-4 py-2">
                      <Badge variant="info" size="sm">
                        {formatPercent(e.association_confidence)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-foreground-muted">{e.linked_by}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => unlinkEntity(e.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-danger-subtle hover:text-danger"
                        aria-label={`Unlink ${e.name}`}
                        data-testid={`unlink-entity-${e.entity_id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
