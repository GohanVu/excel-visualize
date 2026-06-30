import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePage from './ProfilePage';
import * as useAuthModule from '../hooks/useAuth';
import client from '../api/client';

vi.mock('../hooks/useAuth');
vi.mock('../api/client');

const mockedUseAuth = vi.mocked(useAuthModule.useAuth);
const mockedPost = vi.mocked(client.post);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing if user is null', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, user: null });
    const { container } = renderPage();
    expect(container.firstChild).toBeNull();
  });

  it('renders user details correctly for a free user', () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'user-1',
        email: 'free@example.com',
        name: 'Free User',
        avatarUrl: null,
        role: 'user',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
        subscription: {
          id: 'sub-1',
          userId: 'user-1',
          plan: 'free',
          status: 'active',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
          createdAt: '',
          updatedAt: '',
        },
      },
    });

    renderPage();

    expect(screen.getByText('Free User')).toBeInTheDocument();
    expect(screen.getByText('free@example.com')).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('1/6/2026')).toBeInTheDocument(); // vi-VN date format
    expect(screen.queryByText('⚙️ Vào trang quản trị')).not.toBeInTheDocument();
  });

  it('renders user details correctly for an admin user', () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'admin',
        createdAt: '2026-06-02T00:00:00.000Z',
        updatedAt: '2026-06-02T00:00:00.000Z',
        subscription: {
          id: 'sub-2',
          userId: 'admin-1',
          plan: 'pro',
          status: 'active',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
          createdAt: '',
          updatedAt: '',
        },
      },
    });

    renderPage();

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('⭐ PRO')).toBeInTheDocument();
    expect(screen.getByText('2/6/2026')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('⚙️ Vào trang quản trị')).toBeInTheDocument();
  });

  it('navigates to admin page when clicking admin button', () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        avatarUrl: null,
        role: 'admin',
        createdAt: '2026-06-02T00:00:00.000Z',
        updatedAt: '2026-06-02T00:00:00.000Z',
        subscription: null,
      },
    });

    renderPage();

    fireEvent.click(screen.getByText('⚙️ Vào trang quản trị'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('calls logout API and redirects on logout click', async () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        avatarUrl: null,
        role: 'user',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
        subscription: null,
      },
    });
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });

    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: 'Đăng xuất' })[1]);
    
    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/auth/logout');
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
});
