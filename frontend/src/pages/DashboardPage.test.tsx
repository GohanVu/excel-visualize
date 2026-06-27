import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from './DashboardPage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Gohan' }, isLoading: false, isAuthenticated: true }),
}));
vi.mock('../api/client', () => ({ default: { post: vi.fn() } }));
vi.mock('../api/charts', () => ({ listCharts: vi.fn() }));
vi.mock('../components/ChartView', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="chart-view" data-option={JSON.stringify(option)} />
  ),
}));

import { listCharts } from '../api/charts';

const mockListCharts = listCharts as ReturnType<typeof vi.fn>;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<div>Trang upload</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const savedCharts = [
  {
    id: 'c-1',
    type: 'line',
    title: 'Doanh thu theo tháng',
    config: { series: [] },
    createdAt: '2026-06-27T00:00:00.000Z',
  },
  {
    id: 'c-2',
    type: 'bar',
    title: 'So sánh khu vực',
    config: { series: [] },
    createdAt: '2026-06-27T01:00:00.000Z',
  },
];

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders user name in header', async () => {
    mockListCharts.mockResolvedValue([]);
    renderPage();
    expect(screen.getByText('Gohan')).toBeInTheDocument();
  });

  it('renders logout button', async () => {
    mockListCharts.mockResolvedValue([]);
    renderPage();
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it('shows empty state when there are no saved charts', async () => {
    mockListCharts.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/Chào mừng đến ChartLy/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload dữ liệu' })).toBeInTheDocument();
  });

  it('navigates to /upload from empty state', async () => {
    mockListCharts.mockResolvedValue([]);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Upload dữ liệu' }));
    expect(screen.getByText('Trang upload')).toBeInTheDocument();
  });

  it('renders saved charts when present', async () => {
    mockListCharts.mockResolvedValue(savedCharts);
    renderPage();
    expect(await screen.findByText('Doanh thu theo tháng')).toBeInTheDocument();
    expect(screen.getByText('So sánh khu vực')).toBeInTheDocument();
    expect(screen.getAllByTestId('chart-view')).toHaveLength(2);
  });

  it('shows chart count when charts exist', async () => {
    mockListCharts.mockResolvedValue(savedCharts);
    renderPage();
    expect(await screen.findByText(/2 biểu đồ đã lưu/)).toBeInTheDocument();
  });

  it('navigates to /upload via "Thêm biểu đồ" when charts exist', async () => {
    mockListCharts.mockResolvedValue(savedCharts);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Thêm biểu đồ/ }));
    expect(screen.getByText('Trang upload')).toBeInTheDocument();
  });
});
