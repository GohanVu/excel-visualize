import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ChartDetailPage from './ChartDetailPage';

vi.mock('../api/datasets', () => ({
  fetchRows: vi.fn(),
}));

vi.mock('../api/charts', () => ({
  saveChart: vi.fn(),
}));

vi.mock('../components/ChartView', async () => {
  const { forwardRef } = await import('react');
  return {
    // forwardRef mock — tránh warning "Function components cannot be given refs"
    default: forwardRef(({ option }: { option: unknown }, _ref: unknown) => (
      <div data-testid="chart-view" data-option={JSON.stringify(option)} />
    )),
  };
});

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

// Gợi ý đã gộp (category + number) — có switcher phép gộp
const aggSuggestion = {
  type: 'bar' as const,
  title: 'So sánh giữa các nhóm',
  description: 'Tổng Doanh thu theo từng Khu vực',
  encoding: { x: 'Khu vực', y: ['Doanh thu'] },
  aggregation: 'sum' as const,
};
const meatRows = [
  { 'Khu vực': 'Bắc', 'Doanh thu': '100' },
  { 'Khu vực': 'Bắc', 'Doanh thu': '200' },
  { 'Khu vực': 'Nam', 'Doanh thu': '300' },
];

function readOption() {
  return JSON.parse(
    screen.getByTestId('chart-view').getAttribute('data-option') ?? '{}',
  );
}

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
      expect.objectContaining({
        version: 2,
        definition: expect.objectContaining({ chartType: 'line' }),
        option: expect.objectContaining({ series: expect.any(Array) }),
      }),
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

  it('does NOT show aggregation switcher for a time-series chart', async () => {
    renderPage();
    await screen.findByText('Xu hướng theo thời gian');
    expect(
      screen.queryByRole('group', { name: 'Phép gộp' }),
    ).not.toBeInTheDocument();
  });

  it('shows switcher for category+number and re-renders on change', async () => {
    mockFetchRows.mockResolvedValue({ datasetId: 'ds-1', rows: meatRows });
    renderPage({ suggestion: aggSuggestion, selectedColumns });
    await screen.findByText('So sánh giữa các nhóm');
    expect(screen.getByRole('group', { name: 'Phép gộp' })).toBeInTheDocument();
    expect(readOption().series[0].data).toEqual([300, 300]); // sum mặc định
    await userEvent.click(screen.getByRole('button', { name: 'Trung bình' }));
    expect(readOption().series[0].data).toEqual([150, 300]); // average
  });

  it('saves the chart with the switched aggregation', async () => {
    mockFetchRows.mockResolvedValue({ datasetId: 'ds-1', rows: meatRows });
    renderPage({ suggestion: aggSuggestion, selectedColumns });
    await screen.findByText('So sánh giữa các nhóm');
    await userEvent.click(screen.getByRole('button', { name: 'Trung bình' }));
    await userEvent.click(screen.getByRole('button', { name: /Lưu vào dashboard/ }));
    expect(mockSaveChart).toHaveBeenCalledWith(
      'ds-1',
      'bar',
      'So sánh giữa các nhóm',
      expect.objectContaining({
        version: 2,
        definition: expect.objectContaining({ aggregation: 'average' }),
        option: expect.objectContaining({
          series: [expect.objectContaining({ data: [150, 300] })],
        }),
      }),
    );
  });

  it('toggle "% tổng" đổi bar sang phần trăm', async () => {
    mockFetchRows.mockResolvedValue({ datasetId: 'ds-1', rows: meatRows });
    renderPage({ suggestion: aggSuggestion, selectedColumns });
    await screen.findByText('So sánh giữa các nhóm');
    expect(readOption().series[0].data).toEqual([300, 300]);
    await userEvent.click(screen.getByLabelText(/Hiển thị % tổng/));
    expect(readOption().series[0].data).toEqual([50, 50]); // 300/600
  });

  it('KHÔNG hiện toggle % cho chart không phải bar', async () => {
    renderPage(); // line
    await screen.findByText('Xu hướng theo thời gian');
    expect(
      screen.queryByLabelText(/Hiển thị % tổng/),
    ).not.toBeInTheDocument();
  });

  it('shows error message when save fails', async () => {
    mockSaveChart.mockRejectedValue(new Error('server error'));
    renderPage();
    await screen.findByText('Xu hướng theo thời gian');
    await userEvent.click(screen.getByRole('button', { name: /Lưu vào dashboard/ }));
    expect(await screen.findByText(/Lưu thất bại/)).toBeInTheDocument();
  });

  it('surfaces the backend nudge when the free-tier chart limit is hit', async () => {
    // BadRequestException từ backend khi đầy quota Free tier (axios shape)
    mockSaveChart.mockRejectedValue({
      response: {
        data: {
          message:
            'Gói Free chỉ cho tối đa 3 biểu đồ/dashboard. Nâng cấp Pro để thêm biểu đồ không giới hạn.',
        },
      },
    });
    renderPage();
    await screen.findByText('Xu hướng theo thời gian');
    await userEvent.click(screen.getByRole('button', { name: /Lưu vào dashboard/ }));
    expect(await screen.findByText(/Nâng cấp Pro/)).toBeInTheDocument();
  });
});
