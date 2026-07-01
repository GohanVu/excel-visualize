// Compiler: ChartDefinition + rows → ECharts option (P3.5-T3).
// Là NGUỒN SỰ THẬT mới cho render; buildChartOption cũ chỉ còn là wrapper.
// Giữ output y hệt hành vi cũ cho luồng không set seriesField/sort/limit.
import type { ChartDefinition } from '../../types/chartDefinition';
import { num, maybePercent, type Row } from './chartAggregation';
import { formatDate } from '../formatDate';
import { buildAggregated, buildRaw, buildSplit, type ChartData } from './chartSeries';
import { applySortLimit } from './chartSort';

// EChartsOption rộng — dùng record để khỏi phụ thuộc type nội bộ echarts.
export type ChartOption = Record<string, unknown>;

const PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

const valueAxis = (percent: boolean, minInterval: boolean): Record<string, unknown> => {
  const axis: Record<string, unknown> = { type: 'value' };
  if (percent) axis.axisLabel = { formatter: '{value}%' };
  if (minInterval) axis.minInterval = 1;
  return axis;
};

// Scatter: 2 cột số, không gộp/tách/sort — giữ nguyên như cũ.
function renderScatter(rows: Row[], x: string, y: string): ChartOption {
  return {
    color: PALETTE,
    tooltip: { trigger: 'item' },
    xAxis: { type: 'value', name: x },
    yAxis: { type: 'value', name: y },
    series: [{ type: 'scatter', data: rows.map((r) => [num(r[x]), num(r[y])]) }],
  };
}

// Pie: dùng series đầu tiên, mỗi category = 1 lát.
function renderPie(data: ChartData): ChartOption {
  const first = data.series[0]?.data ?? [];
  return {
    color: PALETTE,
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: '70%',
        data: data.categories.map((name, i) => ({ name: formatDate(name), value: first[i] ?? 0 })),
      },
    ],
  };
}

// Bar | line (area sẽ thêm sau): trục X category, mỗi series 1 đường/cột.
function renderCartesian(data: ChartData, chartType: string, percent: boolean): ChartOption {
  const seriesType = chartType === 'line' ? 'line' : 'bar';
  const seriesData = data.series.map((s) => maybePercent(s.data, percent));
  const isIntegerAxis = !percent && seriesData.every((d) => d.every((v) => Number.isInteger(v)));
  const showLegend = data.series.length > 1;
  return {
    color: PALETTE,
    tooltip: { trigger: 'axis' },
    legend: showLegend ? { data: data.series.map((s) => s.name) } : undefined,
    xAxis: { type: 'category', data: data.categories.map((c) => formatDate(c)) },
    yAxis: valueAxis(percent, isIntegerAxis),
    series: data.series.map((s, i) => ({ name: s.name, type: seriesType, data: seriesData[i] })),
  };
}

export function buildChartOptionFromDefinition(def: ChartDefinition, rows: Row[]): ChartOption {
  const { chartType, seriesField } = def;
  const x = def.xField ?? '';
  const yFields = def.yFields ?? [];
  const agg = def.aggregation;
  const percent = !!def.display?.percent && chartType === 'bar';

  if (chartType === 'scatter') return renderScatter(rows, x, yFields[0]);

  // Dựng IR trung gian rồi sort/limit (no-op nếu không set).
  let data: ChartData;
  if (seriesField) {
    const yCol = yFields[0] ?? '';
    data = buildSplit(rows, x, yCol, agg ?? (yFields.length ? 'sum' : 'count'), seriesField);
  } else if (agg) {
    data = buildAggregated(rows, x, yFields, agg);
  } else {
    data = buildRaw(rows, x, yFields);
  }
  data = applySortLimit(data, def);

  return chartType === 'pie' ? renderPie(data) : renderCartesian(data, chartType, percent);
}
