import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LearnPage from './LearnPage';

vi.mock('../api/datasets', () => ({
  fetchColumns: vi.fn(),
  fetchRows: vi.fn(),
}));

import { fetchColumns, fetchRows } from '../api/datasets';

const mockCols = fetchColumns as ReturnType<typeof vi.fn>;
const mockRows = fetchRows as ReturnType<typeof vi.fn>;

const columns = [
  { name: 'Chữ Hán', index: 0, type: 'string', confidence: 1, sampleValues: [] },
  { name: 'Bính âm', index: 1, type: 'string', confidence: 1, sampleValues: [] },
  { name: 'Nghĩa', index: 2, type: 'string', confidence: 1, sampleValues: [] },
];

const rows = [
  { 'Chữ Hán': '八', 'Bính âm': 'bā', Nghĩa: 'tám' },
  { 'Chữ Hán': '好', 'Bính âm': 'hǎo', Nghĩa: 'tốt' },
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/datasets/ds-1/learn', state: {} }]}>
        <Routes>
          <Route path="/datasets/:id/learn" element={<LearnPage />} />
          <Route path="/datasets/:id/columns" element={<div>Trang cột</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LearnPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCols.mockResolvedValue({ datasetId: 'ds-1', columns });
    mockRows.mockResolvedValue({ datasetId: 'ds-1', rows });
  });

  it('shows the front of the first card by default', async () => {
    renderPage();
    expect(await screen.findByText('八')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('flips to reveal the back (default 2nd column)', async () => {
    renderPage();
    fireEvent.click(await screen.findByLabelText('Lật thẻ'));
    expect(screen.getByText('bā')).toBeInTheDocument();
  });

  it('advances to the next card', async () => {
    renderPage();
    await screen.findByText('八');
    fireEvent.click(screen.getByLabelText('Thẻ sau'));
    expect(screen.getByText('好')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('changing the front column updates the card', async () => {
    renderPage();
    await screen.findByText('八');
    fireEvent.change(screen.getByLabelText('Mặt trước'), {
      target: { value: 'Nghĩa' },
    });
    expect(screen.getByText('tám')).toBeInTheDocument();
  });

  it('can add a back column and show it when flipped', async () => {
    renderPage();
    await screen.findByText('八');
    // thêm "Nghĩa" vào mặt sau
    fireEvent.click(screen.getByRole('button', { name: 'Nghĩa' }));
    fireEvent.click(screen.getByLabelText('Lật thẻ'));
    expect(screen.getByText('bā')).toBeInTheDocument();
    expect(screen.getByText('tám')).toBeInTheDocument();
  });

  it('shows a shuffle control', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /Trộn thẻ/ })).toBeInTheDocument();
  });

  it('marks a card as known: progress increments and advances', async () => {
    renderPage();
    await screen.findByText('八');
    expect(screen.getByTestId('known-count')).toHaveTextContent('0');
    fireEvent.click(screen.getByRole('button', { name: /Đã thuộc/ }));
    expect(screen.getByText('好')).toBeInTheDocument(); // đã sang thẻ 2
    expect(screen.getByTestId('known-count')).toHaveTextContent('1');
  });

  it('"Chưa thuộc" advances without incrementing progress', async () => {
    renderPage();
    await screen.findByText('八');
    fireEvent.click(screen.getByRole('button', { name: /Chưa thuộc/ }));
    expect(screen.getByText('好')).toBeInTheDocument();
    expect(screen.getByTestId('known-count')).toHaveTextContent('0');
  });

  it('skips cards whose front value is empty (section/blank rows)', async () => {
    mockRows.mockResolvedValue({
      datasetId: 'ds-1',
      rows: [
        { 'Chữ Hán': '八', 'Bính âm': 'bā', Nghĩa: 'tám' },
        { 'Chữ Hán': '', 'Bính âm': '', Nghĩa: 'nhóm' }, // dòng trống mặt trước
        { 'Chữ Hán': '好', 'Bính âm': 'hǎo', Nghĩa: 'tốt' },
      ],
    });
    renderPage();
    expect(await screen.findByText('八')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument(); // 3 dòng → 2 thẻ hợp lệ
  });

  it('switches to quiz mode and shows multiple-choice options', async () => {
    renderPage();
    await screen.findByText('八');
    fireEvent.click(screen.getByRole('tab', { name: /Quiz/ }));
    // câu hỏi 八 (Chữ Hán→Bính âm), đáp án đúng "bā" + nhiễu "hǎo"
    expect(screen.getByRole('button', { name: 'bā' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'hǎo' })).toBeInTheDocument();
  });

  it('scores a correct quiz answer', async () => {
    renderPage();
    await screen.findByText('八');
    fireEvent.click(screen.getByRole('tab', { name: /Quiz/ }));
    fireEvent.click(screen.getByRole('button', { name: 'bā' })); // đúng cho 八
    expect(screen.getByTestId('quiz-score')).toHaveTextContent('1');
  });

  it('a wrong quiz answer does not increase the score', async () => {
    renderPage();
    await screen.findByText('八');
    fireEvent.click(screen.getByRole('tab', { name: /Quiz/ }));
    fireEvent.click(screen.getByRole('button', { name: 'hǎo' })); // sai cho 八
    expect(screen.getByTestId('quiz-score')).toHaveTextContent('0');
  });

  it('shows a fallback when data is insufficient', async () => {
    mockCols.mockResolvedValue({ datasetId: 'ds-1', columns: [columns[0]] });
    mockRows.mockResolvedValue({ datasetId: 'ds-1', rows: [] });
    renderPage();
    expect(await screen.findByText(/chưa đủ để tạo thẻ/i)).toBeInTheDocument();
  });
});
