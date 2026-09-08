/** Phase 18.1 — shared authentication / RBAC types. */

export type UserRole = 'admin' | 'supervisor' | 'investigator' | 'auditor';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

/** What the auth store keeps across reloads. */
export interface StoredAuthSession {
  access_token: string;
  user: AuthUser;
}

/** Read-only AUDITOR is a distinct role and never inherits mutation rights. */
export const AUDITOR: UserRole = 'auditor';

export const USER_ROLE_RANK: Record<UserRole, number> = {
  auditor: 0,
  investigator: 1,
  supervisor: 2,
  admin: 3,
};

/** True when ``role`` meets or exceeds the required rank (hierarchy). */
export function roleAtLeast(role: UserRole, required: UserRole): boolean {
  if (required === AUDITOR) return role === AUDITOR;
  return USER_ROLE_RANK[role] >= USER_ROLE_RANK[required];
}

/** Roles allowed to run the administration surface (user + audit). */
export const ADMIN_READER_ROLES: UserRole[] = ['supervisor', 'admin', 'auditor'];