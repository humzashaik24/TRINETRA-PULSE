import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CsvMappingDialog } from '@/components/data-intelligence/csv-mapping-dialog';
import type { ColumnMappingSuggestion } from '@/lib/csv-mapping';

const suggestions: ColumnMappingSuggestion[] = [
  { sourceColumn: 'name', target: 'person', confidence: 0.9 },
  { sourceColumn: 'phone', target: 'phone', confidence: 0.8 },
  { sourceColumn: 'xyz_unknown', target: 'skip', confidence: 0 },
];

const previewRows = [
  ['Alice', '123', 'foo'],
  ['Bob', '456', 'bar'],
];

describe('CsvMappingDialog', () => {
  it('renders column mappings with preview data', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(
      <CsvMappingDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        fileName="fir.csv"
        suggestions={suggestions}
        previewRows={previewRows}
      />
    );

    expect(screen.getByText(/Column Mapping/)).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getAllByText('phone').length).toBeGreaterThan(0);
    expect(screen.getByText('xyz_unknown')).toBeInTheDocument();
    // Unmapped count warning shown
    expect(screen.getByText(/1 column will not be imported/i)).toBeInTheDocument();
    // Continue button enabled because at least one column is mapped
    expect(screen.getByRole('button', { name: /continue upload/i })).toBeEnabled();
  });

  it('disables Continue when no columns are mapped', () => {
    const allSkipped: ColumnMappingSuggestion[] = [
      { sourceColumn: 'a', target: 'skip', confidence: 0 },
      { sourceColumn: 'b', target: 'skip', confidence: 0 },
    ];
    render(
      <CsvMappingDialog
        open
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        fileName="x.csv"
        suggestions={allSkipped}
        previewRows={previewRows}
      />
    );
    expect(screen.getByRole('button', { name: /continue upload/i })).toBeDisabled();
  });

  it('calls onConfirm with updated mappings when a column is corrected', () => {
    const onConfirm = jest.fn();
    render(
      <CsvMappingDialog
        open
        onClose={jest.fn()}
        onConfirm={onConfirm}
        fileName="fir.csv"
        suggestions={suggestions}
        previewRows={previewRows}
      />
    );

    // Find the select corresponding to the unmapped column (xyz_unknown).
    const selects = screen.getAllByRole('combobox');
    const unmappedSelect = selects[2] as HTMLSelectElement; // third header
    fireEvent.change(unmappedSelect, { target: { value: 'person' } });

    fireEvent.click(screen.getByRole('button', { name: /continue upload/i }));
    const confirmed = onConfirm.mock.calls[0][0] as ColumnMappingSuggestion[];
    expect(confirmed.find((m) => m.sourceColumn === 'xyz_unknown')?.target).toBe('person');
  });

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    render(
      <CsvMappingDialog
        open
        onClose={onClose}
        onConfirm={jest.fn()}
        fileName="fir.csv"
        suggestions={suggestions}
        previewRows={previewRows}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
