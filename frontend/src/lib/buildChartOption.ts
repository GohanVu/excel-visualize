import type { ChartSuggestion } from '../api/datasets';

type Row = Record<string, string>;
// EChartsOption rộng — dùng record để khỏi phụ thuộc type nội bộ echarts
export type ChartOption = Record<string, unknown>;

const PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

function num(value: string | undefined): number {
  const n = Number((value ?? '').toString().replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Đếm số dòng theo giá trị cột x, giữ thứ tự xuất hiện đầu tiên
function countBy(rows: Row[], xKey: string): { name: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = (r[xKey] ?? '').toString().trim() || '(trống)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([name, value]) => ({ name, value }));
}

/** Dựng ECharts option từ 1 gợi ý chart + data rows (dùng cho cả thumbnail và full) */
export function buildChartOption(
  suggestion: ChartSuggestion,
  rows: Row[],
): ChartOption {
  const { type, encoding, aggregation } = suggestion;
  const { x, y } = encoding;

  // Đếm số dòng theo x (data toàn chữ, không có cột số)
  if (aggregation === 'count') {
    const data = countBy(rows, x);
    if (type === 'pie') {
      return {
        color: PALETTE,
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: '70%', data }],
      };
    }
    return {
      color: PALETTE,
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.map((d) => d.name) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.map((d) => d.value) }],
    };
  }

  if (type === 'pie') {
    return {
      color: PALETTE,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: '70%',
          data: rows.map((r) => ({ name: r[x] ?? '', value: num(r[y[0]]) })),
        },
      ],
    };
  }

  if (type === 'scatter') {
    return {
      color: PALETTE,
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: x },
      yAxis: { type: 'value', name: y[0] },
      series: [
        {
          type: 'scatter',
          data: rows.map((r) => [num(r[x]), num(r[y[0]])]),
        },
      ],
    };
  }

  // line | bar — trục x là category, mỗi cột số liệu là 1 series
  return {
    color: PALETTE,
    tooltip: { trigger: 'axis' },
    legend: y.length > 1 ? { data: y } : undefined,
    xAxis: { type: 'category', data: rows.map((r) => r[x] ?? '') },
    yAxis: { type: 'value' },
    series: y.map((col) => ({
      name: col,
      type,
      data: rows.map((r) => num(r[col])),
    })),
  };
}
