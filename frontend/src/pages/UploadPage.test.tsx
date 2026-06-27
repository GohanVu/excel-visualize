import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UploadPage from './UploadPage';

vi.mock('../components/FileUpload', () => ({
  default: ({ onSuccess }: { onSuccess: (id: string) => void }) => (
    <button onClick={() => onSuccess('ds-1')}>FileUpload stub</button>
  ),
}));

describe('UploadPage', () => {
  it('renders heading', () => {
    render(<MemoryRouter><UploadPage /></MemoryRouter>);
    expect(screen.getByText('Upload dữ liệu')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<MemoryRouter><UploadPage /></MemoryRouter>);
    expect(screen.getByText(/upload file excel/i)).toBeInTheDocument();
  });

  it('renders FileUpload component', () => {
    render(<MemoryRouter><UploadPage /></MemoryRouter>);
    expect(screen.getByText('FileUpload stub')).toBeInTheDocument();
  });
});
