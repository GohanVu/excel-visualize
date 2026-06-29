import type { ChartSuggestion, Aggregation } from '../api/datasets';

type Row = Record<string, string>;
// EChartsOption rộng — dùng record để khỏi phụ thuộc type nội bộ echarts
export type ChartOption = Record<string, unknown>;

const PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

function num(value: string | undefined): number {
  const n = Number((value ?? '').toString().replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Áp 1 phép gộp lên mảng số của 1 nhóm. count = số dòng (bỏ qua giá trị).
function reduceAgg(values: number[], fn: Aggregation): number {
  if (fn === 'count') return values.length;
  if (values.length === 0) return 0;
  switch (fn) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'average':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'median': {
      const s = [...values].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }
  }
}

// Nhóm rows theo giá trị cột x (giữ thứ tự xuất hiện đầu) rồi áp phép gộp lên
// cột y. SỬA lỗi nhóm-lặp: mỗi giá trị x distinct = đúng 1 cột, không lặp.
export function groupAggregate(
  rows: Row[],
  xKey: string,
  yKey: string,
  fn: Aggregation,
): { name: string; value: number }[] {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const key = (r[xKey] ?? '').toString().trim() || '(trống)';
    let arr = groups.get(key);
    if (!arr) {
      arr = [];
      groups.set(key, arr);
    }
    arr.push(num(r[yKey]));
  }
  return [...groups].map(([name, vals]) => ({
    name,
    value: reduceAgg(vals, fn),
  }));
}

/** Dựng ECharts option từ 1 gợi ý chart + data rows (dùng cho cả thumbnail và full) */
export function buildChartOption(
  suggestion: ChartSuggestion,
  rows: Row[],
): ChartOption {
  const { type, encoding, aggregation } = suggestion;
  const { x, y } = encoding;

  // Có phép gộp → nhóm theo x rồi áp hàm (count|sum|average|median|min|max).
  // Gộp ra category → bar (hoặc pie). Không gộp (aggregation rỗng) đi nhánh raw.
  if (aggregation) {
    const data = groupAggregate(rows, x, y[0] ?? '', aggregation);
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
