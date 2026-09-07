import React from 'react';
import { render, screen } from '@testing-library/react';
import PatternsPage from '@/app/(dashboard)/patterns/page';
import AnalyticsPage from '@/app/(dashboard)/analytics/page';
import { useAppStore } from '@/state/app.store';

afterEach(() => {
  useAppStore.setState({ contextLabel: null });
});

describe('PatternsPage — empty state', () => {
  it('shows an ingest CTA with a link to data-intelligence', () => {
    render(<PatternsPage />);
    expect(screen.getByText(/no investigation data yet/i)).toBeInTheDocument();
    expect(screen.getByText('Ingest Data')).toBeInTheDocument();
    expect(screen.getByText('Ingest Data').closest('a')).toHaveAttribute('href', '/data-intelligence');
  });
});

describe('AnalyticsPage — empty state', () => {
  it('shows an ingest CTA with a link to data-intelligence', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText(/no investigation data yet/i)).toBeInTheDocument();
    expect(screen.getByText('Ingest Data')).toBeInTheDocument();
    expect(screen.getByText('Ingest Data').closest('a')).toHaveAttribute('href', '/data-intelligence');
  });
});