'use client';

// Phase 18.1 — connects the auth store to the API client.
//
// Registered once at the app root: on an unexpected 401 (expired/revoked
// token) the session is cleared so the AuthGate bounces the user to /login.

import * as React from 'react';
import { setOnUnauthorized } from '@/lib/api/client';
import { useAuthStore } from '@/state/auth.store';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    setOnUnauthorized(() => {
      useAuthStore.getState().logout();
    });
    return () => setOnUnauthorized(null);
  }, []);

  return <>{children}</>;
}