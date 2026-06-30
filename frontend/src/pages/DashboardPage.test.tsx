import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from './DashboardPage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Gohan' }, isLoading: false, isAuthenticated: true }),
}));
vi.mock('../api/client', () => ({ default: { post: vi.fn() } }));
vi.mock('../api/charts', () => ({
  listCharts: vi.fn(),
  updateLayout: vi.fn(),
  deleteChart: vi.fn(),
  updateChart: vi.fn(),
}));
vi.mock('../api/datasets', () => ({ fetchDatasets: vi.fn(), deleteDataset: vi.fn() }));
vi.mock('../api/dashboards', () => ({
  getDefaultDashboard: vi.fn(),
  renameDashboard: vi.fn(),
}));
// react-grid-layout đo bề rộng container (≈0 trong test) → mock thành passthrough
vi.mock('react-grid-layout', () => ({
  WidthProvider: (C: unknown) => C,
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="grid-layout">{children}</div>
  ),
}));
vi.mock('../components/ChartView', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="chart-view" data-option={JSON.stringify(option)} />
  ),
}));

import { listCharts, deleteChart, updateChart } from '../api/charts';
import { fetchDatasets, deleteDataset } from '../api/datasets';
import { getDefaultDashboard, renameDashboard } from '../api/dashboards';

