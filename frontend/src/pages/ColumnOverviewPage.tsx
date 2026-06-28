import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchColumns } from '../api/datasets';
import type { DatasetColumn, ColumnType } from '../api/datasets';
import { groupColumns, autoSelectColumns } from '../lib/columnGrouping';

const GROUP_META = [
  { key: 'date', label: 'Thời gian', icon: '📅', hint: 'Ngày, tháng, năm' },
  { key: 'number', label: 'Số liệu', icon: '🔢', hint: 'Giá trị đo được' },
  { key: 'label', label: 'Phân loại', icon: '🏷️', hint: 'Nhãn, danh mục' },
] as const;

// Dưới ngưỡng này → cột "chưa chắc kiểu" → hiện ô cho user xác nhận
const LOW_CONFIDENCE = 0.8;

const TYPE_OPTIONS: { value: ColumnType; label: string }[] = [
  { value: 'date', label: 'Thời gian' },
  { value: 'number', label: 'Số liệu' },
  { value: 'category', label: 'Phân loại' },
  { value: 'string', label: 'Văn bản' },
];

export default function ColumnOverviewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Tab đang chọn + dòng header user ép (override). undefined = để backend tự quyết.
  const [sheet, setSheet] = useState<string | undefined>(undefined);
  const [headerRow, setHeaderRow] = useState<number | undefined>(undefined);
  // Kiểu cột user sửa tay (index → kiểu)
  const [typeOverrides, setTypeOverrides] = useState<Map<number, ColumnType>>(
    new Map(),
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dataset', id, 'columns', sheet, headerRow],
    queryFn: () => fetchColumns(id, { sheet, headerRow }),
    enabled: !!id,
  });

  // Auto pre-select khi data về lần đầu
  useEffect(() => {
    if (data) setSelected(new Set(autoSelectColumns(data.columns)));
  }, [data]);

  // Cột với kiểu đã áp override của user
  const effectiveColumns = useMemo(
    () =>
      (data?.columns ?? []).map((c) => ({
        ...c,
        type: typeOverrides.get(c.index) ?? c.type,
      })),
    [data, typeOverrides],
  );

  const groups = useMemo(
    () => groupColumns(effectiveColumns),
    [effectiveColumns],
  );

  const uncertain = useMemo(
    () => effectiveColumns.filter((c) => c.confidence < LOW_CONFIDENCE),
    [effectiveColumns],
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-300">
        Không tải được dữ liệu cột. Thử lại sau.
      </div>
    );
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  function changeSheet(name: string) {
    setSheet(name);
    setHeaderRow(undefined); // tab khác → bỏ override header cũ
    setTypeOverrides(new Map()); // cột khác tab → override kiểu cũ vô nghĩa
  }

  function changeHeaderRow(n: number) {
    setHeaderRow(n);
    setTypeOverrides(new Map()); // header đổi → cột đổi → bỏ override kiểu
  }

  function setType(index: number, type: ColumnType) {
    setTypeOverrides((prev) => new Map(prev).set(index, type));
  }

  // Confidence-gated: chỉ hiện control sửa header khi auto không chắc,
  // hoặc khi user đã từng chỉnh (để còn chỉnh tiếp).
  const showHeaderControl = !data.headerConfident || headerRow != null;

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">{data.name}</h1>
        <p className="mt-1 text-sm text-gray-400">
          {data.totalRows} dòng · {data.columns.length} cột · chọn cột để tạo
          biểu đồ
        </p>

        {data.sheets.length > 1 && (
          <SheetTabs
            sheets={data.sheets}
            active={data.activeSheet}
            onChange={changeSheet}
          />
        )}

        {showHeaderControl && (
          <HeaderControl
            rowIndex={data.headerRowIndex}
            confident={data.headerConfident}
            onChange={changeHeaderRow}
          />
        )}

        {uncertain.length > 0 && (
          <TypeReview columns={uncertain} onChange={setType} />
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {GROUP_META.map((meta) => (
            <ColumnGroup
              key={meta.key}
              icon={meta.icon}
              label={meta.label}
              hint={meta.hint}
              columns={groups[meta.key]}
              selected={selected}
              onToggle={toggle}
            />
          ))}
        </div>

        <PreviewTable
          columns={data.columns}
          rows={data.previewRows.slice(0, 3)}
        />

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() =>
              navigate(`/datasets/${id}/charts`, {
                state: {
                  selectedColumns: [...selected],
                  sheet: data.activeSheet,
                  headerRow,
                  typeOverrides: [...typeOverrides].map(([index, type]) => ({
                    index,
                    type,
                  })),
                },
              })
            }
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium transition hover:bg-blue-500 disabled:opacity-40"
          >
            Tiếp tục ({selected.size} cột)
          </button>
        </div>
      </div>
    </div>
  );
}

