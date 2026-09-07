import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadZone } from '@/components/data-intelligence/upload-zone';

function makeCsvFile(name: string): File {
  const content = 'caller_num,callee_num,duration\n1234567890,0987654321,45\n2222222222,3333333333,90';
  return new File([content], name, { type: 'text/csv' });
}

function makeUnknownCsvFile(name: string): File {
  const content = 'xyz_column_a,xyz_column_b\nfoo,bar\nbaz,qux';
  return new File([content], name, { type: 'text/csv' });
}

function makeRecognizedCsvFile(name: string): File {
  const content = 'caller_num,callee_num,amount\n1234567890,0987654321,45\n2222222222,3333333333,90';
  return new File([content], name, { type: 'text/csv' });
}

describe('UploadZone — CSV column mapping', () => {
  it('shows the column mapping dialog for CSVs with unrecognized columns', async () => {
    render(<UploadZone investigationId="inv-006" />);

    const input = screen.getByLabelText('Upload files') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile('cdr.csv')] } });

    // Wait for the validation timeout (500ms) to elapse, then the Upload button.
    const uploadButton = await screen.findByRole('button', { name: /upload 1 file/i }, { timeout: 3000 });
    fireEvent.click(uploadButton);

    expect(await screen.findByText(/column mapping/i)).toBeInTheDocument();
  });

  it('skips the mapping dialog when all CSV headers are recognized', async () => {
    render(<UploadZone investigationId="inv-006" />);

    const input = screen.getByLabelText('Upload files') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeRecognizedCsvFile('cdr.csv')] } });

    const uploadButton = await screen.findByRole('button', { name: /upload 1 file/i }, { timeout: 3000 });
    fireEvent.click(uploadButton);

    // No mapping dialog for recognized headers — file proceeds to upload.
    expect(screen.queryByText(/column mapping/i)).not.toBeInTheDocument();
  });

  it('removes a selected file from the queue', async () => {
    render(<UploadZone investigationId="inv-006" />);

    const input = screen.getByLabelText('Upload files') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeUnknownCsvFile('fir.csv')] } });

    const removeButton = await screen.findByRole('button', { name: /remove fir.csv/i }, { timeout: 3000 });
    fireEvent.click(removeButton);

    expect(screen.queryByText('fir.csv')).not.toBeInTheDocument();
  });
});