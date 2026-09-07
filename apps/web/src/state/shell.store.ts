import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { EntityType } from '@trinetra-pulse/types';

// ============================================================
// PHASE 3.5 — SHELL + CONTEXT SYSTEM
// ============================================================
// Owns the next-gen workspace shell state:
//   - command rail (collapsed / expanded)
//   - contextual inspector (closed / opening / open / resizing / closing)
//   - resizable panel widths
//
// Design principle: selecting an object in the workspace must NOT
// navigate away. It opens the inspector so the investigator can
// explore context in place. Navigate only when explicitly requested.
// ============================================================

// ------------------------------------------------------------
// Context types
// ------------------------------------------------------------

export type InspectorContextType =
  | 'entity'
  | 'relationship'
  | 'dataset'
  | 'finding'
  | 'evidence'
  | 'network'
  | 'case'
  | 'centrality'
  | 'community'
  | 'component'
  | 'pattern'
  | 'investigation'
  | 'note'
  | 'event'
  | 'analytics_snapshot';

/** Payload for an entity selection. Optional display fields let the
 *  inspector render instantly while richer data resolves. Graph
 *  selections carry confidence/connection/source hints so the
 *  inspector works even when no canonical profile exists. */
export interface EntityContext {
  type: 'entity';
  id: string;
  name?: string;
  entityType?: EntityType;
  /** Instant-render fields (may be satisfied by the knowledge graph when
   *  a canonical Phase 6 profile is unavailable). */
  confidence?: number;
  connections?: number;
  sources?: string[];
  activityAt?: string;
  status?: string;
  /** Investigation scope so the inspector can route back correctly. */
  investigationId?: string;
}

export interface RelationshipContext {
  type: 'relationship';
  id: string;
  /** Optional optimistic display fields. */
  sourceEntityName?: string;
  targetEntityName?: string;
  relationshipType?: string;
  /** Instant-render fields supplied by the knowledge graph when no
   *  canonical Phase 6 relationship record exists. */
  confidence?: number;
  source?: string;
  evidence?: string[];
  timestamp?: string;
  direction?: string;
  extractionMethod?: string;
  sourceEntityId?: string;
  targetEntityId?: string;
  sourceEntityType?: EntityType;
  targetEntityType?: EntityType;
  verificationStatus?: string;
  /** Investigation scope so the inspector can route back correctly. */
  investigationId?: string;
}

export interface DatasetContext {
  type: 'dataset';
  id: string;
  name?: string;
}

export interface FindingContext {
  type: 'finding';
  id: string;
  title?: string;
  /** Investigation scope so the inspector can route back correctly. */
  investigationId?: string;
}

export interface EvidenceContext {
  type: 'evidence';
  id: string;
  title?: string;
  entityId?: string;
  /** Investigation scope so the inspector can route back correctly. */
  investigationId?: string;
}

export interface NetworkContext {
  type: 'network';
  id: string;
  label?: string;
  nodeLabel?: string;
  nodeType?: string;
  connections?: number;
}

export interface CaseContext {
  type: 'case';
  id: string;
  label?: string;
}

// ------------------------------------------------------------
// Phase 8 — analytics context selections. These carry a lightweight
// payload so the inspector renders instantly; rich values resolve
// through the analytics service via resolveInspectorContext.
// ------------------------------------------------------------

export interface CentralityContext {
  type: 'centrality';
  id: string;
  metric: string;
  entityId: string;
  entityName?: string;
  score?: number;
  rank?: number;
}

export interface CommunityContext {
  type: 'community';
  id: string;
  label?: string;
  size?: number;
  entityIds?: string[];
}

export interface ComponentContext {
  type: 'component';
  id: string;
  label?: string;
  nodeCount?: number;
  entityIds?: string[];
}

export interface PatternContext {
  type: 'pattern';
  id: string;
  title?: string;
  patternType?: string;
  entities?: string[];
}

// ------------------------------------------------------------
// Phase 9 — investigation workspace context selections. These let
// the inspector render an Investigation, Note, Event or analytics
// snapshot from the investigation workspace. Rich values resolve
// through the investigation service via resolveInspectorContext.
// ------------------------------------------------------------

export interface InvestigationContext {
  type: 'investigation';
  id: string;
  label?: string;
  status?: string;
  priority?: string;
}

export interface NoteContext {
  type: 'note';
  id: string;
  investigationId?: string;
  author?: string;
  body?: string;
}

