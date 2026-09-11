import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import NetworksPage from '@/app/(dashboard)/networks/page';
import { presentationNetworkSummaries } from '@/mock/networks';

afterEach(() => {
  cleanup();
});

describe('NetworksPage (presentation lock)', () => {
  it('renders only the Operation Trinetra Nexus network card', () => {
    render(<NetworksPage />);
    expect(screen.getByRole('heading', { name: 'Networks' })).toBeInTheDocument();
    expect(presentationNetworkSummaries.map((n) => n.id)).toEqual(['NET-004']);
    expect(screen.getByRole('link', { name: /operation trinetra nexus/i })).toBeInTheDocument();
    expect(screen.getAllByText('Open graph')).toHaveLength(1);
  });

  it('never surfaces legacy networks on the presentation page', () => {
    render(<NetworksPage />);
    expect(screen.queryByText(/Operation Clean/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Harbour Ring/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Skyline Cell/i)).not.toBeInTheDocument();
  });

  it('links the card to the NET-004 graph workspace', () => {
    render(<NetworksPage />);
    const link = screen.getByRole('link', { name: /operation trinetra nexus/i });
    expect(link.getAttribute('href')).toBe('/networks/NET-004');
  });

  it('summarizes the Nexus network structural counts neutrally', () => {
    render(<NetworksPage />);
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});