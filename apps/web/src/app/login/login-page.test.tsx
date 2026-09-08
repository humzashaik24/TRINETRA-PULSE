import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { __resetNavigation } from '@/test/mocks/next-navigation';
import LoginPage from '@/app/login/page';
import { useAuthStore } from '@/state/auth.store';

describe('LoginPage (mock mode)', () => {
  beforeEach(() => {
    __resetNavigation();
    useAuthStore.setState({
      session: null,
      status: 'idle',
      hydrated: true,
      error: null,
    });
    if (typeof window !== 'undefined') window.localStorage.clear();
  });

  it('renders the sign-in form with demo credentials in mock mode', () => {
    const { container } = render(<LoginPage />);
    expect(container.querySelector('[data-testid="login-form"]')).toBeInTheDocument();
    expect(screen.getByTestId('login-email')).toBeInTheDocument();
    expect(screen.getByTestId('login-password')).toBeInTheDocument();
    // In mock mode the demo account hint is shown.
    expect(screen.getByTestId('mock-credentials')).toBeInTheDocument();
    expect(screen.getByText(/investigator@trinetra.dev/)).toBeInTheDocument();
  });

  it('submits and establishes a session with the chosen demo account', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'admin@trinetra.dev' },
    });
    fireEvent.change(screen.getByTestId('login-password'), {
      target: { value: 'Admin!2026' },
    });
    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(useAuthStore.getState().session?.user.role).toBe('admin');
    });
  });

  it('keeps the submit disabled until credentials are supplied', () => {
    render(<LoginPage />);
    const submit = screen.getByTestId('login-submit');
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('login-password'), {
      target: { value: 'short' },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'investigator@trinetra.dev' },
    });
    fireEvent.change(screen.getByTestId('login-password'), {
      target: { value: 'at-least-8-chars' },
    });
    expect(submit).toBeEnabled();
  });
});
