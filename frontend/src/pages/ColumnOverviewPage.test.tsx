import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ColumnOverviewPage from './ColumnOverviewPage';
import * as datasetsApi from '../api/datasets';

vi.mock('../api/datasets');
const mockedFetch = vi.mocked(datasetsApi.fetchColumns);

const overview: datasetsApi.DatasetOverview = {
  datasetId: 'ds-1',
  name: 'Báo cáo doanh thu',
  totalRows: 120,
  columns: [
    { name: 'Ngày', index: 0, type: 'date', sampleValues: ['2024-01-01', '2024-01-02'] },
    { name: 'Khu vực', index: 1, type: 'category', sampleValues: ['HN', 'HCM'] },
    { name: 'Doanh thu', index: 2, type: 'number', sampleValues: ['100', '200'] },
  ],
  previewRows: [
    { Ngày: '2024-01-01', 'Khu vực': 'HN', 'Doanh thu': '100' },
    { Ngày: '2024-01-02', 'Khu vực': 'HCM', 'Doanh thu': '200' },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/datasets/ds-1/columns']}>
        <Routes>
          <Route path="/datasets/:id/columns" element={<ColumnOverviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ColumnOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockResolvedValue(overview);
  });

  it('renders dataset name and row count', async () => {
    renderPage();
    expect(await screen.findByText('Báo cáo doanh thu')).toBeInTheDocument();
    expect(screen.getByText(/120 dòng/)).toBeInTheDocument();
  });

  it('renders the three column groups', async () => {
    renderPage();
    expect(await screen.findByText('Thời gian')).toBeInTheDocument();
    expect(screen.getByText('Số liệu')).toBeInTheDocument();
    expect(screen.getByText('Phân loại')).toBeInTheDocument();
  });

  it('auto pre-selects first date + first number column', async () => {
    renderPage();
    // findByRole waits for the element, but useEffect fires after render →
    // waitFor is needed to wait for the second re-render that applies the selection
    const ngay = await screen.findByRole('button', { name: /Ngày/ });
    const doanhThu = screen.getByRole('button', { name: /Doanh thu/ });
    const khuVuc = screen.getByRole('button', { name: /Khu vực/ });
    await waitFor(() => {
      expect(ngay).toHaveAttribute('aria-pressed', 'true');
      expect(doanhThu).toHaveAttribute('aria-pressed', 'true');
      expect(khuVuc).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('toggles selection on click', async () => {
    renderPage();
    const khuVuc = await screen.findByRole('button', { name: /Khu vực/ });
    expect(khuVuc).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(khuVuc);
    await waitFor(() => expect(khuVuc).toHaveAttribute('aria-pressed', 'true'));
  });

  it('renders preview table with first 3 rows', async () => {
    renderPage();
    await screen.findByText('Xem trước 3 dòng đầu');
    expect(screen.getAllByText('2024-01-01').length).toBeGreaterThan(0);
  });

  it('shows loading spinner initially', () => {
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
