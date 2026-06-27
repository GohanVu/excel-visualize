import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import ChartDetailPage from './ChartDetailPage';

vi.mock('../api/datasets', () => ({
  fetchRows: vi.fn(),
}));

vi.mock('../api/charts', () => ({
  saveChart: vi.fn(),
}));

vi.mock('../components/ChartView', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="chart-view" data-option={JSON.stringify(option)} />
  ),
}));

import { fetchRows } from '../api/datasets';
import { saveChart } from '../api/charts';

const mockFetchRows = fetchRows as ReturnType<typeof vi.fn>;
const mockSaveChart = saveChart as ReturnType<typeof vi.fn>;

const suggestion = {
  type: 'line' as const,
  title: 'Xu hướng theo thời gian',
  description: 'So sánh giá trị theo ngày',
  encoding: { x: 'Ngày', y: ['Doanh thu'] },
};

const selectedColumns = [0, 1];

function renderPage(state?: object) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/datasets/ds-1/chart',
            state: state ?? { suggestion, selectedColumns },
          },
        ]}
      >
        <Routes>
          <Route path="/datasets/:id/chart" element={<ChartDetailPage />} />
          <Route path="/datasets/:id/columns" element={<div>columns page</div>} />
          <Route path="/datasets/:id/charts" element={<div>charts page</div>} />
          <Route path="/dashboard" element={<div>dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChartDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchRows.mockResolvedValue({
      datasetId: 'ds-1',
      rows: [
        { Ngày: '2024-01-01', 'Doanh thu': '100' },
        { Ngày: '2024-01-02', 'Doanh thu': '200' },
      ],
    });
    mockSaveChart.mockResolvedValue({ chart: { id: 'c-1' }, dashboardId: 'd-1' });
  });

  it('redirects to columns page when there is no state', () => {
    renderPage({});
    expect(screen.getByText('columns page')).toBeInTheDocument();
  });

  it('shows spinner while loading', () => {
    mockFetchRows.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.animate-spin')).not.toBeNull();
  });

  it('renders chart title after data loads', async () => {
    renderPage();
    expect(await screen.findByText('Xu hướng theo thời gian')).toBeInTheDocument();
  });

  it('renders ChartView after data loads', async () => {
    renderPage();
    expect(await screen.findByTestId('chart-view')).toBeInTheDocument();
  });

  it('shows row count', async () => {
    renderPage();
    expect(await screen.findByText(/2 dòng dữ liệu/)).toBeInTheDocument();
  });

  it('back button navigates to charts page', async () => {
    renderPage();
    await screen.findByText('Xu hướng theo thời gian');
    await userEvent.click(screen.getByRole('button', { name: /Chọn lại biểu đồ/ }));
    expect(screen.getByText('charts page')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    mockFetchRows.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByText(/Không tải được dữ liệu/)).toBeInTheDocument();
  });

  it('calls saveChart with correct args on save button click', async () => {
    renderPage();
    await screen.findByText('Xu hướng theo thời gian');
    await userEvent.click(screen.getByRole('button', { name: /Lưu vào dashboard/ }));
    expect(mockSaveChart).toHaveBeenCalledWith(
      'ds-1',
      'line',
      'Xu hướng theo thời gian',
      expect.objectContaining({ series: expect.any(Array) }),
    );
  });

  it('shows "Đã lưu!" feedback after successful save', async () => {
    renderPage();
    await screen.findByText('Xu hướng theo thời gian');
    await userEvent.click(screen.getByRole('button', { name: /Lưu vào dashboard/ }));
    expect(await screen.findByRole('button', { name: /Đã lưu/ })).toBeInTheDocument();
  });

  it('navigates to /dashboard after save', async () => {
    renderPage();
    await screen.findByText('Xu hướng theo thời gian');
    await userEvent.click(screen.getByRole('button', { name: /Lưu vào dashboard/ }));
    await screen.findByRole('button', { name: /Đã lưu/ });
    // setTimeout 1200ms — waitFor với timeout 2500ms để đợi navigation thật
    await waitFor(
      () => expect(screen.getByText('dashboard page')).toBeInTheDocument(),
      { timeout: 2500 },
    );
  }, 6000);

  it('shows error message when save fails', async () => {
    mockSaveChart.mockRejectedValue(new Error('server error'));
    renderPage();
    await screen.findByText('Xu hướng theo thời gian');
    await userEvent.click(screen.getByRole('button', { name: /Lưu vào dashboard/ }));
    expect(await screen.findByText(/Lưu thất bại/)).toBeInTheDocument();
  });
});
