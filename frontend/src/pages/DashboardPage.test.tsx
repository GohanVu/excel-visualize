import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './DashboardPage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Gohan' }, isLoading: false, isAuthenticated: true }),
}));
vi.mock('../api/client', () => ({ default: { post: vi.fn() } }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/upload" element={<div>Trang upload</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders welcome heading and user name', () => {
    renderPage();
    expect(screen.getByText(/Chào mừng đến ChartLy/)).toBeInTheDocument();
    expect(screen.getByText('Gohan')).toBeInTheDocument();
  });

  it('navigates to /upload when clicking upload button', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Upload dữ liệu' }));
    expect(screen.getByText('Trang upload')).toBeInTheDocument();
  });

  it('renders logout button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
  });
});
