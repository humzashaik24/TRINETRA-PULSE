import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  InvestigationReadiness,
  InvestigationHealth,
  InvestigationPipeline,
  ReviewItem,
  InvestigationActivityLog,
  SavedInvestigationView,
  SaveViewInput,
  GraphBookmark,
  SaveGraphBookmarkInput,
  TimelineBookmark,
  SaveTimelineBookmarkInput,
  CrossReference,
  ProvenanceChain,
  InvestigationSearchResult,
} from '@trinetra-pulse/types';
import {
  getReadiness,
  getHealth,
  getPipeline,
  getReviewQueue,
  getActivity,
  getSavedViews,
  saveView,
  deleteView,
  getGraphBookmarks,
  saveGraphBookmark,
  deleteGraphBookmark,
  getTimelineBookmarks,
  saveTimelineBookmark,
  deleteTimelineBookmark,
  getCrossReferences,
  getProvenance,
  searchInvestigation,
} from '@/services/investigation-operations.service';

// ============================================================
// INVESTIGATION OPERATIONS STORE (Phase 11)
// ============================================================
// Owns the operational shell state for the active investigation:
// pipeline, readiness, health, review queue, activity log, saved
// views and graph/timeline bookmarks, cross-references and
// provenance chains. Scoped by investigationId.
//
// State kept here is the pure read/operational surface. Investigation
// workspace edits (entities/evidence/findings/notes) stay in the
// Phase 9 `investigation.store`; AI conversations stay in `ai.store`;
// shell/app chrome stays in `shell.store`.
// ============================================================

interface InvestigationOperationsState {
  investigationId: string | null;
  loading: boolean;
  error: string | null;

  readiness: InvestigationReadiness | null;
  health: InvestigationHealth | null;
  pipeline: InvestigationPipeline | null;
  reviewQueue: ReviewItem[];
  activity: InvestigationActivityLog[];
  savedViews: SavedInvestigationView[];
  graphBookmarks: GraphBookmark[];
  timelineBookmarks: TimelineBookmark[];
  crossReferences: CrossReference[];
  provenance: ProvenanceChain[];
  searchResults: InvestigationSearchResult[];

  loadOperations: (id: string) => Promise<void>;
  clear: () => void;

  refreshReviewQueue: () => Promise<void>;
  refreshSavedViews: () => Promise<void>;
  refreshBookmarks: () => Promise<void>;
  refreshCrossReferences: (entityId?: string) => Promise<void>;
  refreshProvenance: (targetId?: string) => Promise<void>;
  refreshSearch: (query: string) => Promise<void>;

  addSavedView: (input: SaveViewInput) => Promise<SavedInvestigationView | null>;
  removeSavedView: (viewId: string) => Promise<void>;
  addGraphBookmark: (input: SaveGraphBookmarkInput) => Promise<GraphBookmark | null>;
  removeGraphBookmark: (bookmarkId: string) => Promise<void>;
  addTimelineBookmark: (input: SaveTimelineBookmarkInput) => Promise<TimelineBookmark | null>;
  removeTimelineBookmark: (bookmarkId: string) => Promise<void>;
}

export const useInvestigationOperationsStore = create<InvestigationOperationsState>()(
  devtools(
    (set, get) => ({
      investigationId: null,
      loading: false,
      error: null,

      readiness: null,
      health: null,
      pipeline: null,
      reviewQueue: [],
      activity: [],
      savedViews: [],
      graphBookmarks: [],
      timelineBookmarks: [],
      crossReferences: [],
      provenance: [],
      searchResults: [],

      loadOperations: async (id) => {
        set({ loading: true, error: null, investigationId: id });
        try {
          const [
            readiness,
            health,
            pipeline,
            reviewQueue,
            activity,
            savedViews,
            graphBookmarks,
            timelineBookmarks,
            crossReferences,
            provenance,
          ] = await Promise.all([
            getReadiness(id),
            getHealth(id),
            getPipeline(id),
            getReviewQueue(id),
            getActivity(id),
            getSavedViews(id),
            getGraphBookmarks(id),
            getTimelineBookmarks(id),
            getCrossReferences(id),
            getProvenance(id),
          ]);
          set({
            loading: false,
            readiness,
            health,
            pipeline,
            reviewQueue,
            activity,
            savedViews,
            graphBookmarks,
            timelineBookmarks,
            crossReferences,
            provenance,
          });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : 'Could not load investigation operations',
          });
        }
      },

      clear: () =>
        set({
          investigationId: null,
          loading: false,
          error: null,
          readiness: null,
          health: null,
          pipeline: null,
          reviewQueue: [],
          activity: [],
          savedViews: [],
          graphBookmarks: [],
          timelineBookmarks: [],
          crossReferences: [],
          provenance: [],
          searchResults: [],
        }),

      refreshReviewQueue: async () => {
        const id = get().investigationId;
        if (!id) return;
        const reviewQueue = await getReviewQueue(id);
        set({ reviewQueue });
      },

      refreshSavedViews: async () => {
        const id = get().investigationId;
        if (!id) return;
        const savedViews = await getSavedViews(id);
        set({ savedViews });
      },

      refreshBookmarks: async () => {
        const id = get().investigationId;
        if (!id) return;
        const [graphBookmarks, timelineBookmarks] = await Promise.all([
          getGraphBookmarks(id),
          getTimelineBookmarks(id),
        ]);
        set({ graphBookmarks, timelineBookmarks });
      },

      refreshCrossReferences: async (entityId) => {
        const id = get().investigationId;
        if (!id) return;
        const crossReferences = await getCrossReferences(id, entityId);
        set({ crossReferences });
      },

      refreshProvenance: async (targetId) => {
        const id = get().investigationId;
        if (!id) return;
        const provenance = await getProvenance(id, targetId);
        set({ provenance });
      },

      refreshSearch: async (query) => {
        const id = get().investigationId;
        if (!id) return;
        const searchResults = await searchInvestigation(id, query);
        set({ searchResults });
      },

      addSavedView: async (input) => {
        const id = get().investigationId;
        if (!id) return null;
        const created = await saveView(id, input);
        set({ savedViews: [created, ...get().savedViews] });
        return created;
      },

      removeSavedView: async (viewId) => {
        const id = get().investigationId;
        if (!id) return;
        await deleteView(id, viewId);
        set({ savedViews: get().savedViews.filter((v) => v.id !== viewId) });
      },

      addGraphBookmark: async (input) => {
        const id = get().investigationId;
        if (!id) return null;
        const created = await saveGraphBookmark(id, input);
        set({ graphBookmarks: [created, ...get().graphBookmarks] });
        return created;
      },

      removeGraphBookmark: async (bookmarkId) => {
        const id = get().investigationId;
        if (!id) return;
        await deleteGraphBookmark(id, bookmarkId);
        set({ graphBookmarks: get().graphBookmarks.filter((b) => b.id !== bookmarkId) });
      },

      addTimelineBookmark: async (input) => {
        const id = get().investigationId;
        if (!id) return null;
        const created = await saveTimelineBookmark(id, input);
        set({ timelineBookmarks: [created, ...get().timelineBookmarks] });
        return created;
      },

      removeTimelineBookmark: async (bookmarkId) => {
        const id = get().investigationId;
        if (!id) return;
        await deleteTimelineBookmark(id, bookmarkId);
        set({ timelineBookmarks: get().timelineBookmarks.filter((b) => b.id !== bookmarkId) });
      },
    }),
    { name: 'trinetra-investigation-operations' }
  )
);
