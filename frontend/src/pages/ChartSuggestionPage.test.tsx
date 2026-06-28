import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ChartSuggestionPage from './ChartSuggestionPage';
import * as datasetsApi from '../api/datasets';

// ECharts cần canvas — mock ChartView để test logic trang
vi.mock('../components/ChartView', () => ({
  default: () => <div data-testid="chart-view" />,
}));
vi.mock('../api/datasets');

const mockedSuggest = vi.mocked(datasetsApi.suggestCharts);
const mockedColumns = vi.mocked(datasetsApi.fetchColumns);

const overview = {
  datasetId: 'ds-1',
  name: 'Báo cáo',
  totalRows: 2,
  sheets: ['Sheet1'],
  activeSheet: 'Sheet1',
  headerRowIndex: 0,
  headerConfident: true,
  columns: [],
  previewRows: [{ Ngày: '2024-01-01', 'Doanh thu': '100' }],
};

const suggestResponse: datasetsApi.SuggestResponse = {
  datasetId: 'ds-1',
  suggestions: [
    { type: 'line', title: 'Xu hướng theo thời gian', description: 'mô tả 1', encoding: { x: 'Ngày', y: ['Doanh thu'] } },
    { type: 'bar', title: 'So sánh theo thời gian', description: 'mô tả 2', encoding: { x: 'Ngày', y: ['Doanh thu'] } },
  ],
};

function renderAt(state: unknown) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/datasets/ds-1/charts', state }]}>
        <Routes>
          <Route path="/datasets/:id/charts" element={<ChartSuggestionPage />} />
          <Route path="/datasets/:id/columns" element={<div>Trang chọn cột</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChartSuggestionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedColumns.mockResolvedValue(overview);
    mockedSuggest.mockResolvedValue(suggestResponse);
  });

  it('redirects to columns page when no selectedColumns in state', () => {
    renderAt(null);
    expect(screen.getByText('Trang chọn cột')).toBeInTheDocument();
  });

  it('renders a card per suggestion with title + description', async () => {
    renderAt({ selectedColumns: [0, 1] });
    expect(await screen.findByText('Xu hướng theo thời gian')).toBeInTheDocument();
    expect(screen.getByText('So sánh theo thời gian')).toBeInTheDocument();
    expect(screen.getByText('mô tả 1')).toBeInTheDocument();
  });

  it('renders a chart thumbnail per suggestion', async () => {
    renderAt({ selectedColumns: [0, 1] });
    await screen.findByText('Xu hướng theo thời gian');
    expect(screen.getAllByTestId('chart-view')).toHaveLength(2);
  });

  it('calls suggestCharts with the selected columns', async () => {
    renderAt({ selectedColumns: [0, 1] });
    await screen.findByText('Xu hướng theo thời gian');
    expect(mockedSuggest).toHaveBeenCalledWith('ds-1', [0, 1]);
  });

  it('shows empty message when no suggestions', async () => {
    mockedSuggest.mockResolvedValue({ datasetId: 'ds-1', suggestions: [] });
    renderAt({ selectedColumns: [0] });
    expect(await screen.findByText(/Chưa có gợi ý phù hợp/)).toBeInTheDocument();
  });
});
