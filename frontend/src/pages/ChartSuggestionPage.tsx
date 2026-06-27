import { useParams, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchColumns, suggestCharts } from '../api/datasets';
import type { ChartSuggestion } from '../api/datasets';
import { buildChartOption } from '../lib/buildChartOption';
import ChartView from '../components/ChartView';

interface LocationState {
  selectedColumns?: number[];
}

export default function ChartSuggestionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;
  const selectedColumns = state?.selectedColumns;

  // Vào thẳng trang (reload) mà không có cột đã chọn → quay lại bước chọn cột
  if (!selectedColumns || selectedColumns.length === 0) {
    return <Navigate to={`/datasets/${id}/columns`} replace />;
  }

  return (
    <SuggestionContent
      datasetId={id}
      selectedColumns={selectedColumns}
      onBack={() => navigate(`/datasets/${id}/columns`)}
    />
  );
}

function SuggestionContent({
  datasetId,
  selectedColumns,
  onBack,
}: {
  datasetId: string;
  selectedColumns: number[];
  onBack: () => void;
}) {
  const overview = useQuery({
    queryKey: ['dataset', datasetId, 'columns'],
    queryFn: () => fetchColumns(datasetId),
  });

  const suggest = useQuery({
    queryKey: ['dataset', datasetId, 'suggest', selectedColumns],
    queryFn: () => suggestCharts(datasetId, selectedColumns),
  });

  if (overview.isLoading || suggest.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (overview.isError || suggest.isError || !overview.data || !suggest.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-300">
        Không tạo được gợi ý biểu đồ. Thử lại sau.
      </div>
    );
  }

  const rows = overview.data.previewRows;
  const { suggestions } = suggest.data;

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm text-gray-400 hover:text-white"
        >
          ← Chọn lại cột
        </button>
        <h1 className="text-2xl font-bold">Gợi ý biểu đồ</h1>
        <p className="mt-1 text-sm text-gray-400">
          Chọn biểu đồ phù hợp nhất với dữ liệu của bạn
        </p>

        {suggestions.length === 0 ? (
          <p className="mt-8 text-gray-400">
            Chưa có gợi ý phù hợp cho tổ hợp cột này. Thử chọn thêm cột số liệu.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {suggestions.map((s, i) => (
              <SuggestionCard key={i} suggestion={s} rows={rows} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  rows,
}: {
  suggestion: ChartSuggestion;
  rows: Record<string, string>[];
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="rounded-lg bg-gray-950 p-2">
        <ChartView option={buildChartOption(suggestion, rows)} height={200} />
      </div>
      <h2 className="mt-3 font-medium">{suggestion.title}</h2>
      <p className="mt-1 text-sm text-gray-400">{suggestion.description}</p>
      <button
        type="button"
        className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium transition hover:bg-blue-500"
      >
        Chọn biểu đồ này
      </button>
    </div>
  );
}
