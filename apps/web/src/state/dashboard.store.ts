/**
 * DASHBOARD STORE (Phase B)
 *
 * Owns the data behind the Intelligence Overview widgets. The store exposes a
 * single deterministic view (``DashboardViewData``) that every widget reads:
 *
 *  - mock mode : the view is the existing ``@/mock`` fixtures assembled by
 *                ``buildMockDashboardView`` (byte-identical to the legacy
 *                widgets). It is seeded synchronously at store creation so
 *                widget-only renders (tests, first paint) work unchanged.
 *  - api mode  : the view is derived by ``deriveView`` from the real
 *                investigation workspace (``loadInvestigationWorkspace``)
 *                plus the real investigation list — no demo fallback.
 *
 * Canonical id resolution: dashboard links historically use semantic ids
 * (e.g. ``inv-demo-nexus``), while the backend addresses investigations by
 * UUID. In API mode ``load`` resolves the semantic id against the real
 * investigation list (``metadata.canonical_id`` / ``metadata.case_id``) before
 * loading the workspace.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { isMockData } from '@/lib/api/config';
import { buildMockDashboardView } from '@/lib/dashboard/mock';
import { deriveView, type DashboardViewData } from '@/lib/dashboard/view';
import { loadInvestigationWorkspace, mapInvestigationList } from '@/lib/api/adapter';
import { resolveInvestigationId } from '@/lib/api/resolve-investigation';
import { listInvestigations } from '@/lib/api/investigations';

interface DashboardState {
  data: DashboardViewData | null;
  loading: boolean;
  error: string | null;
  investigationId: string | null;

  /** Load (or reload) the dashboard view for the given investigation. In mock
   *  mode the resolve is synchronous; in API mode it fetches the real
   *  workspace and list. A stale in-flight load is discarded. */
  load: (id: string) => Promise<void>;
  clear: () => void;
}

function initialView(): DashboardViewData | null {
  return isMockData() ? buildMockDashboardView() : null;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      data: initialView(),
      loading: false,
      error: null,
      investigationId: null,

      load: async (id) => {
        set({ loading: true, error: null, investigationId: id });
        try {
          if (isMockData()) {
            const view = buildMockDashboardView();
            if (get().investigationId !== id) return;
            set({ loading: false, data: view });
            return;
          }

          const apiId = await resolveInvestigationId(id);
          const [workspace, list] = await Promise.all([
            loadInvestigationWorkspace(apiId),
            listInvestigations({ page_size: 100 }).catch(() => null),
          ]);
          if (get().investigationId !== id) return;

          const view = deriveView(workspace, {
            allInvestigations: list ? mapInvestigationList(list.items) : [],
          });
          if (get().investigationId !== id) return;
          set({ loading: false, data: view });
        } catch (err) {
          if (get().investigationId !== id) return;
          set({
            loading: false,
            error: err instanceof Error ? err.message : 'Could not load dashboard',
          });
        }
      },

      clear: () =>
        set({
          data: initialView(),
          loading: false,
          error: null,
          investigationId: null,
        }),
    }),
    { name: 'trinetra-dashboard' }
  )
);

/** Convenience selector: current dashboard view (null until loaded in API
 *  mode; pre-seeded with the mock view in mock mode). */
export function useDashboardView(): DashboardViewData | null {
  return useDashboardStore((s) => s.data);
}