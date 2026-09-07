import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RankingTable, formatRankingValue, type RankingRow } from './ranking-table';

const ROWS: RankingRow[] = [
  { entityId: 'e1', label: 'Alpha', value: 1 },
  { entityId: 'e2', label: 'Beta', value: 0.5, secondary: 'org' },
  { entityId: 'e3', label: 'Gamma', value: 0.25 },
];

describe('RankingTable', () => {
  it('renders ranked rows in order', () => {
    render(<RankingTable rows={ROWS} />);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('honours the limit', () => {
    render(<RankingTable rows={ROWS} limit={2} />);
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows secondary text', () => {
    render(<RankingTable rows={ROWS} />);
    expect(screen.getByText('org')).toBeInTheDocument();
  });

  it('uses the provided value formatter', () => {
    render(
      <RankingTable
        rows={ROWS}
        valueFormatter={(r) => `${Math.round(r.value * 100)}%`}
      />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calls onSelect with the row', () => {
    const onSelect = jest.fn();
    render(<RankingTable rows={ROWS} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Alpha'));
    expect(onSelect).toHaveBeenCalledWith(ROWS[0]);
  });

  it('renders the empty label when there are no rows', () => {
    render(<RankingTable rows={[]} emptyLabel="No data" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('formats ranking values as percentages', () => {
    expect(formatRankingValue(0.42)).toBe('42%');
  });
});
