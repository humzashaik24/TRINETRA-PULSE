import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import { AuthGate } from './auth-gate';
import { useAuthStore } from '@/state/auth.store';

describe('AuthGate (mock mode)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      status: 'idle',
      hydrated: false,
      error: null,
    });
    if (typeof window !== 'undefined') window.localStorage.clear();
  });

  it('renders children and hydrates the session on mount', () => {
    render(
      <AuthGate>
        <span data-testid="content">protected</span>
      </AuthGate>,
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
    // Mock mode auto-provisions a demo session, so the gate is satisfied.
    expect(useAuthStore.getState().hydrated).toBe(true);
    expect(useAuthStore.getState().session).not.toBeNull();
  });
});
