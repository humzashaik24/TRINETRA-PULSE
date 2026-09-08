/** Phase 18.1 — auth API surface for the real (/api/v2) layer. */

import { apiFetch } from './client';
import { API_BASE_URL } from './config';
import type { AuthUser, LoginResponse } from '../auth/types';

/** POST /auth/login — the only public endpoint on the v2 surface. */
export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(API_BASE_URL, '/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

/** GET /auth/me — returns the authenticated user's safe profile. */
export async function apiCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>(API_BASE_URL, '/auth/me');
}