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
vi.mock('../api/datasets', () => ({ fetchDatasets: vi.fn() }));
vi.mock('../components/ChartView', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="chart-view" data-option={JSON.stringify(option)} />
  ),
}));

import { listCharts } from '../api/charts';
import { fetchDatasets } from '../api/datasets';

const mockListCharts = listCharts as ReturnType<typeof vi.fn>;
const mockFetchDatasets = fetchDatasets as ReturnType<typeof vi.fn>;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<div>Trang upload</div>} />
          <Route path="/datasets/:id/columns" element={<div>Trang cột</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const datasets = [
  { id: 'ds-1', name: 'Từ vựng HSK', originalName: 'hsk.xlsx', mimeType: 'x', sizeBytes: 1, minioKey: 'k', rowCount: null, createdAt: '2026-06-27T00:00:00.000Z' },
  { id: 'ds-2', name: 'Báo giá thịt', originalName: 'bao-gia.xlsx', mimeType: 'x', sizeBytes: 1, minioKey: 'k', rowCount: null, createdAt: '2026-06-28T00:00:00.000Z' },
];

const savedCharts = [
  { id: 'c-1', type: 'line', title: 'Doanh thu theo tháng', config: { series: [] }, createdAt: '2026-06-27T00:00:00.000Z' },
  { id: 'c-2', type: 'bar', title: 'So sánh khu vực', config: { series: [] }, createdAt: '2026-06-27T01:00:00.000Z' },
];

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchDatasets.mockResolvedValue([]);
    mockListCharts.mockResolvedValue([]);
  });

  it('renders user name in header', () => {
    renderPage();
    expect(screen.getByText('Gohan')).toBeInTheDocument();
  });

  it('renders logout button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it('always shows the "Sheet của tôi" section with an add button', async () => {
    renderPage();
    expect(await screen.findByText('Sheet của tôi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm sheet' })).toBeInTheDocument();
  });

  it('lists loaded sheets as cards', async () => {
    mockFetchDatasets.mockResolvedValue(datasets);
    renderPage();
    expect(await screen.findByText(/Từ vựng HSK/)).toBeInTheDocument();
    expect(screen.getByText(/Báo giá thịt/)).toBeInTheDocument();
    expect(screen.getByText(/2 sheet đã load/)).toBeInTheDocument();
  });

  it('opens a sheet (→ columns) when clicking its card', async () => {
    mockFetchDatasets.mockResolvedValue(datasets);
    renderPage();
    fireEvent.click(await screen.findByText(/Từ vựng HSK/));
    expect(screen.getByText('Trang cột')).toBeInTheDocument();
  });

  it('navigates to /upload via the "+" add button', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm sheet' }));
    expect(screen.getByText('Trang upload')).toBeInTheDocument();
  });

  it('renders saved charts below when present', async () => {
    mockListCharts.mockResolvedValue(savedCharts);
    renderPage();
    expect(await screen.findByText('Doanh thu theo tháng')).toBeInTheDocument();
    expect(screen.getByText('So sánh khu vực')).toBeInTheDocument();
    expect(screen.getAllByTestId('chart-view')).toHaveLength(2);
    expect(screen.getByText(/2 biểu đồ/)).toBeInTheDocument();
  });

  it('hides the saved-charts section when there are none', async () => {
    renderPage();
    await screen.findByText('Sheet của tôi');
    expect(screen.queryByText('Biểu đồ đã lưu')).not.toBeInTheDocument();
  });
});
