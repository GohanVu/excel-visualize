// Phép gộp thuần (P3.5-T3, tách từ buildChartOption cũ để reuse & test riêng).
import type { Aggregation } from '../../api/datasets';

export type Row = Record<string, string>;

export function num(value: string | undefined): number {
  const n = Number((value ?? '').toString().replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Nhãn nhóm: trim, ô trống → '(trống)'.
export function label(value: string | undefined): string {
  return (value ?? '').toString().trim() || '(trống)';
}

// Áp 1 phép gộp lên mảng số của 1 nhóm. count = số dòng (bỏ qua giá trị).
export function reduceAgg(values: number[], fn: Aggregation): number {
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
// cột y. Mỗi giá trị x distinct = đúng 1 cột, không lặp.
export function groupAggregate(
  rows: Row[],
  xKey: string,
  yKey: string,
  fn: Aggregation,
): { name: string; value: number }[] {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const key = label(r[xKey]);
    let arr = groups.get(key);
    if (!arr) {
      arr = [];
      groups.set(key, arr);
    }
    arr.push(num(r[yKey]));
  }
  return [...groups].map(([name, vals]) => ({ name, value: reduceAgg(vals, fn) }));
}

// Chuẩn hoá 1 series thành % tổng (mỗi giá trị / tổng series, làm tròn 1 chữ số).
export function maybePercent(data: number[], on: boolean): number[] {
  if (!on) return data;
  const total = data.reduce((a, b) => a + b, 0);
  if (total === 0) return data.map(() => 0);
  return data.map((v) => Math.round((v / total) * 1000) / 10);
}
