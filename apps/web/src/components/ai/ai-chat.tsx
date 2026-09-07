'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SendHorizonal, Sparkles, Loader2, Plus, X, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIStore } from '@/state/ai.store';
import { useInvestigationStore } from '@/state/investigation.store';
import { buildContextualPrompts } from '@/ai/contextual-prompts';
import { Tooltip, useReducedMotion } from '@trinetra-pulse/ui';
import type {
  AIContextScope,
  AISourceReference,
  AIAction,
} from '@trinetra-pulse/types';
import { AIMessageView } from './ai-message';

// ============================================================
// PHASE 10 — AI CHAT + COMPOSER (Phase 11.5 polish)
// ============================================================
// The conversation surface for the AI investigation panel. It is
// shared across desktop/tablet/mobile layouts by the surrounding
// panel shell. Source chips and read-only navigation actions are
// forwarded to the host shell via 'onSourceClick' / 'onAction'.
// The header carries the active investigation scope so the
// investigator always knows what the assistant is answering within.
// ============================================================

const MAX_SUGGESTED_STARTERS = 5;

export function AIChat({
  scope,
  onSourceClick,
  onAction,
  onClose,
}: {
  scope: AIContextScope;
  onSourceClick: (source: AISourceReference) => void;
  onAction: (action: AIAction) => void;
  onClose?: () => void;
}) {
  const messages = useAIStore((s) => s.messages);
  const isAsking = useAIStore((s) => s.isAsking);
  const streamingText = useAIStore((s) => s.streamingText);
  const streamState = useAIStore((s) => s.streamState);
  const lastError = useAIStore((s) => s.lastError);
  const ask = useAIStore((s) => s.ask);
  const newConversation = useAIStore((s) => s.newConversation);

  const investigation = useInvestigationStore((s) => s.data.investigation);
  const linkedEntities = useInvestigationStore((s) => s.data.entities);
  const reduced = useReducedMotion();

  const suggestions = buildContextualPrompts({
    scope,
    investigation,
    entityNames: linkedEntities.map((e) => e.name),
  }).slice(0, MAX_SUGGESTED_STARTERS);

  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const showEmptyState = messages.length === 0 && !isAsking;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, streamingText, isAsking]);

  const submit = async (text: string) => {
    const value = text.trim();
    if (!value || isAsking) return;
    setInput('');
    await ask(value, scope);
  };

  const scopeLabel = investigation ? `Answering within ${investigation.title}` : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header: assistant identity + active investigation scope */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ai-subtle text-ai">
            <BrainCircuit className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-foreground leading-tight">
              Investigation assistant
            </p>
            {scopeLabel && (
              <p
                className={cn(
                  'truncate text-[10px] text-foreground-muted leading-tight',
                  reduced ? 'transition-none' : 'tp-transition-fast'
                )}
              >
                {scopeLabel}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip content="Start a new conversation">
            <button
              type="button"
              onClick={newConversation}
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground-secondary"
              aria-label="New conversation"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          {onClose && (
            <Tooltip content="Close AI panel">
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground"
                aria-label="Close AI panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 scrollbar-thin">
        {showEmptyState ? (
          <EmptyState starters={suggestions} onPick={(s) => submit(s)} />
        ) : (
          messages.map((m) => (
            <AIMessageView
              key={m.id}
              message={m}
              onSourceClick={onSourceClick}
              onAction={onAction}
            />
          ))
        )}

        {isAsking && streamState === 'streaming' && (
          <StreamingIndicator text={streamingText} reduced={reduced} />
        )}

        {lastError && !isAsking && (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-subtle/40 px-3 py-2 text-caption text-danger"
          >
            {lastError}
          </p>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border/60 p-3">
        {messages.length > 0 && (
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={submit}
            disabled={isAsking}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({ starters, onPick }: { starters: string[]; onPick: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center" data-testid="ai-empty-state">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ai-subtle text-ai">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-body-sm font-semibold text-foreground">Ask about this investigation</p>
        <p className="max-w-[260px] text-caption text-foreground-muted">
          Grounded answers use the currently selected entity, network and
          investigation context. Nothing is invented.
        </p>
      </div>
      <div className="grid w-full gap-1.5">
        {starters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-lg border border-border/60 bg-surface-elevated px-3 py-2 text-left text-caption text-foreground-secondary tp-transition hover:border-ai/40 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="Ask about the current scope…"
        className="min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-body-sm text-foreground outline-none placeholder:text-foreground-muted focus-visible:border-ai/50 focus-visible:ring-2 focus-visible:ring-ai/30"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(value);
          }
        }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-ai text-white tp-transition hover:bg-ai/90 disabled:opacity-40"
        aria-label="Send"
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendHorizonal className="h-4 w-4" />
        )}
      </button>
    </form>
  );
}

function StreamingIndicator({ text, reduced }: { text: string; reduced: boolean }) {
  return (
    <div className="flex gap-2.5" data-testid="ai-streaming-indicator">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ai-subtle text-ai">
        <Loader2 className={cn('h-3.5 w-3.5', !reduced && 'animate-spin')} />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border/60 bg-surface-elevated px-3 py-2.5 text-body-sm text-foreground-secondary">
        {text ? (
          <span className="whitespace-pre-wrap">{text}</span>
        ) : (
          <span className={cn('inline-flex items-center gap-1', !reduced && 'animate-pulse')}>
            <span className="h-1.5 w-1.5 rounded-full bg-ai" />
            <span className="h-1.5 w-1.5 rounded-full bg-ai" />
            <span className="h-1.5 w-1.5 rounded-full bg-ai" />
          </span>
        )}
      </div>
    </div>
  );
}