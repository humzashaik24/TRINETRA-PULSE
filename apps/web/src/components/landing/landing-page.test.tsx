import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { __resetNavigation } from '@/test/mocks/next-navigation';
import { LandingPage } from './landing-page';
import { useAuthStore } from '@/state/auth.store';
import { saveStoredSession, clearStoredSession } from '@/lib/auth/session';
import type { StoredAuthSession } from '@/lib/auth/types';

const MOCK_SESSION: StoredAuthSession = {
  access_token: 'mock-token.investigator',
  user: {
    id: 'mock-investigator',
    email: 'investigator@trinetra.dev',
    display_name: 'Investigator',
    role: 'investigator',
    is_active: true,
  },
};

describe('LandingPage', () => {
  beforeEach(() => {
    __resetNavigation();
    useAuthStore.setState({
      session: null,
      status: 'idle',
      hydrated: false,
      error: null,
    });
    clearStoredSession();
  });

  it('renders the product purpose immediately', () => {
    render(<LandingPage />);

    expect(screen.getByText('Trinetra Pulse')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Criminal Network Intelligence & Investigation Platform/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Connect the dots\.\s*Preserve the evidence\.\s*Investigate with intelligence\./,
    );
    expect(screen.getAllByText(/investigator-controlled workspace/i).length).toBeGreaterThan(0);
  });

  it('renders the eight capability showcase cards', () => {
    render(<LandingPage />);

    for (const id of [
      'network-intelligence',
      'investigation-intelligence',
      'evidence-security',
      'provenance',
      'local-whisper',
      'knowledge-canvas',
      'grounded-ai',
      'analytics-reports',
    ]) {
      expect(screen.getByTestId(`capability-${id}`)).toBeInTheDocument();
    }

    expect(screen.getByText('Network Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Investigation Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Evidence Security')).toBeInTheDocument();
    expect(screen.getByText('Blockchain Provenance')).toBeInTheDocument();
    expect(screen.getByText('Local Whisper')).toBeInTheDocument();
    expect(screen.getAllByText('Knowledge Canvas').length).toBeGreaterThan(0);
    expect(screen.getByText('Grounded AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Analytics & Reports')).toBeInTheDocument();
  });

  it('renders the security / trust section', () => {
    render(<LandingPage />);

    for (const id of [
      'investigator-controlled',
      'evidence-integrity',
      'provenance',
      'grounded-ai',
      'privacy',
    ]) {
      expect(screen.getByTestId(`trust-${id}`)).toBeInTheDocument();
    }
    const trust = screen.getByTestId('landing-trust');
    expect(within(trust).getAllByText('Investigator Controlled').length).toBeGreaterThan(0);
    expect(within(trust).getByText('Evidence Integrity')).toBeInTheDocument();
    expect(within(trust).getByText('Grounded AI')).toBeInTheDocument();
    expect(within(trust).getByText('Privacy')).toBeInTheDocument();
  });

  it('renders the jury-friendly capability flow', () => {
    render(<LandingPage />);

    const flow = screen.getByTestId('capability-flow-steps');
    expect(flow).toBeInTheDocument();
    for (const step of [
      'Fragmented Data',
      'Entity & Relationship Intelligence',
      'Investigation Graph',
      'Evidence Integrity',
      'Patterns & Findings',
      'Investigation Directions',
      'Knowledge Canvas',
      'Grounded AI',
      'Investigator Decision',
    ]) {
      expect(within(flow).getByText(step)).toBeInTheDocument();
    }
  });

  it('renders the lightweight investigation graph preview with an abstract legend', () => {
    render(<LandingPage />);

    expect(screen.getByTestId('landing-graph-preview')).toBeInTheDocument();
    for (const type of ['Person', 'Organization', 'Phone', 'Account', 'Evidence', 'Finding']) {
      expect(screen.getByText(type)).toBeInTheDocument();
    }
    expect(
      screen.getByRole('img', { name: /stylized preview of an investigation graph/i }),
    ).toBeInTheDocument();
  });

  it('routes the primary CTA to /login for fresh visitors', () => {
    render(<LandingPage />);

    for (const cta of screen.getAllByTestId('landing-primary-cta')) {
      expect(cta).toHaveAttribute('href', '/login');
    }
    for (const link of screen.getAllByRole('link', { name: /enter trinetra pulse/i })) {
      expect(link).toHaveAttribute('href', '/login');
    }
  });

  it('routes the primary CTA to /overview when a session already exists locally', () => {
    saveStoredSession(MOCK_SESSION);
    render(<LandingPage />);

    for (const cta of screen.getAllByTestId('landing-primary-cta')) {
      expect(cta).toHaveAttribute('href', '/overview');
    }
  });

  it('routes the primary CTA to /overview when the auth store holds a session', () => {
    useAuthStore.setState({ session: MOCK_SESSION, status: 'authenticated', hydrated: true });
    render(<LandingPage />);

    for (const cta of screen.getAllByTestId('landing-primary-cta')) {
      expect(cta).toHaveAttribute('href', '/overview');
    }
  });

  it('provides a secondary CTA that anchors to capabilities', () => {
    render(<LandingPage />);

    expect(screen.getByTestId('landing-secondary-cta')).toHaveAttribute('href', '#capabilities');
  });

  it('does not surface fabricated global statistics anywhere', () => {
    render(<LandingPage />);

    const body = document.body.textContent ?? '';
    for (const fabricated of [
      '12,482',
      '34,891',
      '8,956',
      '24 investigations',
      '47 patterns',
      '1,834 evidence',
      '24 Investigations',
      '47 Patterns',
      '1,834 Evidence',
    ]) {
      expect(body).not.toContain(fabricated);
    }
  });

  it('uses a horizontally-safe full-width wrapper for responsive layout', () => {
    const { container } = render(<LandingPage />);

    const wrapper = container.firstElementChild as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain('overflow-x-hidden');
  });

  it('keeps accessible semantics: headings, landmarks and labelled sections', () => {
    const { container } = render(<LandingPage />);

    expect(container.querySelector('header')).not.toBeNull();
    expect(container.querySelector('footer')).not.toBeNull();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Skip to content')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /built for serious, structured investigation/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /built to support the investigator/i })).toBeInTheDocument();
  });
});