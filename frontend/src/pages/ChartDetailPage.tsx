import { useState } from 'react';
import { useParams, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api/datasets';
import type { ChartSuggestion, Aggregation } from '../api/datasets';
import { saveChart } from '../api/charts';
import { buildChartOption } from '../lib/buildChartOption';
import ChartView from '../components/ChartView';

// Nhãn tiếng Việt cho switcher phép gộp (T3). Chưa gate Free/Pro — hiện đủ 6.
const AGG_ORDER: Aggregation[] = [
  'count',
  'sum',
  'average',
  'median',
  'min',
  'max',
];
const AGG_LABELS: Record<Aggregation, string> = {
  count: 'Đếm',
  sum: 'Tổng',
  average: 'Trung bình',
  median: 'Trung vị',
  min: 'Nhỏ nhất',
  max: 'Lớn nhất',
};

interface LocationState {
  suggestion?: ChartSuggestion;
  selectedColumns?: number[];
  sheet?: string;
  headerRow?: number;
}

export default function ChartDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;
  const suggestion = state?.suggestion;
  const selectedColumns = state?.selectedColumns;
  const sheet = state?.sheet;
  const headerRow = state?.headerRow;

  if (!suggestion || !selectedColumns) {
    return <Navigate to={`/datasets/${id}/columns`} replace />;
  }

  return (
    <ChartDetail
      datasetId={id}
      suggestion={suggestion}
      sheet={sheet}
      headerRow={headerRow}
      onBack={() =>
        navigate(`/datasets/${id}/charts`, {
          state: { selectedColumns, sheet, headerRow },
        })
      }
      onSaved={() => navigate('/dashboard')}
    />
  );
}

function ChartDetail({
  datasetId,
  suggestion,
  sheet,
  headerRow,
  onBack,
  onSaved,
}: {
  datasetId: string;
  suggestion: ChartSuggestion;
  sheet?: string;
  headerRow?: number;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  // Phép gộp đang chọn — khởi tạo từ gợi ý; user verify/đổi → re-render
  const [agg, setAgg] = useState<Aggregation | undefined>(
    suggestion.aggregation,
  );
  const [percent, setPercent] = useState(false); // toggle "% tổng" (chỉ bar)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dataset', datasetId, 'rows', sheet, headerRow],
    queryFn: () => fetchRows(datasetId, { sheet, headerRow }),
  });

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
        Không tải được dữ liệu. Thử lại sau.
      </div>
    );
  }

  // Cho đổi phép gộp khi gợi ý đã gộp VÀ có cột số (category+number). Chart "đếm"
  // thuần (y rỗng) không có gì để tổng/TB; time-series raw cũng không gộp.
  const canSwitch =
    suggestion.aggregation != null && suggestion.encoding.y.length > 0;
  const canTogglePercent = suggestion.type === 'bar'; // pie vốn đã %
  const activeSuggestion = agg ? { ...suggestion, aggregation: agg } : suggestion;
  const option = buildChartOption(activeSuggestion, data.rows, { percent });

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      await saveChart(datasetId, suggestion.type, suggestion.title, option);
      setSaved(true);
      setTimeout(onSaved, 1200);
    } catch {
      setSaveError('Lưu thất bại. Thử lại sau.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm text-gray-400 hover:text-white"
        >
          ← Chọn lại biểu đồ
        </button>
        <h1 className="text-xl font-bold">{suggestion.title}</h1>
        <p className="mt-1 text-sm text-gray-400">{suggestion.description}</p>

        {canSwitch && (
          <div className="mt-4">
            <span className="text-xs text-gray-400">Phép gộp</span>
            <div
              className="mt-1 flex flex-wrap gap-2"
              role="group"
              aria-label="Phép gộp"
            >
              {AGG_ORDER.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={agg === a}
                  onClick={() => setAgg(a)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    agg === a
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {AGG_LABELS[a]}
                </button>
              ))}
            </div>
          </div>
        )}

        {canTogglePercent && (
          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={percent}
              onChange={(e) => setPercent(e.target.checked)}
              className="h-4 w-4 accent-purple-600"
            />
            Hiển thị % tổng
          </label>
        )}

        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <ChartView option={option} height={480} />
        </div>
        <p className="mt-3 text-xs text-gray-500">{data.rows.length} dòng dữ liệu</p>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium transition hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? 'Đang lưu…' : saved ? '✓ Đã lưu!' : 'Lưu vào dashboard'}
          </button>
          {saveError && (
            <p className="text-sm text-red-400">{saveError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
