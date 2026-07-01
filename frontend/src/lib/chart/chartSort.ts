// Sắp xếp + giới hạn Top N trên IR {categories, series} (P3.5-T3).
// QUAN TRỌNG: khi không sort & limit không có hiệu lực → trả về data GỐC (identity),
// đảm bảo backward-compat tuyệt đối cho luồng suggestion cũ (không set sort/limit).
import type { ChartDefinition } from '../../types/chartDefinition';
import type { ChartData } from './chartSeries';

export function applySortLimit(data: ChartData, def: ChartDefinition): ChartData {
  const { sort, limit, xField } = def;
  const n = data.categories.length;
  const limitActive = limit != null && limit > 0 && limit < n;

  if (!sort && !limitActive) return data; // identity → không đổi

  let idx = Array.from({ length: n }, (_, i) => i);

  if (sort && n > 0) {
    if (sort.field && sort.field === xField) {
      // Sắp theo nhãn trục X (numeric-aware để '2' < '10').
      idx.sort((a, b) =>
        data.categories[a].localeCompare(data.categories[b], undefined, { numeric: true }),
      );
    } else {
      // Sắp theo giá trị 1 series (khớp tên; mặc định series đầu = giá trị gộp).
      const s = data.series.find((se) => se.name === sort.field) ?? data.series[0];
      const d = s?.data ?? [];
      idx.sort((a, b) => (d[a] ?? 0) - (d[b] ?? 0));
    }
    if (sort.direction === 'desc') idx.reverse();
  }

  if (limitActive) idx = idx.slice(0, limit);

  return {
    categories: idx.map((i) => data.categories[i]),
    series: data.series.map((se) => ({ name: se.name, data: idx.map((i) => se.data[i]) })),
  };
}
