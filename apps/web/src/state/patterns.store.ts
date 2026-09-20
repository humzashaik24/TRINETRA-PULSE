/**
 * PATTERNS STORE (Phase C)
 *
 * Owns the Patterns workspace data for the *active investigation*. It is the
 * single source of truth for the page, so selecting a pattern (inspector),
 * switching investigations, empty/error/loading states and the command
 * palette all stay consistent.
 *
 *  - mock mode : the store loads the preserved demo fixtures through the mock
 *                adapter (output unchanged from the pre-Phase-C page).
 *  - api mode  : the store resolves the investigation identifier (UUID /
 *                canonical_id / case_id) through ``resolveInvestigationId``,
 *                reads the backend detection endpoint, and enriches each
 *                pattern with investigation-scoped persisted entity / evidence
 *                / relationship context. A failed detection call is an
 *                explicit error state — never a mock fallback. Enrichment
 *                lists are best-effort: a missing context list yields honest
 *                empty refs ("Supporting context is not available"), never
 *                invented values.
 *
 * Investigation switching is stale-guarded exactly like the dashboard store:
 * changing investigation clears ``data`` immediately (no previous patterns
 * flash during a transition) and an in-flight load that resolves after a
 * switch is discarded.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PatternArtifact } from '@trinetra-pulse/types';
import { isMockData } from '@/lib/api/config';
import { presentationPatterns } from '@/mock/patterns';
import { getInvestigationPatterns } from '@/lib/api/patterns';
import { resolveInvestigationId } from '@/lib/api/resolve-investigation';
import { listInvestigationEntities } from '@/lib/api/entities';
import {
  listEvidenceForInvestigation,
  listRelationshipsForInvestigation,
} from '@/lib/api/investigations';
import {
  mockPatternsToArtifacts,
  normalizePatternDetection,
} from '@/lib/patterns/normalize';

interface PatternsState {
  /** Identifier the page requested (semantic id passes through untouched). */
  investigationId: string | null;
  /** Normalized pattern artifacts for the active investigation. Null while
   *  loading or before the first load — never previous-investigation data. */
  data: PatternArtifact[] | null;
  loading: boolean;
  error: string | null;
  /** Live pattern selection (drives the inspector detail view). */
  selectedPatternId: string | null;

  load: (id: string) => Promise<void>;
  selectPattern: (id: string | null) => void;
  clear: () => void;
}

export const usePatternsStore = create<PatternsState>()(
  devtools(
    (set, get) => ({
      investigationId: null,
      data: null,
      loading: false,
      error: null,
      selectedPatternId: null,

      load: async (id) => {
        // Immediately clear stale state so the UI shows the loading skeleton
        // and never previous-investigation patterns during a transition.
        set({
          investigationId: id,
          loading: true,
          error: null,
          data: null,
          selectedPatternId: null,
        });

        try {
          if (isMockData()) {
            const data = mockPatternsToArtifacts([...presentationPatterns]);
            if (get().investigationId !== id) return;
            set({ loading: false, data });
            return;
          }

          const resolved = await resolveInvestigationId(id);

          const [detection, enrichment] = await Promise.all([
            getInvestigationPatterns(resolved),
            // Enrichment is context, not the pattern itself: a failure makes
            // refs honestly empty rather than failing a correct detection.
            Promise.allSettled([
              listInvestigationEntities(resolved),
              listEvidenceForInvestigation(resolved),
              listRelationshipsForInvestigation(resolved),
            ]),
          ]);

          const fulfilled = <T,>(result: PromiseSettledResult<T>): T | null =>
            result.status === 'fulfilled' ? result.value : null;

          const data = normalizePatternDetection(detection, {
            entities: fulfilled(enrichment[0]) ?? [],
            evidence: fulfilled(enrichment[1]) ?? [],
            relationships: fulfilled(enrichment[2]) ?? [],
          });

          if (get().investigationId !== id) return;
          set({ loading: false, data });
        } catch (err) {
          if (get().investigationId !== id) return;
          set({
            loading: false,
            data: null,
            error: err instanceof Error ? err.message : 'Could not load patterns',
          });
        }
      },

      selectPattern: (selectedPatternId) => set({ selectedPatternId }),

      clear: () =>
        set({
          investigationId: null,
          data: null,
          loading: false,
          error: null,
          selectedPatternId: null,
        }),
    }),
    { name: 'trinetra-patterns' }
  )
);