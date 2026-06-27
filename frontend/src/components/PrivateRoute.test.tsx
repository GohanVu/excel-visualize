import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import * as useAuthModule from '../hooks/useAuth';

vi.mock('../hooks/useAuth');
const mockedUseAuth = vi.mocked(useAuthModule.useAuth);

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('PrivateRoute', () => {
  it('shows spinner while loading', () => {
    mockedUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false, user: null });

    const { container } = renderWithRouter('/dashboard');

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders protected page when authenticated', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true, user: null });

    renderWithRouter('/dashboard');

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, user: null });

    renderWithRouter('/dashboard');

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
