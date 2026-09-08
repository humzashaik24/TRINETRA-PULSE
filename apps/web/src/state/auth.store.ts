// Phase 18.1 — authentication / RBAC client store (zustand).
//
// Single source of truth for the current session. Behavior differs by data
// source, deliberately:
//
//  - API mode (NEXT_PUBLIC_USE_MOCK_API=false): login posts to the real
//    /api/v2/auth/login and the access token is registered on the API client.
//    There is NO anonymous fallback — the same token rules as production.
//  - Mock mode (default): the in-memory demo universe stays usable without a
//    backend, so hydration auto-activates a deterministic demo session (UI
//    only). That bypass is wired such that it can never run in API mode — the
//    auto-login branch is guarded by `isMockData()`.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { apiLogin } from '@/lib/api/auth';
import { setAuthAccessToken } from '@/lib/api/client';
import { isMockData } from '@/lib/api/config';
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
} from '@/lib/auth/session';
import {
  AUDITOR,
  USER_ROLE_RANK,
  type AuthUser,
  type StoredAuthSession,
  type UserRole,
} from '@/lib/auth/types';
import { roleAtLeast } from '@/lib/auth/types';

const MOCK_DEMO_EMAIL = 'investigator@trinetra.dev';

/** Role derived from the demo account email when running on mock data. */
const MOCK_ACCOUNT_ROLES: Record<string, UserRole> = {
  'admin@trinetra.dev': 'admin',
  'supervisor@trinetra.dev': 'supervisor',
  'investigator@trinetra.dev': 'investigator',
  'auditor@trinetra.dev': 'auditor',
};

function makeMockSession(email: string): StoredAuthSession {
  const normalized = email.trim().toLowerCase();
  const role: UserRole = MOCK_ACCOUNT_ROLES[normalized] ?? 'investigator';
  const user: AuthUser = {
    id: `mock-${role}`,
    email: normalized,
    display_name: normalized.split('@')[0].replace(/[-_.]/g, ' '),
    role,
    is_active: true,
  };
  return { access_token: `mock-token.${role}`, user };
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  session: StoredAuthSession | null;
  status: AuthStatus;
  hydrated: boolean;
  error: string | null;
  hydrate: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  canMutate: () => boolean;
  hasRole: (required: UserRole) => boolean;
  currentUser: () => AuthUser | null;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      session: null,
      status: 'idle',
      hydrated: false,
      error: null,

      hydrate: () => {
        if (get().hydrated) return;
        const stored = loadStoredSession();
        if (!stored && isMockData()) {
          const demo = makeMockSession(MOCK_DEMO_EMAIL);
          saveStoredSession(demo);
          setAuthAccessToken(demo.access_token);
          set({ session: demo, status: 'authenticated', hydrated: true, error: null });
          return;
        }
        setAuthAccessToken(stored?.access_token ?? null);
        set({
          session: stored,
          status: stored ? 'authenticated' : 'unauthenticated',
          hydrated: true,
          error: null,
        });
      },

      login: async (email, password) => {
        set({ status: 'loading', error: null });
        try {
          let session: StoredAuthSession;
          if (isMockData()) {
            session = makeMockSession(email);
          } else {
            const res = await apiLogin(email, password);
            session = { access_token: res.access_token, user: res.user };
          }
          saveStoredSession(session);
          setAuthAccessToken(session.access_token);
          set({ session, status: 'authenticated', error: null });
          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ status: 'unauthenticated', error: message });
          return false;
        }
      },

      logout: () => {
        clearStoredSession();
        setAuthAccessToken(null);
        set({ session: null, status: 'unauthenticated', error: null, hydrated: true });
      },

      canMutate: () => {
        const session = get().session;
        return session ? session.user.role !== AUDITOR : false;
      },

      hasRole: (required) => {
        const session = get().session;
        return session ? roleAtLeast(session.user.role, required) : false;
      },

      currentUser: () => get().session?.user ?? null,
    }),
    { name: 'trinetra-auth' }
  )
);

export { USER_ROLE_RANK };