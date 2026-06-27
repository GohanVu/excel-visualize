import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PublicRoute from './PublicRoute';
import * as useAuthModule from '../hooks/useAuth';

vi.mock('../hooks/useAuth');
const mockedUseAuth = vi.mocked(useAuthModule.useAuth);

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<div>Login page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('PublicRoute', () => {
  it('shows spinner while loading', () => {
    mockedUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false, user: null });

    const { container } = renderWithRouter('/login');

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders login page when not authenticated', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, user: null });

    renderWithRouter('/login');

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects to /dashboard when already authenticated', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true, user: null });

    renderWithRouter('/login');

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