export interface EventContext {
  type: 'event';
  id: string;
  investigationId?: string;
  title?: string;
  occurredAt?: string;
  eventType?: string;
}

export interface AnalyticsSnapshotContext {
  type: 'analytics_snapshot';
  id: string;
  investigationId?: string;
  label?: string;
  capturedAt?: string;
}

export type InspectorContext =
  | EntityContext
  | RelationshipContext
  | DatasetContext
  | FindingContext
  | EvidenceContext
  | NetworkContext
  | CaseContext
  | CentralityContext
  | CommunityContext
  | ComponentContext
  | PatternContext
  | InvestigationContext
  | NoteContext
  | EventContext
  | AnalyticsSnapshotContext;

// ------------------------------------------------------------
// Inspector lifecycle
// ------------------------------------------------------------

export type InspectorStatus = 'closed' | 'opening' | 'open' | 'resizing' | 'closing';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

// ------------------------------------------------------------
// Geometry tokens
// ------------------------------------------------------------

export const RAIL_COLLAPSED_WIDTH = 60;
export const RAIL_EXPANDED_WIDTH = 240;
export const INSPECTOR_MIN_WIDTH = 300;
export const INSPECTOR_DEFAULT_WIDTH = 340;

// ------------------------------------------------------------
// Store
// ------------------------------------------------------------

interface ShellState {
  // --- Command rail ---
  railExpanded: boolean;
  toggleRail: () => void;
  setRailExpanded: (v: boolean) => void;

  // --- Inspector ---
  inspectorOpen: boolean;
  inspectorStatus: InspectorStatus;
  inspectorContext: InspectorContext | null;
  setInspectorStatus: (status: InspectorStatus) => void;

  /** Select an object and open the inspector (context preservation). */
  selectContext: (ctx: InspectorContext) => void;
  /** Open the existing context / re-open the inspector. */
  openInspector: () => void;
  /** Close the inspector without clearing its context (re-open resumes). */
  closeInspector: () => void;
  /** Close and forget the current selection. */
  clearContext: () => void;
  /** Update the focused object while the inspector stays open. */
  updateContext: (ctx: InspectorContext) => void;

  // --- Resizable split (workspace / inspector) ---
  inspectorWidth: number;
  setInspectorWidth: (width: number) => void;
  /** % of available width used by the inspector. */
  inspectorRatio: number;
  setInspectorRatio: (ratio: number) => void;
  resetInspectorSize: () => void;

  // --- Responsive ---
  viewport: ViewportMode;
  setViewport: (mode: ViewportMode) => void;
}

export const useShellStore = create<ShellState>()(
  devtools(
    (set) => ({
      railExpanded: true,
      toggleRail: () => set((s) => ({ railExpanded: !s.railExpanded })),
      setRailExpanded: (v) => set({ railExpanded: v }),

      inspectorOpen: false,
      inspectorStatus: 'closed',
      inspectorContext: null,
      setInspectorStatus: (status) => set({ inspectorStatus: status }),

      selectContext: (ctx) =>
        set({
          inspectorContext: ctx,
          inspectorOpen: true,
          inspectorStatus: 'opening',
        }),
      openInspector: () =>
        set((s) => ({
          inspectorOpen: true,
          inspectorStatus: s.inspectorContext ? 'opening' : 'open',
        })),
      closeInspector: () =>
        set({
          inspectorOpen: false,
          inspectorStatus: 'closing',
        }),
      clearContext: () =>
        set({
          inspectorContext: null,
          inspectorOpen: false,
          inspectorStatus: 'closed',
        }),
      updateContext: (ctx) => set({ inspectorContext: ctx }),

      inspectorWidth: INSPECTOR_DEFAULT_WIDTH,
      setInspectorWidth: (width) => set({ inspectorWidth: width }),
      inspectorRatio: 0.3,
      setInspectorRatio: (ratio) => set({ inspectorRatio: ratio }),
      resetInspectorSize: () =>
        set({
          inspectorWidth: INSPECTOR_DEFAULT_WIDTH,
          inspectorRatio: 0.3,
        }),

      viewport: 'desktop',
      setViewport: (mode) =>
        set((s) => {
          if (s.viewport === mode) return s;
          // On non-desktop the rail is always collapsed and the
          // inspector floats as an overlay, so sizes stay untouched.
          return { viewport: mode };
        }),
    }),
    { name: 'trinetra-shell' }
  )
);