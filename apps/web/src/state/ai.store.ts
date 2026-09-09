import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  AIMessage,
  AIConversation,
  AIContextScope,
  AIStreamingState,
  AIAction,
} from '@trinetra-pulse/types';
import { aiInvestigationService } from '@/services/ai-investigation.service';

// ============================================================
// PHASE 10 — AI ASSISTANT STORE
// ============================================================
// View-layer state for the AI investigation panel. Owns the
// conversation messages for the CURRENT investigation only
// (conversation memory is scoped — no cross-investigation carry),
// the panel's presence/layout (desktop panel / tablet drawer /
// mobile bottom sheet), streaming state, and pending read-only
// navigation actions the user may initiate.
// ============================================================

export type AIPanelMode = 'closed' | 'panel' | 'drawer' | 'sheet';

interface AIState {
  // Panel state
  mode: AIPanelMode;
  open: boolean;
  width: number;

  // Conversation (scoped to investigation + user/session)
  conversationId: string | null;
  investigationId: string | null;
  userId: string | null;
  title: string;
  messages: AIMessage[];
  status: AIConversation['status'];

  // Streaming / input
  isAsking: boolean;
  streamState: AIStreamingState;
  streamingText: string;
  lastError: string | null;

  // Context scope captured at ask time
  lastScope: AIContextScope | null;

  // Pending read-only navigation actions surfaced to the user
  pendingActions: AIAction[];

  // ---------- Actions ----------
  openPanel: (mode?: AIPanelMode) => void;
  closePanel: () => void;
  setMode: (mode: AIPanelMode) => void;
  setWidth: (width: number) => void;

  setScope: (investigationId: string | null, userId?: string | null) => void;
  newConversation: () => void;
  clearContext: () => void;

  ask: (text: string, scope: AIContextScope) => Promise<boolean>;
  runAction: (action: AIAction) => void;
  resolveAction: (type: AIAction['type']) => void;
}

let interactionSeq = 0;

export const useAIStore = create<AIState>()(
  devtools(
    (set, get) => ({
      mode: 'panel',
      open: false,
      width: 380,
      conversationId: null,
      investigationId: null,
      userId: null,
      title: 'Investigation assistant',
      messages: [],
      status: 'active',
      isAsking: false,
      streamState: 'idle',
      streamingText: '',
      lastError: null,
      lastScope: null,
      pendingActions: [],

      openPanel: (mode) =>
        set((s) => ({ open: true, mode: mode ?? s.mode })),
      closePanel: () => set({ open: false, streamState: 'idle' }),
      setMode: (mode) => set({ mode }),
      setWidth: (width) => set({ width: Math.max(300, Math.min(520, width)) }),

      setScope: (investigationId, userId) => {
        // Undefined userId means "no user change" (keep the current one).
        const nextUserId = userId === undefined ? get().userId : userId;
        // Only reset the conversation when the investigation or user changes.
        if (get().investigationId !== investigationId || get().userId !== nextUserId) {
          set({
            investigationId,
            userId: nextUserId ?? null,
            conversationId: null,
            messages: [],
            title: 'Investigation assistant',
            status: 'active',
            pendingActions: [],
            lastScope: null,
          });
        }
      },

      newConversation: () =>
        set((s) => ({
          conversationId: null,
          messages: [],
          title: 'Investigation assistant',
          status: 'active',
          pendingActions: [],
          lastScope: null,
        })),

      clearContext: () =>
        set((s) => ({
          lastScope: null,
          // Keep the conversation but drop any asserted context scope.
        })),

      ask: async (text, scope) => {
        const { isAsking } = get();
        if (isAsking || !text.trim()) return false;

        const userMessage: AIMessage = {
          id: `m-${Date.now()}-${interactionSeq++}`,
          conversationId: get().conversationId ?? `conv-${Date.now()}-${interactionSeq++}`,
          role: 'user',
          content: text,
          createdAt: new Date().toISOString(),
        };

        if (!get().conversationId) {
          set((s) => ({
            conversationId: userMessage.conversationId,
            title: titleFor(text),
          }));
        }

        set((s) => ({
          messages: [...s.messages, userMessage],
          isAsking: true,
          streamState: 'streaming',
          streamingText: '',
          lastError: null,
          lastScope: scope,
          pendingActions: [],
        }));

        const history = get().messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.role === 'assistant' ? (m.response?.answer ?? m.content) : m.content,
          }));

        try {
          const response = await aiInvestigationService.answer({
            text,
            scope,
            history,
            userId: get().userId ?? undefined,
          });

          // The investigator may have switched cases (setScope resets the
          // conversation) while the request was in flight — a stale answer
          // must never be appended into another investigation's thread.
          if (get().investigationId !== scope?.investigationId) {
            set({ isAsking: false, streamState: 'complete', streamingText: '', lastError: null });
            return false;
          }

          const assistantMessage: AIMessage = {
            id: `m-${Date.now()}-${interactionSeq++}`,
            conversationId: get().conversationId!,
            role: 'assistant',
            content: response.answer,
            response,
            createdAt: new Date().toISOString(),
          };

          set((s) => ({
            messages: [...s.messages, assistantMessage],
            isAsking: false,
            streamState: 'complete',
            streamingText: '',
            pendingActions: response.suggestedActions,
          }));
          return true;
        } catch (err) {
          if (get().investigationId !== scope?.investigationId) {
            set({ isAsking: false, streamState: 'complete', streamingText: '', lastError: null });
            return false;
          }
          set({
            isAsking: false,
            streamState: 'error',
            lastError: err instanceof Error ? err.message : 'The assistant could not complete the request.',
          });
          return false;
        }
      },

      runAction: (action) => {
        // Mark executing locally; navigation is initiated by the host shell.
        set((s) => ({
          pendingActions: s.pendingActions.map((a) =>
            a.id === action.id ? { ...a, status: 'executing' } : a
          ),
        }));
        emitAction(action);
      },

      resolveAction: (type) =>
        set((s) => ({
          pendingActions: s.pendingActions.filter((a) => a.type !== type),
        })),
    }),
    { name: 'trinetra-ai' }
  )
);

function titleFor(text: string): string {
  const t = text.trim();
  if (t.length <= 40) return t;
  return `${t.slice(0, 40)}…`;
}

// Host-shell bridge: navigation actions are read-only and user-initiated.
// The shell registers a listener to translate ALOWED action types into
// inspector/route actions. If no listener is registered, the action is
// resolved immediately (no-op) so it is not left hanging.
let actionListener: ((action: AIAction) => void) | null = null;

export function registerAIActionListener(listener: (action: AIAction) => void) {
  actionListener = listener;
}

export function unregisterAIActionListener() {
  actionListener = null;
}

function emitAction(action: AIAction) {
  if (actionListener) {
    actionListener(action);
  } else {
    useAIStore.getState().resolveAction(action.type);
  }
}
