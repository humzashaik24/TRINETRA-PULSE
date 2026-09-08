// Phase 18.1 — role-aware selectors over the auth store.

import { useAuthStore } from '@/state/auth.store';
import { AUDITOR, roleAtLeast, type UserRole } from '@/lib/auth/types';

/** The current user's safe profile (null when signed out). */
export function useCurrentUser() {
  return useAuthStore((s) => s.session?.user ?? null);
}

/** True when the current user may mutate data (not the read-only AUDITOR). */
export function useCanMutate(): boolean {
  return useAuthStore((s) => (s.session ? s.session.user.role !== AUDITOR : false));
}

/** True when the current role meets or exceeds ``required`` (hierarchy). */
export function useHasRole(required: UserRole): boolean {
  return useAuthStore((s) => {
    const role = s.session?.user.role;
    return role !== undefined && roleAtLeast(role, required);
  });
}

/** True when the current user is exactly ``role`` (AUDITOR is exact-only). */
export function useIsRole(role: UserRole): boolean {
  const value = useAuthStore((s) => s.session?.user.role);
  return value === role;
}