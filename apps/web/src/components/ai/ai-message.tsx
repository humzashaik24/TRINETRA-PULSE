'use client';

import { cn } from '@/lib/utils';
import type { AIMessage, AISourceReference, AIAction } from '@trinetra-pulse/types';
import {
  AIAtomMark,
  AISourceChipList,
} from './ai-source-chip';

// ============================================================
// PHASE 10 — AI MESSAGE
// ============================================================
// Renders one turn of the investigation conversation. Assistant
// responses surface: the answer, key points, type-specific
// confidence, limitations (neutral wording honoured), grounded
// source chips, and user-initiated read-only navigation actions.
// ============================================================

export function AIConfidencePill({
  confidence,
}: {
  confidence: { answerGrounding: number; [k: string]: number | undefined };
}) {
  const entries = Object.entries(confidence).filter(
    ([, v]) => typeof v === 'number' && v >= 0
  );
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 text-caption text-foreground-muted">
      {entries.map(([k, v]) => (
        <span
          key={k}
          className="rounded border border-border/50 bg-surface-elevated px-1.5 py-0.5"
          title={`Confidence: ${k}`}
        >
          {k}
          <span className="font-semibold text-foreground/80">
            {' '}
            {Math.round((v ?? 0) * 100)}%
          </span>
        </span>
      ))}
    </div>
  );
}

export function AIMessageView({
  message,
  onSourceClick,
  onAction,
}: {
  message: AIMessage;
  onSourceClick: (source: AISourceReference) => void;
  onAction: (action: AIAction) => void;
}) {
  const isUser = message.role === 'user';
  const response = message.response;

  return (
    <div className={cn('flex w-full gap-2.5', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-caption font-semibold',
          isUser ? 'bg-brand-subtle text-brand' : 'bg-ai-subtle text-ai'
        )}
        aria-hidden="true"
      >
        <AIAtomMark type={isUser ? 'You' : 'AI'} />
      </div>

      <div
        className={cn(
          'min-w-0 max-w-[85%] space-y-2 rounded-2xl px-3 py-2.5 text-body-sm',
          isUser
            ? 'rounded-tr-sm bg-brand-subtle/60 text-foreground'
            : 'rounded-tl-sm border border-border/60 bg-surface-elevated text-foreground'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ai">
                Assistant
              </span>
              {response?.status === 'not_found' && (
                <span className="rounded border border-warning/40 bg-warning-subtle/60 px-1.5 py-0.5 text-caption font-medium text-warning">
                  Not enough context
                </span>
              )}
            </div>

            {response ? (
              <AnswerBody
                answer={response.answer}
                keyPoints={response.keyPoints}
                status={response.status}
                onSourceClick={onSourceClick}
                onAction={onAction}
                sources={response.sources}
                actions={response.suggestedActions}
              />
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AnswerBody({
  answer,
  keyPoints,
  status,
  sources,
  actions,
  onSourceClick,
  onAction,
}: {
  answer: string;
  keyPoints?: string[];
  status: string;
  sources: AISourceReference[];
  actions: AIAction[];
  onSourceClick: (source: AISourceReference) => void;
  onAction: (action: AIAction) => void;
}) {
  return (
    <div className="space-y-2.5">
      {status !== 'not_found' && (
        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
          {answer}
        </p>
      )}

      {keyPoints && keyPoints.length > 0 && (
        <ul className="space-y-1">
          {keyPoints.map((k, i) => (
            <li key={i} className="flex gap-1.5 text-body-sm text-foreground-secondary">
              <span className="text-ai">•</span>
              <span>{k}</span>
            </li>
          ))}
        </ul>
      )}

      {(sources ?? []).length > 0 && (
        <div className="border-t border-border/50 pt-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-foreground-muted">
            Sources
          </p>
          <AISourceChipList
            sources={sources}
            onSourceClick={onSourceClick}
          />
        </div>
      )}

      {(actions ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
          {(actions ?? []).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onAction(a)}
              disabled={a.status === 'executing'}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-surface-hover/50 px-2 py-1 text-caption font-medium text-foreground/80 transition-colors hover:border-ai/50 hover:text-ai disabled:opacity-60"
            >
              {a.status === 'executing' ? 'Opening…' : a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
