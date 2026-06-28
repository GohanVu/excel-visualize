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
  sheets: ['Sheet1'],
  activeSheet: 'Sheet1',
  headerRowIndex: 0,
  headerConfident: true,
  columns: [
    { name: 'Ngày', index: 0, type: 'date', confidence: 1, sampleValues: ['2024-01-01', '2024-01-02'] },
    { name: 'Khu vực', index: 1, type: 'category', confidence: 0.9, sampleValues: ['HN', 'HCM'] },
    { name: 'Doanh thu', index: 2, type: 'number', confidence: 1, sampleValues: ['100', '200'] },
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

  describe('multi-sheet tabs', () => {
    const multi = { ...overview, sheets: ['HSK 1', '214 bộ thủ'], activeSheet: 'HSK 1' };

    it('shows sheet tabs when the file has multiple sheets', async () => {
      mockedFetch.mockResolvedValue(multi);
      renderPage();
      expect(await screen.findByRole('tab', { name: 'HSK 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '214 bộ thủ' })).toBeInTheDocument();
    });

    it('does not show tabs for a single-sheet file', async () => {
      renderPage();
      await screen.findByText('Báo cáo doanh thu');
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('refetches with the chosen sheet when a tab is clicked', async () => {
      mockedFetch.mockResolvedValue(multi);
      renderPage();
      fireEvent.click(await screen.findByRole('tab', { name: '214 bộ thủ' }));
      await waitFor(() =>
        expect(mockedFetch).toHaveBeenCalledWith('ds-1', {
          sheet: '214 bộ thủ',
          headerRow: undefined,
        }),
      );
    });
  });

  describe('column type correction (confidence-gated)', () => {
    const lowConf = {
      ...overview,
      columns: [
        { name: 'Cột mơ hồ', index: 0, type: 'string' as const, confidence: 0.4, sampleValues: ['a', 'b'] },
        { name: 'Doanh thu', index: 1, type: 'number' as const, confidence: 1, sampleValues: ['1', '2'] },
      ],
      previewRows: [{ 'Cột mơ hồ': 'a', 'Doanh thu': '1' }],
    };

    it('shows a type selector only for low-confidence columns', async () => {
      mockedFetch.mockResolvedValue(lowConf);
      renderPage();
      expect(await screen.findByLabelText('Kiểu cột Cột mơ hồ')).toBeInTheDocument();
      expect(screen.queryByLabelText('Kiểu cột Doanh thu')).not.toBeInTheDocument();
    });

    it('hides the type-review panel when all columns are confident', async () => {
      renderPage();
      await screen.findByText('Báo cáo doanh thu');
      expect(screen.queryByText('Xác nhận kiểu cột')).not.toBeInTheDocument();
    });

    it('changing a column type takes effect (override applied)', async () => {
      mockedFetch.mockResolvedValue(lowConf);
      renderPage();
      const select = (await screen.findByLabelText(
        'Kiểu cột Cột mơ hồ',
      )) as HTMLSelectElement;
      expect(select.value).toBe('string');
      fireEvent.change(select, { target: { value: 'number' } });
      await waitFor(() => expect(select.value).toBe('number'));
    });
  });

  describe('header correction (confidence-gated)', () => {
    it('hides the header control when detection is confident', async () => {
      renderPage();
      await screen.findByText('Báo cáo doanh thu');
      expect(screen.queryByLabelText('Dòng tiêu đề xuống')).not.toBeInTheDocument();
    });

    it('shows the header control when detection is not confident', async () => {
      mockedFetch.mockResolvedValue({ ...overview, headerConfident: false, headerRowIndex: 1 });
      renderPage();
      expect(await screen.findByLabelText('Dòng tiêu đề xuống')).toBeInTheDocument();
      expect(screen.getByText(/đang đọc từ/i)).toBeInTheDocument();
    });

    it('refetches with a new headerRow when nudging the header down', async () => {
      mockedFetch.mockResolvedValue({ ...overview, headerConfident: false, headerRowIndex: 1 });
      renderPage();
      fireEvent.click(await screen.findByLabelText('Dòng tiêu đề xuống'));
      await waitFor(() =>
        expect(mockedFetch).toHaveBeenCalledWith('ds-1', {
          sheet: undefined,
          headerRow: 2,
        }),
      );
    });
  });
});
