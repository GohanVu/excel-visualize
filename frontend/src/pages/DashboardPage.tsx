import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { fetchDatasets } from '../api/datasets';
import type { Dataset } from '../api/datasets';
import { listCharts } from '../api/charts';
import type { DashboardChart } from '../api/charts';
import ChartView from '../components/ChartView';
import client from '../api/client';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const datasetsQ = useQuery({ queryKey: ['datasets'], queryFn: fetchDatasets });
  const chartsQ = useQuery({ queryKey: ['charts'], queryFn: listCharts });

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
        <SheetsSection
          datasets={datasetsQ.data ?? []}
          loading={datasetsQ.isLoading}
          onOpen={(id) => navigate(`/datasets/${id}/columns`)}
          onAdd={() => navigate('/upload')}
        />
        {chartsQ.data && chartsQ.data.length > 0 && (
          <SavedCharts charts={chartsQ.data} />
        )}
      </main>
    </div>
  );
}

function SheetsSection({
  datasets,
  loading,
  onOpen,
  onAdd,
}: {
  datasets: Dataset[];
  loading: boolean;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold">Sheet của tôi</h2>
      <p className="mt-1 text-sm text-gray-400">
        {datasets.length} sheet đã load — chọn để mở lại
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {datasets.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onOpen(d.id)}
              className="flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-4 text-left transition hover:border-gray-600"
            >
              <span className="truncate font-medium">📄 {d.name}</span>
              <span className="mt-1 text-xs text-gray-500">
                {formatDate(d.createdAt)}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onAdd}
            aria-label="Thêm sheet"
            className="flex min-h-[88px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 text-gray-400 transition hover:border-gray-500 hover:text-white"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="mt-1 text-sm">Thêm sheet</span>
          </button>
        </div>
      )}
    </section>
  );
}

function SavedCharts({ charts }: { charts: DashboardChart[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">Biểu đồ đã lưu</h2>
      <p className="mt-1 text-sm text-gray-400">{charts.length} biểu đồ</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {charts.map((chart) => (
          <div
            key={chart.id}
            className="rounded-xl border border-gray-800 bg-gray-900 p-4"
          >
            {chart.title && <h3 className="mb-3 font-medium">{chart.title}</h3>}
            <ChartView option={chart.config} height={260} />
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
}
