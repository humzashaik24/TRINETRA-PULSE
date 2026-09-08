import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { InvestigationDirectionsResponse } from '@trinetra-pulse/types';
import { getInvestigationDirections } from '@/lib/api/directions';

// ============================================================
// INVESTIGATION DIRECTIONS STORE (Phase 26)
// ============================================================
// Loads grounded next-step leads for the open investigation.
// Directions are computed on request (never persisted) and are
// analytical leads, not judgements: they never establish guilt
// or criminal intent.
// ============================================================

interface DirectionsState {
  investigationId: string | null;
  data: InvestigationDirectionsResponse | null;
  loading: boolean;
  error: string | null;
  load: (investigationId: string) => Promise<void>;
  clear: () => void;
}

export const useDirectionsStore = create<DirectionsState>()(
  devtools(
    (set) => ({
      investigationId: null,
      data: null,
      loading: false,
      error: null,

      load: async (investigationId) => {
        set({ investigationId, loading: true, error: null });
        try {
          const data = await getInvestigationDirections(investigationId);
          set({ data, loading: false, error: null });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : 'Could not compute directions',
          });
        }
      },

      clear: () =>
        set({
          investigationId: null,
          data: null,
          loading: false,
          error: null,
        }),
    }),
    { name: 'directions' }
  )
);