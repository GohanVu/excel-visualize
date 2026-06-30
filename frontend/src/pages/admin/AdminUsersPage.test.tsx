import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminUsersPage from './AdminUsersPage';
import client from '../../api/client';

vi.mock('../../api/client');
const mockedGet = vi.mocked(client.get);
const mockedPatch = vi.mocked(client.patch);

const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AdminUsersPage />
    </QueryClientProvider>,
  );
}

const mockUsers = [
  {
    id: 'user-admin',
    email: 'admin@test.com',
    name: 'Admin User',
    avatarUrl: null,
    role: 'admin',
    createdAt: '2026-06-01T00:00:00.000Z',
    subscription: null,
  },
  {
    id: 'user-free',
    email: 'free@test.com',
    name: 'Free User',
    avatarUrl: 'https://example.com/free.jpg',
    role: 'user',
    createdAt: '2026-06-02T00:00:00.000Z',
    subscription: { plan: 'free', status: 'active' },
  },
  {
    id: 'user-pro',
    email: 'pro@test.com',
    name: 'Pro User',
    avatarUrl: null,
    role: 'user',
    createdAt: '2026-06-03T00:00:00.000Z',
    subscription: { plan: 'pro', status: 'active' },
  },
];

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner while loading', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders users table correctly', async () => {
    mockedGet.mockResolvedValue({ data: mockUsers });

    renderPage();

    expect(await screen.findByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();

    expect(screen.getByText('Free User')).toBeInTheDocument();
    expect(screen.getByText('free@test.com')).toBeInTheDocument();
    expect(screen.getAllByText('FREE')).toHaveLength(2); // Admin (no sub) and Free User both show FREE
    expect(screen.getByText('Nâng cấp PRO')).toBeInTheDocument();

    expect(screen.getByText('Pro User')).toBeInTheDocument();
    expect(screen.getByText('pro@test.com')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText('Hạ cấp FREE')).toBeInTheDocument();
  });

  it('triggers upgrade mutation when clicking Nâng cấp PRO', async () => {
    mockedGet.mockResolvedValue({ data: mockUsers });
    mockedPatch.mockResolvedValue({ data: { success: true } });

    renderPage();

    const upgradeBtn = await screen.findByText('Nâng cấp PRO');
    fireEvent.click(upgradeBtn);

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith('/admin/users/user-free/plan', { plan: 'pro' });
    });
  });

  it('triggers downgrade mutation when clicking Hạ cấp FREE', async () => {
    mockedGet.mockResolvedValue({ data: mockUsers });
    mockedPatch.mockResolvedValue({ data: { success: true } });

    renderPage();

    const downgradeBtn = await screen.findByText('Hạ cấp FREE');
    fireEvent.click(downgradeBtn);

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith('/admin/users/user-pro/plan', { plan: 'free' });
    });
  });

  it('shows alert on update plan failure', async () => {
    mockedGet.mockResolvedValue({ data: mockUsers });
    mockedPatch.mockRejectedValue(new Error('Failed'));

    renderPage();

    const upgradeBtn = await screen.findByText('Nâng cấp PRO');
    fireEvent.click(upgradeBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Cập nhật gói thất bại!');
    });
  });

  it('renders error message when API fails', async () => {
    mockedGet.mockRejectedValue(new Error('Network Error'));

    renderPage();

    expect(await screen.findByText(/Không thể tải danh sách người dùng/i)).toBeInTheDocument();
  });
});
