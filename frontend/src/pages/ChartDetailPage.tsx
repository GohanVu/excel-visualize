import { useParams, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api/datasets';
import type { ChartSuggestion } from '../api/datasets';
import { buildChartOption } from '../lib/buildChartOption';
import ChartView from '../components/ChartView';

interface LocationState {
  suggestion?: ChartSuggestion;
  selectedColumns?: number[];
}

export default function ChartDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const state = useLocation().state as LocationState | null;
  const suggestion = state?.suggestion;
  const selectedColumns = state?.selectedColumns;

  if (!suggestion || !selectedColumns) {
    return <Navigate to={`/datasets/${id}/columns`} replace />;
  }

  return (
    <ChartDetail
      datasetId={id}
      suggestion={suggestion}
      onBack={() =>
        navigate(`/datasets/${id}/charts`, { state: { selectedColumns } })
      }
    />
  );
}

function ChartDetail({
  datasetId,
  suggestion,
  onBack,
}: {
  datasetId: string;
  suggestion: ChartSuggestion;
  onBack: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dataset', datasetId, 'rows'],
    queryFn: () => fetchRows(datasetId),
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
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <ChartView option={buildChartOption(suggestion, data.rows)} height={480} />
        </div>
        <p className="mt-3 text-xs text-gray-500">{data.rows.length} dòng dữ liệu</p>
      </div>
    </div>
  );
}
