import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchColumns, fetchRows } from '../api/datasets';
import type { DatasetColumn } from '../api/datasets';
import QuizMode from './QuizMode';

interface LocationState {
  sheet?: string;
  headerRow?: number;
}

type LearnModeValue = 'card' | 'quiz';

export default function LearnPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;
  const sheet = state?.sheet;
  const headerRow = state?.headerRow;
  const [mode, setMode] = useState<LearnModeValue>('card');

  const colsQ = useQuery({
    queryKey: ['dataset', id, 'columns', sheet, headerRow],
    queryFn: () => fetchColumns(id, { sheet, headerRow }),
    enabled: !!id,
  });
  const rowsQ = useQuery({
    queryKey: ['dataset', id, 'rows', sheet, headerRow],
    queryFn: () => fetchRows(id, { sheet, headerRow }),
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

  const columns = colsQ.data.columns;
  const rows = rowsQ.data.rows;

  if (columns.length < 2 || rows.length === 0) {
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
        <ModeTabs mode={mode} onChange={setMode} />
        {mode === 'card' ? (
          <FlashcardDeck columns={columns} rows={rows} />
        ) : (
          <QuizMode columns={columns} rows={rows} />
        )}
      </div>
    </div>
  );
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: LearnModeValue;
  onChange: (m: LearnModeValue) => void;
}) {
  const tab = (m: LearnModeValue, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => onChange(m)}
      className={`rounded-lg px-4 py-1.5 text-sm transition ${
        mode === m
          ? 'bg-purple-600 text-white'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-2" role="tablist" aria-label="Chế độ học">
      {tab('card', '🎴 Thẻ')}
      {tab('quiz', '📝 Quiz')}
    </div>
  );
}

function FlashcardDeck({
  columns,
  rows,
}: {
  columns: DatasetColumn[];
  rows: Record<string, string>[];
}) {
  const names = columns.map((c) => c.name);
  // Default thông minh: mặt trước/sau ưu tiên cột chữ (string/category), không phải số
  const textNames = columns
    .filter((c) => c.type === 'string' || c.type === 'category')
    .map((c) => c.name);
  const defaultFront = textNames[0] ?? names[0];
  const defaultBack =
    textNames.find((n) => n !== defaultFront) ??
    names.find((n) => n !== defaultFront) ??
    names[0];

  const [front, setFront] = useState(defaultFront);
  const [back, setBack] = useState<string[]>([defaultBack]);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // index dòng đã thuộc (theo index gốc của rows — giữ qua shuffle/đổi front)
  const [known, setKnown] = useState<Set<number>>(new Set());

  // Bỏ qua thẻ rỗng mặt trước (dòng nhóm/trống không có gì để học)
  const deck = useMemo(
    () =>
      rows
        .map((_, i) => i)
        .filter((i) => (rows[i][front] ?? '').toString().trim() !== ''),
    [rows, front],
  );

  const [order, setOrder] = useState<number[]>(deck);
  // Đổi front → deck đổi → reset thứ tự + vị trí (known giữ nguyên)
  useEffect(() => {
    setOrder(deck);
    setPos(0);
    setFlipped(false);
  }, [deck]);

  const total = order.length;
  const card = total > 0 ? rows[order[pos]] : null;
  const knownCount = deck.filter((i) => known.has(i)).length;
  const isKnown = card != null && known.has(order[pos]);

  function go(delta: number) {
    if (total === 0) return;
    setPos((p) => (p + delta + total) % total);
    setFlipped(false);
  }

  function mark(isKnownNow: boolean) {
    if (total === 0) return;
    const idx = order[pos];
    setKnown((prev) => {
      const next = new Set(prev);
      isKnownNow ? next.add(idx) : next.delete(idx);
      return next;
    });
    go(1);
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
  }

  function toggleBack(name: string) {
    setBack((b) =>
      b.includes(name) ? b.filter((x) => x !== name) : [...b, name],
    );
    setFlipped(false);
  }

  return (
    <>
      <div className="mt-4 flex items-center justify-end">
        <span className="text-sm text-gray-400">
          Đã thuộc{' '}
          <strong data-testid="known-count" className="text-green-400">
            {knownCount}
          </strong>{' '}
          / {total}
        </span>
      </div>

      <div className="mt-2 grid gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:grid-cols-2">
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
          className={`mt-6 flex min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border bg-gray-900 p-6 text-center ${
            isKnown ? 'border-green-600/50' : 'border-gray-700'
          }`}
        >
          {card == null ? (
            <span className="text-gray-500">
              Cột mặt trước không có dữ liệu — chọn cột khác
            </span>
          ) : !flipped ? (
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

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => mark(false)}
            className="flex-1 rounded-lg bg-gray-800 py-2.5 text-sm hover:bg-gray-700"
          >
            ↻ Chưa thuộc
          </button>
          <button
            type="button"
            onClick={() => mark(true)}
            className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-medium hover:bg-green-500"
          >
            ✓ Đã thuộc
          </button>
        </div>

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
            {total === 0 ? '0 / 0' : `${pos + 1} / ${total}`}
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
    </>
  );
}
