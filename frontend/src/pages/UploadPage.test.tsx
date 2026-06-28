import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UploadPage from './UploadPage';

vi.mock('../components/FileUpload', () => ({
  default: ({ onSuccess }: { onSuccess: (id: string) => void }) => (
    <button onClick={() => onSuccess('ds-1')}>FileUpload stub</button>
  ),
}));

function renderPage() {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/upload']}>
        <Routes>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/datasets/:id/columns" element={<div>Trang cột</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { spy };
}

describe('UploadPage', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText('Upload dữ liệu')).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderPage();
    expect(screen.getByText(/upload file excel/i)).toBeInTheDocument();
  });

  it('renders FileUpload component', () => {
    renderPage();
    expect(screen.getByText('FileUpload stub')).toBeInTheDocument();
  });

  it('invalidates the datasets list + navigates on upload success', () => {
    const { spy } = renderPage();
    fireEvent.click(screen.getByText('FileUpload stub'));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['datasets'] });
    expect(screen.getByText('Trang cột')).toBeInTheDocument();
  });
});
