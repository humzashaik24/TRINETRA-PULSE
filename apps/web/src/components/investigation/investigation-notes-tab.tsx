'use client';

import { useState } from 'react';
import { Plus, StickyNote, Pencil, Trash2, Check, X } from 'lucide-react';
import { Badge, Button, Input } from '@trinetra-pulse/ui';
import { useInvestigationStore } from '@/state/investigation.store';
import { formatDateTime } from '@/lib/format';

// ============================================================
// INVESTIGATION — NOTES TAB
// ============================================================
// Free-form investigator notes scoped to the investigation.
// Supports create, edit and delete with inline editing.
// ============================================================

export function InvestigationNotesTab() {
  const notes = useInvestigationStore((s) => s.data.notes);
  const addNote = useInvestigationStore((s) => s.addNote);
  const editNote = useInvestigationStore((s) => s.editNote);
  const removeNote = useInvestigationStore((s) => s.removeNote);

  const [formOpen, setFormOpen] = useState(false);
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const submit = () => {
    if (!body.trim()) return;
    addNote({ author: 'Current investigator', body: body.trim(), category: category.trim() || null });
    setBody('');
    setCategory('');
    setFormOpen(false);
  };

  return (
    <div className="space-y-4" data-testid="investigation-notes-tab">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">{notes.length} note{notes.length === 1 ? '' : 's'}</p>
        <Button size="sm" variant="secondary" onClick={() => setFormOpen((o) => !o)} data-testid="add-note-button">
          <Plus className="h-3.5 w-3.5" />
          New note
        </Button>
      </div>

      {formOpen && (
        <div className="rounded-xl border border-border bg-surface p-4" data-testid="note-form">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (optional)" aria-label="Note category" />
          </div>
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a note…"
            aria-label="Note body"
            className="mt-3"
            data-testid="note-body-input"
          />
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={submit} data-testid="note-submit">
              <Plus className="h-3.5 w-3.5" />
              Save note
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-muted">
          No notes yet.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-border bg-surface p-4" data-testid="note-row">
              {editingId === n.id ? (
                <div className="space-y-3">
                  <Input value={editBody} onChange={(e) => setEditBody(e.target.value)} aria-label="Edit note" />
                  <div className="flex items-center gap-2">
                    <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category" aria-label="Note category" className="max-w-xs" />
                    <Button
                      size="sm"
                      onClick={() => {
                        editNote(n.id, { body: editBody.trim(), category: editCategory.trim() || null });
                        setEditingId(null);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
                      <div>
                        {n.category && <Badge variant="default" size="sm">{n.category}</Badge>}
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{n.body}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingId(n.id);
                          setEditBody(n.body);
                          setEditCategory(n.category ?? '');
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground"
                        aria-label={`Edit note`}
                        data-testid={`edit-note-${n.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeNote(n.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-danger-subtle hover:text-danger"
                        aria-label="Delete note"
                        data-testid={`delete-note-${n.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-foreground-muted">
                    by {n.author} · {formatDateTime(n.created_at)}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
