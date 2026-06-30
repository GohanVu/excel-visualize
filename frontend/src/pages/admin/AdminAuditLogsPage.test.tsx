import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminAuditLogsPage from './AdminAuditLogsPage';
import client from '../../api/client';

vi.mock('../../api/client');
const mockedGet = vi.mocked(client.get);

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AdminAuditLogsPage />
    </QueryClientProvider>,
  );
}

const mockResponsePage1 = {
  logs: [
    {
      id: 'log-1',
      userId: 'user-1',
      action: 'auth.login',
      entity: 'User',
      entityId: 'user-1',
      metadata: { email: 'user@test.com' },
      ipAddress: '127.0.0.1',
      createdAt: '2026-06-30T05:00:00.000Z',
      user: { email: 'user@test.com', name: 'Test User' },
    },
  ],
  total: 25,
  page: 1,
  limit: 20,
  totalPages: 2,
};

const mockResponsePage2 = {
  logs: [
    {
      id: 'log-2',
      userId: 'admin-1',
      action: 'admin.override_plan',
      entity: 'User',
      entityId: 'user-2',
      metadata: { targetEmail: 'other@test.com', plan: 'pro' },
      ipAddress: '127.0.0.1',
      createdAt: '2026-06-30T05:10:00.000Z',
      user: { email: 'admin@test.com', name: 'Admin' },
    },
  ],
  total: 25,
  page: 2,
  limit: 20,
  totalPages: 2,
};

describe('AdminAuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner while loading', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders logs and pagination correctly on page 1', async () => {
    mockedGet.mockResolvedValue({ data: mockResponsePage1 });

    renderPage();

    expect(await screen.findByText('auth.login')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('user@test.com')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText(/"email": "user@test.com"/)).toBeInTheDocument();

    expect(screen.getByText(/Hiển thị trang 1 \/ 2/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sau' })).toBeEnabled();
  });

  it('navigates to page 2 when clicking Sau', async () => {
    mockedGet
      .mockResolvedValueOnce({ data: mockResponsePage1 }) // first load
      .mockResolvedValueOnce({ data: mockResponsePage2 }); // click next

    renderPage();

    const nextBtn = await screen.findByRole('button', { name: 'Sau' });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(mockedGet).toHaveBeenLastCalledWith('/admin/audit-logs?page=2&limit=20');
    });

    expect(await screen.findByText('admin.override_plan')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText(/"plan": "pro"/)).toBeInTheDocument();

    expect(screen.getByText(/Hiển thị trang 2 \/ 2/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trước' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Sau' })).toBeDisabled();
  });

  it('renders empty state when there are no logs', async () => {
    mockedGet.mockResolvedValue({ data: { logs: [], total: 0, page: 1, limit: 20, totalPages: 0 } });

    renderPage();

    expect(await screen.findByText('Chưa có hoạt động nào được ghi nhận.')).toBeInTheDocument();
  });

  it('renders error message when API fails', async () => {
    mockedGet.mockRejectedValue(new Error('Network Error'));

    renderPage();

    expect(await screen.findByText(/Không thể tải nhật ký hoạt động/i)).toBeInTheDocument();
  });
});
