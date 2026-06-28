import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchColumns, fetchRows } from '../api/datasets';

interface LocationState {
  sheet?: string;
  headerRow?: number;
}

export default function LearnPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;
  const sheet = state?.sheet;
  const headerRow = state?.headerRow;

  const colsQ = useQuery({
    queryKey: ['dataset', id, 'columns', sheet, headerRow],
    queryFn: () => fetchColumns(id, { sheet, headerRow }),
    enabled: !!id,
  });
  const rowsQ = useQuery({
    queryKey: ['dataset', id, 'rows', sheet],
    queryFn: () => fetchRows(id, sheet),
    enabled: !!id,
  });

  const onBack = () =>
    navigate(`/datasets/${id}/columns`, { state: { sheet } });

  if (colsQ.isLoading || rowsQ.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (colsQ.isError || rowsQ.isError || !colsQ.data || !rowsQ.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-300">
        Không tải được dữ liệu học. Thử lại sau.
      </div>
    );
  }

  const names = colsQ.data.columns.map((c) => c.name);
  const rows = rowsQ.data.rows;

  if (names.length < 2 || rows.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-950 text-gray-300">
        <p>Dữ liệu chưa đủ để tạo thẻ học (cần ≥ 2 cột và có dòng).</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  return <FlashcardDeck names={names} rows={rows} onBack={onBack} />;
}

function FlashcardDeck({
  names,
  rows,
  onBack,
}: {
  names: string[];
  rows: Record<string, string>[];
  onBack: () => void;
}) {
  const [front, setFront] = useState(names[0]);
  const [back, setBack] = useState<string[]>([names[1]]);
  const [order, setOrder] = useState<number[]>(() => rows.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const total = rows.length;
  const card = rows[order[pos]];

  function go(delta: number) {
    setPos((p) => (p + delta + total) % total);
    setFlipped(false);
  }

  function shuffle() {
    const arr = [...order];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setOrder(arr);
    setPos(0);
    setFlipped(false);
  }

  function chooseFront(name: string) {
    setFront(name);
    setBack((b) => b.filter((x) => x !== name));
    setFlipped(false);
  }

  function toggleBack(name: string) {
    setBack((b) =>
      b.includes(name) ? b.filter((x) => x !== name) : [...b, name],
    );
    setFlipped(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm text-gray-400 hover:text-white"
        >
          ← Quay lại
        </button>
        <h1 className="text-2xl font-bold">🎴 Học bằng thẻ</h1>

        <div className="mt-4 grid gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-gray-400">Mặt trước</span>
            <select
              aria-label="Mặt trước"
              value={front}
              onChange={(e) => chooseFront(e.target.value)}
              className="mt-1 w-full rounded bg-gray-800 px-2 py-1.5 text-sm text-white"
            >
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm">
            <span className="text-gray-400">Mặt sau</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {names
                .filter((n) => n !== front)
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={back.includes(n)}
                    onClick={() => toggleBack(n)}
                    className={`rounded px-2 py-1 text-xs transition ${
                      back.includes(n)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Lật thẻ"
          onClick={() => setFlipped((f) => !f)}
          className="mt-6 flex min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-gray-700 bg-gray-900 p-6 text-center"
        >
          {!flipped ? (
            <>
              <span className="text-3xl font-bold">{card[front] || '—'}</span>
              <span className="mt-3 text-xs text-gray-500">Nhấn để lật</span>
            </>
          ) : back.length === 0 ? (
            <span className="text-gray-500">Chọn ít nhất 1 cột mặt sau</span>
          ) : (
            <div className="space-y-3">
              {back.map((n) => (
                <div key={n}>
                  <span className="text-xs text-gray-500">{n}</span>
                  <div className="text-xl">{card[n] || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </button>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Thẻ trước"
            onClick={() => go(-1)}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
          >
            ← Trước
          </button>
          <span className="text-sm text-gray-400">
            {pos + 1} / {total}
          </span>
          <button
            type="button"
            aria-label="Thẻ sau"
            onClick={() => go(1)}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
          >
            Sau →
          </button>
        </div>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={shuffle}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
          >
            🔀 Trộn thẻ
          </button>
        </div>
      </div>
    </div>
  );
}
