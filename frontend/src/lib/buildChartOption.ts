import type { ChartSuggestion, Aggregation } from '../api/datasets';
import { formatDate } from './formatDate';

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

// Chuẩn hoá 1 series thành % tổng (mỗi giá trị / tổng series, làm tròn 1 chữ số).
// "% tổng" là CÁCH HIỂN THỊ (chỉ cho bar), không phải phép gộp.
function maybePercent(data: number[], on: boolean): number[] {
  if (!on) return data;
  const total = data.reduce((a, b) => a + b, 0);
  if (total === 0) return data.map(() => 0);
  return data.map((v) => Math.round((v / total) * 1000) / 10);
}

const valueAxis = (percent: boolean, minInterval: boolean) => {
  const axis: Record<string, unknown> = { type: 'value' };
  if (percent) {
    axis.axisLabel = { formatter: '{value}%' };
  }
  if (minInterval) {
    axis.minInterval = 1;
  }
  return axis;
};

/** Dựng ECharts option từ 1 gợi ý chart + data rows (dùng cho cả thumbnail và full) */
export function buildChartOption(
  suggestion: ChartSuggestion,
  rows: Row[],
  opts: { percent?: boolean } = {},
): ChartOption {
  const { type, encoding, aggregation } = suggestion;
  const { x, y } = encoding;
  const percent = !!opts.percent && type === 'bar'; // % tổng chỉ áp cho bar

  // Có phép gộp → nhóm theo x rồi áp hàm (count|sum|average|median|min|max).
  // Gộp ra category → bar (hoặc pie). Không gộp (aggregation rỗng) đi nhánh raw.
  if (aggregation) {
    if (type === 'pie') {
      const data = groupAggregate(rows, x, y[0] ?? '', aggregation).map((d) => ({
        name: formatDate(d.name),
        value: d.value,
      }));
      return {
        color: PALETTE,
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: '70%', data }],
      };
    }
    // bar: mỗi cột số = 1 series (count → y rỗng → 1 series đếm).
    // Thứ tự nhóm x giống nhau với mọi cột y (nhóm theo x), lấy từ cột đầu.
    const cols = y.length > 0 ? y : [''];
    const names = groupAggregate(rows, x, cols[0], aggregation).map((d) =>
      formatDate(d.name),
    );
    const seriesList = cols.map((c) =>
      maybePercent(
        groupAggregate(rows, x, c, aggregation).map((d) => d.value),
        percent,
      ),
    );
    const isIntegerAxis =
      !percent && seriesList.every((data) => data.every((v) => Number.isInteger(v)));

    return {
      color: PALETTE,
      tooltip: { trigger: 'axis' },
      legend: cols.length > 1 ? { data: cols } : undefined,
      xAxis: { type: 'category', data: names },
      yAxis: valueAxis(percent, isIntegerAxis),
      series: cols.map((c, i) => ({
        name: c,
        type: 'bar',
        data: seriesList[i],
      })),
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
          data: rows.map((r) => ({
            name: formatDate(r[x] ?? ''),
            value: num(r[y[0]]),
          })),
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
  const seriesList = y.map((col) =>
    maybePercent(
      rows.map((r) => num(r[col])),
      percent,
    ),
  );
  const isIntegerAxis =
    !percent && seriesList.every((data) => data.every((v) => Number.isInteger(v)));

  return {
    color: PALETTE,
    tooltip: { trigger: 'axis' },
    legend: y.length > 1 ? { data: y } : undefined,
    xAxis: { type: 'category', data: rows.map((r) => formatDate(r[x] ?? '')) },
    yAxis: valueAxis(percent, isIntegerAxis),
    series: y.map((col, i) => ({
      name: col,
      type,
      data: seriesList[i],
    })),
  };
}

