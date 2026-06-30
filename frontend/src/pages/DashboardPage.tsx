import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import RGL, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useAuth } from '../hooks/useAuth';
import { fetchDatasets, deleteDataset } from '../api/datasets';
import type { Dataset } from '../api/datasets';
import { listCharts, updateLayout, deleteChart, updateChart } from '../api/charts';
import type { DashboardChart } from '../api/charts';
import {
  chartsToLayout,
  layoutToPayload,
  GRID,
  type GridItem,
} from '../lib/chartLayout';
import ChartView from '../components/ChartView';
import ChartStylePanel from '../components/ChartStylePanel';
import AddChartMenu from '../components/AddChartMenu';
import client from '../api/client';

const GridLayout = WidthProvider(RGL);

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const queryClient = useQueryClient();
  const datasetsQ = useQuery({ queryKey: ['datasets'], queryFn: fetchDatasets });
  const chartsQ = useQuery({ queryKey: ['charts'], queryFn: listCharts });

  const deleteMut = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['datasets'] }),
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
        <SheetsSection
          datasets={datasetsQ.data ?? []}
          loading={datasetsQ.isLoading}
          onOpen={(id) => navigate(`/datasets/${id}/columns`)}
          onAdd={() => navigate('/upload')}
          onDelete={(id) => deleteMut.mutate(id)}
        />
        {chartsQ.data && chartsQ.data.length > 0 && (
          <SavedCharts
            charts={chartsQ.data}
            datasets={datasetsQ.data ?? []}
            onPick={(dsId) => navigate(`/datasets/${dsId}/columns`)}
            onUpload={() => navigate('/upload')}
          />
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
  onDelete,
}: {
  datasets: Dataset[];
  loading: boolean;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
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
            <SheetCard
              key={d.id}
              dataset={d}
              onOpen={onOpen}
              onDelete={onDelete}
            />
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

function SheetCard({
  dataset,
  onOpen,
  onDelete,
}: {
  dataset: Dataset;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="relative flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-4">
      <button
        type="button"
        onClick={() => onOpen(dataset.id)}
        className="flex flex-col text-left transition hover:opacity-80"
      >
        <span className="truncate pr-6 font-medium">📄 {dataset.name}</span>
        <span className="mt-1 text-xs text-gray-500">
          {formatDate(dataset.createdAt)}
        </span>
      </button>

      {confirming ? (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-gray-400">Xoá sheet này?</span>
          <button
            type="button"
            onClick={() => onDelete(dataset.id)}
            className="rounded bg-red-600 px-2 py-1 hover:bg-red-500"
          >
            Xoá
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded bg-gray-700 px-2 py-1 hover:bg-gray-600"
          >
            Huỷ
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label={`Xoá ${dataset.name}`}
          onClick={() => setConfirming(true)}
          className="absolute right-2 top-2 rounded p-1 text-gray-500 transition hover:bg-gray-800 hover:text-red-400"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function SavedCharts({
  charts,
  datasets,
  onPick,
  onUpload,
}: {
  charts: DashboardChart[];
  datasets: Dataset[];
  onPick: (datasetId: string) => void;
  onUpload: () => void;
}) {
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<GridItem[]>(() => chartsToLayout(charts));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const saveMut = useMutation({ mutationFn: updateLayout });
  const persist = (next: GridItem[]) =>
    saveMut.mutate(layoutToPayload(next));
  const deleteMut = useMutation({
    mutationFn: deleteChart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charts'] });
      setConfirmId(null);
    },
  });
  const editMut = useMutation({
    mutationFn: (v: {
      id: string;
      patch: { title: string; config: Record<string, unknown> };
    }) => updateChart(v.id, v.patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charts'] });
      setEditId(null);
    },
  });
  const editing = charts.find((c) => c.id === editId) ?? null;
  // chặn react-grid-layout bắt đầu kéo khi bấm nút trong thanh tiêu đề
  const stopDrag = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <section className="mt-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Biểu đồ đã lưu</h2>
          <p className="mt-1 text-sm text-gray-400">
            {charts.length} biểu đồ — kéo tiêu đề để di chuyển, kéo góc để chỉnh kích thước
          </p>
        </div>
        <AddChartMenu datasets={datasets} onPick={onPick} onUpload={onUpload} />
      </div>
      <GridLayout
        className="mt-5"
        layout={layout}
        cols={GRID.COLS}
        rowHeight={GRID.ROW_HEIGHT}
        margin={[16, 16]}
        draggableHandle=".chart-drag"
        onLayoutChange={(l) => setLayout(l as GridItem[])}
        onDragStop={(l) => persist(l as GridItem[])}
        onResizeStop={(l) => persist(l as GridItem[])}
      >
        {charts.map((chart) => {
          const item = layout.find((l) => l.i === chart.id);
          const h = (item?.h ?? GRID.DEFAULT_H) * GRID.ROW_HEIGHT - 44;
          return (
            <div
              key={chart.id}
              className="flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
            >
              <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2 text-sm font-medium">
                <div className="chart-drag flex min-w-0 flex-1 cursor-move items-center gap-2">
                  <span className="text-gray-500">⠿</span>
                  <span className="truncate">{chart.title ?? 'Biểu đồ'}</span>
                </div>
                {confirmId === chart.id ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs">
                    <button
                      type="button"
                      onMouseDown={stopDrag}
                      onClick={() => deleteMut.mutate(chart.id)}
                      className="rounded bg-red-600 px-2 py-0.5 hover:bg-red-500"
                    >
                      Xoá
                    </button>
                    <button
                      type="button"
                      onMouseDown={stopDrag}
                      onClick={() => setConfirmId(null)}
                      className="rounded bg-gray-700 px-2 py-0.5 hover:bg-gray-600"
                    >
                      Huỷ
                    </button>
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Tuỳ chỉnh ${chart.title ?? 'biểu đồ'}`}
                      onMouseDown={stopDrag}
                      onClick={() => setEditId(chart.id)}
                      className="rounded p-1 text-gray-500 transition hover:bg-gray-800 hover:text-white"
                    >
                      ⚙
                    </button>
                    <button
                      type="button"
                      aria-label={`Xoá ${chart.title ?? 'biểu đồ'}`}
                      onMouseDown={stopDrag}
                      onClick={() => setConfirmId(chart.id)}
                      className="rounded p-1 text-gray-500 transition hover:bg-gray-800 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
              <div className="min-h-0 flex-1 p-2">
                <ChartView
                  key={`${chart.id}-${item?.w ?? GRID.DEFAULT_W}-${item?.h ?? GRID.DEFAULT_H}`}
                  option={chart.config}
                  height={h}
                />
              </div>
            </div>
          );
        })}
      </GridLayout>

      {editing && (
        <ChartStylePanel
          chart={editing}
          saving={editMut.isPending}
          onClose={() => setEditId(null)}
          onSave={(patch) => editMut.mutate({ id: editing.id, patch })}
        />
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
}
