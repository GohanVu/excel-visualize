import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UploadPage from './UploadPage';
import * as datasetsApi from '../api/datasets';

vi.mock('../components/FileUpload', () => ({
  default: ({ onSuccess }: { onSuccess: (id: string) => void }) => (
    <button onClick={() => onSuccess('ds-1')}>FileUpload stub</button>
  ),
}));

vi.mock('../api/datasets', () => ({
  importGoogleSheet: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';

const mockedImportGoogleSheet = vi.mocked(datasetsApi.importGoogleSheet);
const mockedUseAuth = vi.mocked(useAuth);

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@u.com',
        googleConnected: false,
        role: 'user',
        name: 'User',
        avatarUrl: null,
        createdAt: '',
        updatedAt: '',
      },
      isLoading: false,
      isAuthenticated: true,
    });
  });

  it('renders heading', () => {
    renderPage();
    expect(screen.getByText('Thêm dữ liệu')).toBeInTheDocument();
  });

  it('renders default FileUpload tab', () => {
    renderPage();
    expect(screen.getByText('FileUpload stub')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/docs.google.com/i)).not.toBeInTheDocument();
  });

  it('switches to Google Sheet tab and renders form', () => {
    renderPage();
    const googleTab = screen.getByRole('button', { name: /Google Sheet/i });
    fireEvent.click(googleTab);

    expect(screen.queryByText('FileUpload stub')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/docs.google.com/i)).toBeInTheDocument();
    expect(screen.getByText('Kết nối dữ liệu')).toBeInTheDocument();
  });

  it('submits Google Sheet URL successfully and navigates', async () => {
    mockedImportGoogleSheet.mockResolvedValueOnce({
      id: 'ds-google-123',
      name: 'GoogleSheet',
      originalName: 'GoogleSheet.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 1000,
      minioKey: 'key',
      googleSpreadsheetId: '123',
      rowCount: null,
      createdAt: '',
    });

    const { spy } = renderPage();
    
    // Switch to Google Sheet tab
    fireEvent.click(screen.getByRole('button', { name: /Google Sheet/i }));

    // Input URL
    const input = screen.getByPlaceholderText(/docs.google.com/i);
    fireEvent.change(input, { target: { value: 'https://docs.google.com/spreadsheets/d/123/edit' } });

    // Submit
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(mockedImportGoogleSheet).toHaveBeenCalledWith('https://docs.google.com/spreadsheets/d/123/edit');
      expect(spy).toHaveBeenCalledWith({ queryKey: ['datasets'] });
      expect(screen.getByText('Trang cột')).toBeInTheDocument();
    });
  });

  it('displays error message on Google Sheet connection failure', async () => {
    mockedImportGoogleSheet.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Không thể truy cập Google Sheet. Hãy đảm bảo sheet ở chế độ công khai.',
        },
      },
    });

    renderPage();
    
    fireEvent.click(screen.getByRole('button', { name: /Google Sheet/i }));
    fireEvent.change(screen.getByPlaceholderText(/docs.google.com/i), {
      target: { value: 'https://docs.google.com/spreadsheets/d/private/edit' },
    });
    fireEvent.submit(screen.getByRole('form'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể truy cập Google Sheet. Hãy đảm bảo sheet ở chế độ công khai.',
    );
  });

  it('shows Google connection prompt when googleConnected is false', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@u.com',
        googleConnected: false,
        role: 'user',
        name: 'User',
        avatarUrl: null,
        createdAt: '',
        updatedAt: '',
      },
      isLoading: false,
      isAuthenticated: true,
    });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Google Sheet/i }));

    expect(screen.getByText(/Chưa liên kết Google/i)).toBeInTheDocument();
    expect(screen.getByText('Kết nối ngay')).toBeInTheDocument();
    expect(screen.getByText('Kết nối ngay')).toHaveAttribute('href', '/api/auth/google/sheets');
  });

  it('shows Google connection success status when googleConnected is true', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@u.com',
        googleConnected: true,
        role: 'user',
        name: 'User',
        avatarUrl: null,
        createdAt: '',
        updatedAt: '',
      },
      isLoading: false,
      isAuthenticated: true,
    });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Google Sheet/i }));

    expect(screen.getByText(/Đã liên kết tài khoản Google/i)).toBeInTheDocument();
    expect(screen.queryByText('Kết nối ngay')).not.toBeInTheDocument();
  });
});

