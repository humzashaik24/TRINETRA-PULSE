'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@trinetra-pulse/ui';
import { useCanvasStore } from './canvas-store';
import { useInvestigationStore } from '@/state/investigation.store';
import {
  askCanvasAssistant,
  canvasQuickActions,
  type CanvasSelectionKind,
} from './lib/ai-context';
import type { CanvasChatMessage } from './canvas-types';

// ============================================================
// KNOWLEDGE CANVAS — INVESTIGATOR (GROUNDED AI)
// ============================================================
// Asks the Trinetra backend Investigator about the current investigation
// and the selected canvas objects. Answers can surface sources and
// limitations. Provider keys stay server-side — the backend owns provider
// routing and key storage; nothing is stored in this browser.
// ============================================================

export function AiPanel({
  investigationId,
  disabled,
  loaded,
}: {
  investigationId: string;
  disabled: boolean;
  loaded: boolean;
}) {
  const aiOpen = useCanvasStore((s) => s.aiOpen);
  const messages = useCanvasStore((s) => s.messages);
  const pushMessage = useCanvasStore((s) => s.pushMessage);
  const clearMessages = useCanvasStore((s) => s.clearMessages);
  const setAiOpen = useCanvasStore((s) => s.setAiOpen);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const editingEdgeId = useCanvasStore((s) => s.editingEdgeId);

  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  // ------------------------------------------------------------
  // Selection-derived quick actions — bounded to the object currently
  // being looked atholistic. Never broad for a selection.
  // ------------------------------------------------------------
  const quickActions = useMemo(() => {
    const canvas = useCanvasStore.getState();
    if (selectedNodeId) {
      const node = canvas.nodes.find((candidate) => candidate.id === selectedNodeId);
      if (node) {
        const kind: CanvasSelectionKind =
          node.data.kind === 'evidence'
            ? 'evidence'
            : node.data.kind === 'finding'
              ? 'finding'
              : node.data.kind === 'entity'
                ? 'entity'
                : 'none';
        return canvasQuickActions({ kind, label: node.data.label });
      }
    }
    if (editingEdgeId) {
      const edge = canvas.edges.find((candidate) => candidate.id === editingEdgeId);
      const edgeLabel =
        typeof edge?.data?.label === 'string'
          ? edge.data.label
          : typeof edge?.label === 'string'
            ? edge.label
            : undefined;
      return canvasQuickActions({
        kind: 'relationship',
        label: edgeLabel,
      });
    }    return canvasQuickActions({ kind: 'none' });
  }, [selectedNodeId, editingEdgeId]);

  useEffect(() => {
    if (!aiOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAiOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aiOpen, setAiOpen]);

  const submit = useCallback(
    async (question: string) => {
      if (!question || busy) return;
      const canvas = useCanvasStore.getState();
      const node = selectedNodeId ? canvas.nodes.find((n) => n.id === selectedNodeId) : null;
      const edge = editingEdgeId ? canvas.edges.find((edge) => edge.id === editingEdgeId) : null;
      canvas.pushMessage({ id: canvas.nextLocalId(), role: 'user', content: question });
      setBusy(true);
      const data = useInvestigationStore.getState().data;
      try {
        const response = await askCanvasAssistant({
          investigationId,
          question,
          data,
          selectedEntityId:
            node?.data.kind === 'entity' && node.data.refId ? node.data.refId : undefined,
          selectedEvidenceId:
            node?.data.kind === 'evidence' && node.data.refId ? node.data.refId : undefined,
          selectedFindingId:
            node?.data.kind === 'finding' && node.data.refId ? node.data.refId : undefined,
          selectedRelationshipId: edge?.data?.refId ?? undefined,
        });
        pushMessage({
          id: response.id,
          role: 'assistant',
          content: response.answer,
          confidence: response.confidence?.answerGrounding ?? undefined,
          sources: (response.sources ?? []).slice(0, 6).map((s) => ({
            id: s.id,
            sourceType: s.sourceType,
            label: s.label,
          })),
          limitations: response.limitations ?? [],
        });
      } catch (err) {
        pushMessage({
          id: useCanvasStore.getState().nextLocalId(),
          role: 'assistant',
          content: `Could not resolve this context. ${err instanceof Error ? err.message : ''} Re-selecting the object or refreshing the investigation may help.`,
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, selectedNodeId, editingEdgeId, investigationId, pushMessage],
  );

  const ask = async () => {
    const question = draft.trim();
    if (!question || busy) return;
    setDraft('');
    await submit(question);
  };

  const runQuickAction = (prompt: string) => {
    setDraft(prompt);
    void submit(prompt);
  };

  if (!aiOpen) return null;

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    void ask();
  };

  return (
    <aside
      data-testid="canvas-ai-panel"
      className="pointer-events-auto flex w-full flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
    >
      <header className="flex items-center justify-between border-b border-border-subtle px-3.5 py-2.5">
        <div>
          <h2 className="text-subheading text-foreground font-semibold flex items-center gap-1.5">
            <span>✨</span> AI Investigation
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
            grounded in active investigation
          </p>
        </div>
        <Button variant="ghost" size="sm" data-testid="canvas-ai-close" onClick={() => setAiOpen(false)}>
          Close
        </Button>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
        {messages.length === 0 && (
          <p className="text-caption text-foreground-muted leading-relaxed">
            Ask about the entities, evidence and relationships on the canvas.
            Answers are strictly grounded in Trinetra canonical objects.
          </p>
        )}
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
        {busy && (
          <p className="text-caption text-foreground-muted flex items-center gap-2" aria-busy="true">
            <span className="inline-block h-2 w-2 rounded-full bg-brand animate-pulse"></span>
            Investigator is analyzing context…
          </p>
        )}
      </div>

      <form onSubmit={onSend} className="border-t border-border-subtle p-3 space-y-2">
        {quickActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {quickActions.map((qa) => (
              <button
                key={qa.id}
                type="button"
                onClick={() => runQuickAction(qa.prompt)}
                disabled={busy || disabled || !loaded}
                className="rounded-md border border-border bg-surface-elevated px-2 py-1 text-[11px] font-mono text-foreground-secondary hover:border-brand hover:text-foreground hover:bg-surface-active transition-colors disabled:opacity-50"
              >
                {qa.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            data-testid="canvas-ai-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={disabled || busy || !loaded}
            placeholder="Ask the Investigator about this case…"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-label text-foreground placeholder:text-foreground-muted"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            data-testid="canvas-ai-send"
            disabled={!draft.trim() || busy || disabled || !loaded}
          >
            Ask
          </Button>
        </div>
        <p className="text-[10px] font-mono text-foreground-muted">
          Server-side provider routing · key protection active
        </p>
      </form>
    </aside>
  );
}

function ChatMessageBubble({ message }: { message: CanvasChatMessage }) {
  return (
    <div
      data-testid={`canvas-ai-message-${message.role}`}
      className={
        'rounded-md px-3 py-2 text-body-sm ' +
        (message.role === 'user'
          ? 'ml-6 bg-surface-elevated text-foreground'
          : 'mr-6 border border-border-subtle bg-surface-elevated/50 text-foreground')
      }
    >
      <p className="whitespace-pre-wrap">{message.content}</p>
      {(message.sources ?? []).length > 0 && (
        <p className="mt-1 font-mono text-overline text-foreground-muted">
          sources: {(message.sources ?? []).slice(0, 6).map((s) => s.sourceType).join('; ')}
        </p>
      )}
      {typeof message.confidence === 'number' && (
        <p className="mt-1 font-mono text-overline text-foreground-muted">
          confidence {Math.round(message.confidence * 100)}%
        </p>
      )}
      {(message.limitations ?? []).length > 0 && (
        <p className="mt-1 text-caption text-foreground-muted">
          limits: {message.limitations!.slice(0, 2).join('; ')}
        </p>
      )}
    </div>
  );
}