function SheetTabs({
  sheets,
  active,
  onChange,
}: {
  sheets: string[];
  active: string;
  onChange: (name: string) => void;
}) {
  return (
    <div
      className="mt-4 flex flex-wrap gap-2"
      role="tablist"
      aria-label="Chọn trang tính"
    >
      {sheets.map((name) => (
        <button
          key={name}
          type="button"
          role="tab"
          aria-selected={name === active}
          onClick={() => onChange(name)}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            name === active
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function HeaderControl({
  rowIndex,
  confident,
  onChange,
}: {
  rowIndex: number;
  confident: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div
      className={`mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
        confident
          ? 'border-gray-800 bg-gray-900 text-gray-400'
          : 'border-amber-600/50 bg-amber-500/10 text-amber-200'
      }`}
    >
      <span>
        {confident
          ? 'Đang đọc tiêu đề từ '
          : '⚠️ Tiêu đề có thể chưa đúng — đang đọc từ '}
        dòng <strong>{rowIndex + 1}</strong>
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label="Dòng tiêu đề lên"
          onClick={() => onChange(Math.max(0, rowIndex - 1))}
          className="rounded bg-gray-800 px-2 py-1 hover:bg-gray-700"
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="Dòng tiêu đề xuống"
          onClick={() => onChange(rowIndex + 1)}
          className="rounded bg-gray-800 px-2 py-1 hover:bg-gray-700"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

function TypeReview({
  columns,
  onChange,
}: {
  columns: DatasetColumn[];
  onChange: (index: number, type: ColumnType) => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-amber-600/40 bg-amber-500/5 p-4">
      <h2 className="text-sm font-medium text-amber-200">Xác nhận kiểu cột</h2>
      <p className="mt-0.5 text-xs text-amber-200/70">
        Một số cột chưa chắc kiểu — chỉnh lại nếu sai:
      </p>
      <div className="mt-3 space-y-2">
        {columns.map((col) => (
          <div key={col.index} className="flex items-center gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{col.name}</span>
            <select
              aria-label={`Kiểu cột ${col.name}`}
              value={col.type}
              onChange={(e) => onChange(col.index, e.target.value as ColumnType)}
              className="rounded bg-gray-800 px-2 py-1 text-xs text-white"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColumnGroup({
  icon,
  label,
  hint,
  columns,
  selected,
  onToggle,
}: {
  icon: string;
  label: string;
  hint: string;
  columns: DatasetColumn[];
  selected: Set<number>;
  onToggle: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden>{icon}</span>
        <h2 className="font-medium">{label}</h2>
        <span className="ml-auto text-xs text-gray-500">{columns.length}</span>
      </div>
      <p className="mb-3 text-xs text-gray-500">{hint}</p>
      {columns.length === 0 ? (
        <p className="text-sm text-gray-600">— Không có —</p>
      ) : (
        <ul className="space-y-2">
          {columns.map((col) => (
            <li key={col.index}>
              <button
                type="button"
                onClick={() => onToggle(col.index)}
                aria-pressed={selected.has(col.index)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selected.has(col.index)
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
                <span className="block truncate font-medium">{col.name}</span>
                <span className="block truncate text-xs text-gray-500">
                  {col.sampleValues.join(', ') || '—'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PreviewTable({
  columns,
  rows,
}: {
  columns: DatasetColumn[];
  rows: Record<string, string>[];
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-medium text-gray-300">
        Xem trước 3 dòng đầu
      </h2>
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              {columns.map((col) => (
                <th key={col.index} className="px-4 py-2 font-medium">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map((row, i) => (
              <tr key={i} className="text-gray-300">
                {columns.map((col) => (
                  <td key={col.index} className="px-4 py-2">
                    {row[col.name] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
