import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import * as useAuthModule from '../hooks/useAuth';

vi.mock('../hooks/useAuth');
const mockedUseAuth = vi.mocked(useAuthModule.useAuth);

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin Panel</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminRoute', () => {
  it('shows spinner while loading', () => {
    mockedUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false, user: null });

    const { container } = renderWithRouter('/admin');

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders admin page when authenticated as admin', () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: '1', email: 'a@a.com', role: 'admin', name: 'Admin', avatarUrl: null, createdAt: '', updatedAt: '' },
    });

    renderWithRouter('/admin');

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('redirects to /dashboard when authenticated but not admin', () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: '1', email: 'u@u.com', role: 'user', name: 'User', avatarUrl: null, createdAt: '', updatedAt: '' },
    });

    renderWithRouter('/admin');

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('redirects to /dashboard when not authenticated', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, user: null });

    renderWithRouter('/admin');

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });
});
