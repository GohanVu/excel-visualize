import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminStatsPage from './AdminStatsPage';
import client from '../../api/client';

vi.mock('../../api/client');
const mockedGet = vi.mocked(client.get);

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AdminStatsPage />
    </QueryClientProvider>,
  );
}

describe('AdminStatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner while loading', () => {
    // Return a promise that does not resolve immediately
    mockedGet.mockReturnValue(new Promise(() => {}));

    const { container } = renderPage();

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders stats correctly when API succeeds', async () => {
    mockedGet.mockResolvedValue({
      data: {
        totalUsers: 150,
        totalCharts: 450,
        totalDatasets: 300,
        proUsers: 30,
      },
    });

    renderPage();

    // Check KPIs
    expect(await screen.findByText('150')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('450')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();

    // Check conversions
    expect(screen.getByText('Tài khoản PRO (30)')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument(); // 30 / 150 * 100
    expect(screen.getByText('80.0%')).toBeInTheDocument(); // 120 / 150 * 100

    // Check system status
    expect(screen.getByText('Database (PostgreSQL)')).toBeInTheDocument();
    expect(screen.getByText('Object Storage (MinIO)')).toBeInTheDocument();
    expect(screen.getByText('Caching & Queue (Redis)')).toBeInTheDocument();
  });

  it('renders error message when API fails', async () => {
    mockedGet.mockRejectedValue(new Error('Network Error'));

    renderPage();

    expect(await screen.findByText(/Không thể tải thông tin thống kê/i)).toBeInTheDocument();
  });
});
