// Wrapper backward-compat (P3.5-T3): giữ chữ ký cũ cho ChartDetail/ChartSuggestion/ChartView,
// nhưng nội bộ chuyển suggestion → ChartDefinition → compiler mới.
import type { ChartSuggestion } from '../api/datasets';
import { chartSuggestionToDefinition } from './chart/chartConfigAdapter';
import { buildChartOptionFromDefinition, type ChartOption } from './chart/chartCompiler';

// Re-export để không vỡ import cũ.
export type { ChartOption };
export { groupAggregate } from './chart/chartAggregation';

/** Dựng ECharts option từ 1 gợi ý + data rows (dùng cho cả thumbnail và full). */
export function buildChartOption(
  suggestion: ChartSuggestion,
  rows: Record<string, string>[],
  opts: { percent?: boolean } = {},
): ChartOption {
  return buildChartOptionFromDefinition(
    chartSuggestionToDefinition(suggestion, opts),
    rows,
  );
}
