// Dựng dữ liệu trung gian {categories, series} từ rows + definition (P3.5-T3).
// Tách 3 nguồn: gộp (aggregated), thô (raw), tách nhóm (seriesField split).
import type { Aggregation } from '../../api/datasets';
import { num, label, reduceAgg, groupAggregate, type Row } from './chartAggregation';

export interface SeriesData {
  name: string;
  data: number[];
}

// IR trung gian: mảng category (trục X) + nhiều series cùng độ dài với category.
// categories giữ giá trị THÔ (chưa formatDate) để sort đúng; render mới format.
export interface ChartData {
  categories: string[];
  series: SeriesData[];
}

// Có phép gộp, KHÔNG tách nhóm: category = x distinct; mỗi cột y (hoặc count) = 1 series.
export function buildAggregated(
  rows: Row[],
  x: string,
  yFields: string[],
  agg: Aggregation,
): ChartData {
  const cols = yFields.length > 0 ? yFields : [''];
  const categories = groupAggregate(rows, x, cols[0], agg).map((d) => d.name);
  const series = cols.map((c) => ({
    name: c,
    data: groupAggregate(rows, x, c, agg).map((d) => d.value),
  }));
  return { categories, series };
}

// Không gộp (raw): mỗi dòng là 1 điểm; mỗi cột y = 1 series.
export function buildRaw(rows: Row[], x: string, yFields: string[]): ChartData {
  const categories = rows.map((r) => (r[x] ?? '').toString());
  const series = yFields.map((col) => ({
    name: col,
    data: rows.map((r) => num(r[col])),
  }));
  return { categories, series };
}

// Tách nhóm (seriesField): category = x distinct; mỗi giá trị của seriesField = 1 series,
// gộp yCol (hoặc count) theo (x, series). Ví dụ x=Tháng, series=Khu vực → mỗi khu vực 1 đường.
export function buildSplit(
  rows: Row[],
  x: string,
  yCol: string,
  agg: Aggregation,
  seriesField: string,
): ChartData {
  const categories: string[] = [];
  const seriesNames: string[] = [];
  for (const r of rows) {
    const cx = label(r[x]);
    const cs = label(r[seriesField]);
    if (!categories.includes(cx)) categories.push(cx);
    if (!seriesNames.includes(cs)) seriesNames.push(cs);
  }
  const series = seriesNames.map((s) => ({
    name: s,
    data: categories.map((c) => {
      const vals = rows
        .filter((r) => label(r[x]) === c && label(r[seriesField]) === s)
        .map((r) => num(r[yCol]));
      return reduceAgg(vals, agg);
    }),
  }));
  return { categories, series };
}
