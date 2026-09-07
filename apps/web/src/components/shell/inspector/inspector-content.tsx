'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Skeleton, EmptyState, ErrorState } from '@trinetra-pulse/ui';
import { SearchX } from 'lucide-react';
import {
  EntityContextView,
  RelationshipContextView,
  DatasetContextView,
  FindingContextView,
  EvidenceContextView,
  NetworkContextView,
  CaseContextView,
  CentralityContextView,
  CommunityContextView,
  ComponentContextView,
  PatternContextView,
  InvestigationContextView,
  NoteContextView,
  EventContextView,
  AnalyticsSnapshotContextView,
  type ViewActions,
} from './context-views';
import {
  resolveInspectorContext,
  type InspectorResolution,
} from '@/services/inspector.service';
import type { InspectorContext, InspectorContextType } from '@/state/shell.store';

// ============================================================
// PHASE 3.5 — INSPECTOR CONTENT
// ============================================================

export interface InspectorContentProps extends ViewActions {
  context: InspectorContext;
  contextKey: string;
  onEmpty?: () => void;
}

function InspectorContentSkeleton() {
  return (
    <div className="p-4 space-y-3" aria-label="Loading inspector">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-8 w-40 mt-4" />
    </div>
  );
}

export function InspectorContent({ context, contextKey, onOpen, onInspectEntity, onInspectFinding, onOpenNetwork, onConfirmRelationship, onRejectRelationship, canReview }: InspectorContentProps) {
  const [resolution, setResolution] = useState<InspectorResolution>(() => ({
    status: 'loading',
    view: null,
  }));

  useEffect(() => {
    let active = true;
    setResolution({ status: 'loading', view: null });
    resolveInspectorContext(context).then((res) => {
      if (active) setResolution(res);
    });
    return () => {
      active = false;
    };
    // contextKey captures the stable selection identity; context supplies values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey]);

  const view = resolution.view;

  const renderView = () => {
    if (!view) return null;
    const actions: ViewActions = { onOpen, onInspectEntity, onInspectFinding, onOpenNetwork, onConfirmRelationship, onRejectRelationship, canReview };
    switch (view.kind) {
      case 'entity':
        return <EntityContextView view={view} actions={actions} />;
      case 'relationship':
        return <RelationshipContextView view={view} actions={actions} />;
      case 'dataset':
        return <DatasetContextView view={view} actions={actions} />;
      case 'finding':
        return <FindingContextView view={view} actions={actions} />;
      case 'evidence':
        return <EvidenceContextView view={view} actions={actions} />;
      case 'network':
        return <NetworkContextView view={view} actions={actions} />;
      case 'case':
        return <CaseContextView view={view} actions={actions} />;
      case 'centrality':
        return <CentralityContextView view={view} actions={actions} />;
      case 'community':
        return <CommunityContextView view={view} actions={actions} />;
      case 'component':
        return <ComponentContextView view={view} actions={actions} />;
      case 'pattern':
        return <PatternContextView view={view} actions={actions} />;
      case 'investigation':
        return <InvestigationContextView view={view} actions={actions} />;
      case 'note':
        return <NoteContextView view={view} actions={actions} />;
      case 'event':
        return <EventContextView view={view} actions={actions} />;
      case 'analytics_snapshot':
        return <AnalyticsSnapshotContextView view={view} actions={actions} />;
      default:
        return null;
    }
  };

  let label = 'Inspector';
  if (view) {
    switch (view.kind) {
      case 'entity':
        label = `Entity inspector: ${view.name}`;
        break;
      case 'relationship':
        label = `Relationship inspector: ${view.type}`;
        break;
      case 'dataset':
        label = `Dataset inspector: ${view.name}`;
        break;
      case 'finding':
        label = `Finding inspector: ${view.title}`;
        break;
      case 'evidence':
        label = `Evidence inspector: ${view.title}`;
        break;
      case 'network':
        label = `Network inspector: ${view.label}`;
        break;
      case 'case':
        label = `Investigation inspector: ${view.label}`;
        break;
      case 'centrality':
        label = `Centrality inspector: ${view.entityName} (${view.metric})`;
        break;
      case 'community':
        label = `Connected group inspector: ${view.label}`;
        break;
      case 'component':
        label = `Component inspector: ${view.label}`;
        break;
      case 'pattern':
        label = `Pattern inspector: ${view.title}`;
        break;
      case 'investigation':
        label = `Investigation inspector: ${view.title}`;
        break;
      case 'note':
        label = `Note inspector: by ${view.author}`;
        break;
      case 'event':
        label = `Event inspector: ${view.title}`;
        break;
      case 'analytics_snapshot':
        label = `Analytics snapshot inspector: ${view.label}`;
        break;
    }
  }

  return (
    <div className="h-full flex flex-col" aria-label={label}>
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          {resolution.status === 'loading' && (
            <motion.div
              key={`${contextKey}-loading`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <InspectorContentSkeleton />
            </motion.div>
          )}

          {resolution.status === 'error' && (
            <motion.div
              key={`${contextKey}-error`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <ErrorState
                title="Could not resolve context"
                message={resolution.message}
              />
            </motion.div>
          )}

          {resolution.status === 'ready' && view && (
            <motion.div
              key={`${contextKey}-ready`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {renderView()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function InspectorEmpty() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <EmptyState
        icon={<SearchX className="h-8 w-8" />}
        title="Nothing selected"
        description="Select an entity, relationship, dataset, finding or node to inspect it here."
      />
    </div>
  );
}