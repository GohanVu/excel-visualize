import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { listCharts } from '../api/charts';
import type { DashboardChart } from '../api/charts';
import ChartView from '../components/ChartView';
import client from '../api/client';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: charts, isLoading } = useQuery({
    queryKey: ['charts'],
    queryFn: listCharts,
  });

  async function handleLogout() {
    try {
      await client.post('/auth/logout');
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h1 className="text-lg font-bold">ChartLy</h1>
        <div className="flex items-center gap-4">
          {user?.name && (
            <span className="text-sm text-gray-400">{user.name}</span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-400 transition hover:text-white"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        ) : charts && charts.length > 0 ? (
          <ChartGrid charts={charts} onUpload={() => navigate('/upload')} />
        ) : (
          <EmptyState onUpload={() => navigate('/upload')} />
        )}
      </main>
    </div>
  );
}

function ChartGrid({
  charts,
  onUpload,
}: {
  charts: DashboardChart[];
  onUpload: () => void;
}) {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Biểu đồ của bạn</h2>
          <p className="mt-1 text-sm text-gray-400">
            {charts.length} biểu đồ đã lưu
          </p>
        </div>
        <button
          type="button"
          onClick={onUpload}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium transition hover:bg-blue-500"
        >
          + Thêm biểu đồ
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {charts.map((chart) => (
          <div
            key={chart.id}
            className="rounded-xl border border-gray-800 bg-gray-900 p-4"
          >
            {chart.title && (
              <h3 className="mb-3 font-medium">{chart.title}</h3>
            )}
            <ChartView option={chart.config} height={260} />
          </div>
        ))}
      </div>
    </>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <h2 className="text-2xl font-bold">Chào mừng đến ChartLy 👋</h2>
      <p className="mt-2 text-gray-400">
        Upload file Excel hoặc CSV để biến dữ liệu thành biểu đồ chỉ trong vài
        bước.
      </p>
      <button
        type="button"
        onClick={onUpload}
        className="mt-8 rounded-lg bg-blue-600 px-8 py-3 font-medium transition hover:bg-blue-500"
      >
        Upload dữ liệu
      </button>
    </div>
  );
}
