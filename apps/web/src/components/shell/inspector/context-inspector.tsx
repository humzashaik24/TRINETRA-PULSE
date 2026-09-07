'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useShellStore, type InspectorContext } from '@/state/shell.store';
import { useAnalyticsStore } from '@/state/analytics.store';
import { useInvestigationStore } from '@/state/investigation.store';
import { InspectorHeader } from './inspector-header';
import { InspectorContent } from './inspector-content';
import { journeyHref, DEMO_NETWORK_ID } from '@/navigation/journey';
import type { EntityType } from '@trinetra-pulse/types';
import { confirmRelationship, rejectRelationship } from '@/services/relationship-intelligence.service';

// ============================================================
// PHASE 3.5 — CONTEXT INSPECTOR PANEL
// ============================================================
// Renders the currently selected context. Handles focus
// management (focus panel on open, restore trigger on close),
// Escape-to-close, and contextual navigation actions.
// Position/dimensions are controlled by WorkspaceShell.
// ============================================================

export interface ContextInspectorProps {
  variant?: 'panel' | 'drawer';
  onClose?: () => void;
  className?: string;
}

export function ContextInspector({ variant = 'panel', onClose, className }: ContextInspectorProps) {
  const router = useRouter();

  const context = useShellStore((s) => s.inspectorContext);
  const isOpen = useShellStore((s) => s.inspectorOpen);
  const closePanel = useShellStore((s) => s.closeInspector);
  const selectContext = useShellStore((s) => s.selectContext);

  const headerRef = useRef<HTMLDivElement>(null);
  const triggerElRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const handleClose = useCallback(() => {
    closePanel?.();
    onClose?.();
  }, [closePanel, onClose]);

  // Build a stable key for the selected context so related view data
  // re-resolves only when the selection actually changes.
  const contextKey = context
    ? `${context.type}:${context.id}:primary`
    : 'empty';
  const title = context ? contextTitle(context) : 'Inspector';

  // Focus management: remember the triggering element when the panel
  // opens, move focus into the panel, and restore on close.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      triggerElRef.current = document.activeElement as HTMLElement | null;
      if (headerRef.current) headerRef.current.focus();
    }
    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      const trigger = triggerElRef.current;
      if (trigger && document.contains(trigger)) {
        trigger.focus({ preventScroll: true });
      }
      triggerElRef.current = null;
    }
  }, [isOpen]);

  // Escape to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  if (!context) return null;

  const entityType = context.type === 'entity' ? (context.entityType ?? 'person') : undefined;

  const openEntity = (id: string) => {
    router.push(`/entities/${id}`);
    handleClose();
  };

  const inspectEntity = (e: { id: string; name: string; type: string }) => {
    selectContext({
      type: 'entity',
      id: e.id,
      name: e.name,
      entityType: e.type as EntityType,
    });
  };

  const inspectFinding = (f: { id: string; title: string }) => {
    selectContext({
      type: 'finding',
      id: f.id,
      title: f.title,
      investigationId: useInvestigationStore.getState().investigationId ?? undefined,
    });
  };

  const openEntityInNetwork = (e: { id: string; investigationId?: string }) => {
    const investigationId =
      e.investigationId ??
      (context.type === 'entity' ? context.investigationId : undefined) ??
      useInvestigationStore.getState().investigationId;
    router.push(
      journeyHref(`/networks/${DEMO_NETWORK_ID}`, {
        investigation: investigationId ?? undefined,
        focus: e.id,
      })
    );
    handleClose();
  };

  // Phase 21 — relationship-intelligence review. The web app has no role
  // store, so review is shown by default; the backend enforces RBAC
  // (auditors cannot confirm/reject) and actor identity is taken from the
  // authenticated context, never from the client.
  const canReview = true;

  const reviewRelationship = async (decision: 'confirm' | 'reject') => {
    if (context.type !== 'relationship' || !context.id) return;
    try {
      if (decision === 'confirm') {
        await confirmRelationship(context.id);
      } else {
        await rejectRelationship(context.id);
      }
      // Re-select the context so the inspector re-resolves fresh intelligence.
      selectContext({ ...context });
    } catch {
      // Surface nothing here; the panel stays on the previous decision state.
    }
  };

  const primaryOpen = () => {
    if (context.type === 'entity') {
      openEntity(context.id);
      return;
    }
    const routeMap: Partial<Record<InspectorContext['type'], string>> = {
      relationship: '/networks',
      dataset: '/data-intelligence',
      finding: '/patterns',
      evidence: '/evidence',
      network: '/networks',
      case: '/investigations',
      centrality: undefined,
      community: undefined,
      component: undefined,
      pattern: undefined,
    };
    let route = routeMap[context.type] as string | undefined;
    // Investigation-scoped objects open inside the investigation
    // workspace at the matching tab so context is never lost.
    if (context.type === 'evidence' || context.type === 'finding') {
      const investigationId = context.investigationId;
      if (investigationId) {
        const tab = context.type === 'evidence' ? 'evidence' : 'findings';
        route = `/investigations/${investigationId}?tab=${tab}`;
      }
    }
    if (route === undefined && isAnalyticsContext(context.type)) {
      const networkId = useAnalyticsStore.getState().networkId;
      route = networkId ? `/networks/${networkId}/analytics` : '/networks';
    }
    if (route) {
      router.push(route);
      handleClose();
    }
  };

  return (
    <div
      className={`flex h-full flex-col bg-surface ${className ?? ''}`}
      data-testid="context-inspector"
      data-variant={variant}
    >
      <div
        ref={headerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={false}
        aria-label={`${title} inspector`}
        className="outline-none"
      >
        <InspectorHeader
          contextType={context.type}
          title={title}
          onClose={handleClose}
        />
      </div>
      <InspectorContent context={context} contextKey={contextKey} onOpen={primaryOpen} onInspectEntity={inspectEntity} onInspectFinding={inspectFinding} onOpenNetwork={openEntityInNetwork} onConfirmRelationship={() => reviewRelationship('confirm')} onRejectRelationship={() => reviewRelationship('reject')} canReview={canReview} />
    </div>
  );
}

function isAnalyticsContext(type: InspectorContext['type']): boolean {
  return type === 'centrality' || type === 'community' || type === 'component' || type === 'pattern';
}

function contextTitle(ctx: InspectorContext): string {
  switch (ctx.type) {
    case 'entity':
      return ctx.name ?? ctx.id;
    case 'relationship':
      return ctx.sourceEntityName ?? ctx.id;
    case 'dataset':
      return ctx.name ?? ctx.id;
    case 'finding':
      return ctx.title ?? ctx.id;
    case 'evidence':
      return ctx.title ?? ctx.id;
    case 'network':
      return ctx.label ?? ctx.id;
    case 'case':
      return ctx.label ?? ctx.id;
    case 'centrality':
      return ctx.entityName ?? ctx.entityId ?? ctx.id;
    case 'community':
      return ctx.label ?? ctx.id;
    case 'component':
      return ctx.label ?? ctx.id;
    case 'pattern':
      return ctx.title ?? ctx.id;
    default:
      return 'Inspector';
  }
}