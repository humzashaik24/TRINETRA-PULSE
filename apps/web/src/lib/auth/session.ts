/** Phase 18.1 — persistence of the JWT session across browser reloads. */

import type { StoredAuthSession } from './types';

const STORAGE_KEY = 'trinetra.auth.session';

export function loadStoredSession(): StoredAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (!parsed.access_token || !parsed.user?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: StoredAuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable (private mode / quota) — session stays in memory */
  }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}