const mockListCharts = listCharts as ReturnType<typeof vi.fn>;
const mockDeleteChart = deleteChart as ReturnType<typeof vi.fn>;
const mockUpdateChart = updateChart as ReturnType<typeof vi.fn>;
const mockFetchDatasets = fetchDatasets as ReturnType<typeof vi.fn>;
const mockDeleteDataset = deleteDataset as ReturnType<typeof vi.fn>;
const mockGetDefaultDashboard = getDefaultDashboard as ReturnType<typeof vi.fn>;
const mockRenameDashboard = renameDashboard as ReturnType<typeof vi.fn>;

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
    mockListCharts.mockResolvedValue({ charts: [], limit: 3 });
    mockDeleteDataset.mockResolvedValue(undefined);
    mockDeleteChart.mockResolvedValue(undefined);
    mockUpdateChart.mockResolvedValue(undefined);
    mockGetDefaultDashboard.mockResolvedValue(null);
    mockRenameDashboard.mockResolvedValue({ id: 'dash-1', name: 'Mới' });
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

  it('deletes a sheet after the two-step confirm', async () => {
    mockFetchDatasets.mockResolvedValue(datasets);
    renderPage();
    await screen.findByText(/Từ vựng HSK/);
    // bước 1: mở xác nhận
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Từ vựng HSK' }));
    // bước 2: xác nhận
    fireEvent.click(screen.getByRole('button', { name: 'Xoá' }));
    await waitFor(() =>
      expect(mockDeleteDataset).toHaveBeenCalledWith('ds-1'),
    );
  });

  it('cancel keeps the sheet (no delete call)', async () => {
    mockFetchDatasets.mockResolvedValue(datasets);
    renderPage();
    await screen.findByText(/Từ vựng HSK/);
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Từ vựng HSK' }));
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(mockDeleteDataset).not.toHaveBeenCalled();
  });

  it('renders saved charts below when present', async () => {
    mockListCharts.mockResolvedValue({ charts: savedCharts, limit: 3 });
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

  it('xoá chart sau xác nhận 2 bước', async () => {
    mockListCharts.mockResolvedValue({ charts: savedCharts, limit: 3 });
    renderPage();
    await screen.findByText('Doanh thu theo tháng');
    fireEvent.click(
      screen.getByRole('button', { name: 'Xoá Doanh thu theo tháng' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xoá' })); // xác nhận
    await waitFor(() => expect(mockDeleteChart).toHaveBeenCalledWith('c-1'));
  });

  it('huỷ xoá chart → không gọi deleteChart', async () => {
    mockListCharts.mockResolvedValue({ charts: savedCharts, limit: 3 });
    renderPage();
    await screen.findByText('Doanh thu theo tháng');
    fireEvent.click(
      screen.getByRole('button', { name: 'Xoá Doanh thu theo tháng' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(mockDeleteChart).not.toHaveBeenCalled();
  });

  it('Thêm biểu đồ → chọn sheet → điều hướng tới /columns của sheet đó', async () => {
    mockListCharts.mockResolvedValue({ charts: savedCharts, limit: 3 });
    mockFetchDatasets.mockResolvedValue(datasets);
    renderPage();
    await screen.findByText('Doanh thu theo tháng');
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm biểu đồ' }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: /Từ vựng HSK/ }),
    );
    expect(screen.getByText('Trang cột')).toBeInTheDocument();
  });

  it('mở panel tuỳ chỉnh khi bấm ⚙', async () => {
    mockListCharts.mockResolvedValue({ charts: savedCharts, limit: 3 });
    renderPage();
    await screen.findByText('Doanh thu theo tháng');
    fireEvent.click(
      screen.getByRole('button', { name: 'Tuỳ chỉnh Doanh thu theo tháng' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Tuỳ chỉnh biểu đồ' }),
    ).toBeInTheDocument();
  });

  it('lưu tuỳ chỉnh → gọi updateChart với id + patch (đổi bảng màu)', async () => {
    mockListCharts.mockResolvedValue({ charts: savedCharts, limit: 3 });
    renderPage();
    await screen.findByText('Doanh thu theo tháng');
    fireEvent.click(
      screen.getByRole('button', { name: 'Tuỳ chỉnh Doanh thu theo tháng' }),
    );
    // đổi bảng màu sang "Đại dương" rồi lưu
    fireEvent.click(screen.getByRole('button', { name: /Đại dương/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(mockUpdateChart).toHaveBeenCalledTimes(1));
    const [id, patch] = mockUpdateChart.mock.calls[0];
    expect(id).toBe('c-1');
    expect(patch.title).toBe('Doanh thu theo tháng');
    expect((patch.config as { color: string[] }).color).toContain('#1d4ed8');
  });

  describe('đổi tên dashboard (P2-T7)', () => {
    it('shows the dashboard name as the section title when present', async () => {
      mockListCharts.mockResolvedValue({ charts: savedCharts, limit: 3 });
      mockGetDefaultDashboard.mockResolvedValue({ id: 'dash-1', name: 'Doanh số Q1' });
      renderPage();
      expect(
        await screen.findByRole('heading', { name: 'Doanh số Q1' }),
      ).toBeInTheDocument();
    });

    it('renames via the inline edit form → calls renameDashboard with id + new name', async () => {
      mockListCharts.mockResolvedValue({ charts: savedCharts, limit: 3 });
      mockGetDefaultDashboard.mockResolvedValue({ id: 'dash-1', name: 'Cũ' });
      renderPage();
      await screen.findByRole('heading', { name: 'Cũ' });

      fireEvent.click(screen.getByRole('button', { name: 'Đổi tên dashboard' }));
      const input = screen.getByLabelText('Tên dashboard');
      fireEvent.change(input, { target: { value: 'Báo cáo 2026' } });
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

      await waitFor(() =>
        expect(mockRenameDashboard).toHaveBeenCalledWith('dash-1', 'Báo cáo 2026'),
      );
    });

    it('does not call renameDashboard when the name is unchanged', async () => {
      mockListCharts.mockResolvedValue({ charts: savedCharts, limit: 3 });
      mockGetDefaultDashboard.mockResolvedValue({ id: 'dash-1', name: 'Cũ' });
      renderPage();
      await screen.findByRole('heading', { name: 'Cũ' });

      fireEvent.click(screen.getByRole('button', { name: 'Đổi tên dashboard' }));
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' })); // không đổi gì
      expect(mockRenameDashboard).not.toHaveBeenCalled();
    });
  });

  describe('locked chart slot (P2-T4)', () => {
    const threeCharts = [
      ...savedCharts,
      { id: 'c-3', type: 'pie', title: 'Tỷ trọng', config: { series: [] }, createdAt: '2026-06-27T02:00:00.000Z' },
    ];

    it('shows the locked slot when a Free user is at the chart cap', async () => {
      mockListCharts.mockResolvedValue({ charts: threeCharts, limit: 3 });
      renderPage();
      await screen.findByText('Tỷ trọng');
      expect(screen.getByRole('note', { name: 'Biểu đồ bị khoá' })).toBeInTheDocument();
      expect(screen.getByText(/Đã đạt 3 biểu đồ của gói Free/)).toBeInTheDocument();
    });

    it('does NOT show the locked slot while under the cap', async () => {
      // 2 chart, limit 3 → còn chỗ → không nudge
      mockListCharts.mockResolvedValue({ charts: savedCharts, limit: 3 });
      renderPage();
      await screen.findByText('Doanh thu theo tháng');
      expect(screen.queryByRole('note', { name: 'Biểu đồ bị khoá' })).not.toBeInTheDocument();
    });

    it('does NOT show the locked slot for a Pro user (limit null)', async () => {
      mockListCharts.mockResolvedValue({ charts: threeCharts, limit: null });
      renderPage();
      await screen.findByText('Tỷ trọng');
      expect(screen.queryByRole('note', { name: 'Biểu đồ bị khoá' })).not.toBeInTheDocument();
    });
  });
});
