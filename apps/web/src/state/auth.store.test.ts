// Phase 18.1 — auth store behavior (mock + API mode).

import { useAuthStore } from './auth.store';
import * as authApi from '@/lib/api/auth';

function rehydrate() {
  useAuthStore.setState({
    session: null,
    status: 'idle',
    hydrated: false,
    error: null,
  });
}

describe('useAuthStore (mock mode)', () => {
  beforeEach(() => {
    rehydrate();
    if (typeof window !== 'undefined') window.localStorage.clear();
    // Force mock mode for the demo-session assertions.
    jest.spyOn(authApi, 'apiLogin').mockResolvedValue({
      access_token: 'never',
      token_type: 'bearer',
      user: {
        id: 'never',
        email: 'never',
        display_name: 'never',
        role: 'admin',
        is_active: true,
      },
    });
  });

  it('hydrates a deterministic demo session in mock mode', () => {
    useAuthStore.getState().hydrate();
    const { session, status, hydrated } = useAuthStore.getState();
    expect(hydrated).toBe(true);
    expect(status).toBe('authenticated');
    expect(session).not.toBeNull();
    expect(session!.user.email).toBe('investigator@trinetra.dev');
    expect(session!.user.role).toBe('investigator');
  });

  it('maps the demo account email to its role', async () => {
    useAuthStore.getState().logout();
    const ok = await useAuthStore.getState().login('auditor@trinetra.dev', 'whatever');
    expect(ok).toBe(true);
    expect(useAuthStore.getState().session?.user.role).toBe('auditor');
  });

  it('sets canMutate=false for the auditor and true otherwise', async () => {
    await useAuthStore.getState().login('auditor@trinetra.dev', 'x');
    expect(useAuthStore.getState().canMutate()).toBe(false);

    useAuthStore.getState().logout();
    await useAuthStore.getState().login('investigator@trinetra.dev', 'x');
    expect(useAuthStore.getState().canMutate()).toBe(true);
  });

  it('logout clears the session and token registration', () => {
    useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().session).not.toBeNull();
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('hasRole applies the role hierarchy (auditor is exact-only)', async () => {
    useAuthStore.getState().logout();
    await useAuthStore.getState().login('admin@trinetra.dev', 'x');
    expect(useAuthStore.getState().hasRole('admin')).toBe(true);
    expect(useAuthStore.getState().hasRole('supervisor')).toBe(true);

    useAuthStore.getState().logout();
    await useAuthStore.getState().login('auditor@trinetra.dev', 'x');
    expect(useAuthStore.getState().hasRole('auditor')).toBe(true);
    expect(useAuthStore.getState().hasRole('investigator')).toBe(false);
  });
});
