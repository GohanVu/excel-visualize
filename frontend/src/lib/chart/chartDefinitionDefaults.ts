// Smart default cho ChartDefinition (P3.5-T1): chọn kiểu biểu đồ + x/y + phép gộp
// theo kiểu cột, để Studio KHÔNG bao giờ mở ra form trống.
import type { DatasetColumn, ColumnType } from '../../api/datasets';
import type { ChartDefinition, ChartDefinitionStyle } from '../../types/chartDefinition';

export const DEFAULT_DEFINITION_STYLE: ChartDefinitionStyle = {
  palette: 'default',
  theme: 'dark',
  showLegend: true,
  showLabels: false,
  showGrid: true,
};

// Chỉ cần name + type để suy default; nhận cả DatasetColumn đầy đủ.
type ColLike = Pick<DatasetColumn, 'name' | 'type'>;

function firstOfType(cols: ColLike[], type: ColumnType): string | undefined {
  return cols.find((c) => c.type === type)?.name;
}

/**
 * Ưu tiên chọn default theo kiểu cột:
 *  - date + number → line (xu hướng theo thời gian), sum, sort x tăng dần
 *  - category + number → bar, sum, sort giá trị giảm dần, Top 10
 *  - ≥2 number thuần (không date/category) → scatter
 *  - category only → bar đếm số dòng (count)
 *  - fallback → bar count trên cột đầu tiên
 * Lưu ý: default average-theo-tên-cột (giá/đơn giá…) do suggester backend lo
 * (P1.8-T2 `defaultAggregation`); ở đây giữ sum để helper thuần & dễ test.
 */
export function createDefaultChartDefinition(columns: ColLike[]): ChartDefinition {
  const base = {
    version: 1 as const,
    style: { ...DEFAULT_DEFINITION_STYLE },
  };

  const date = firstOfType(columns, 'date');
  const number = firstOfType(columns, 'number');
  const category = firstOfType(columns, 'category') ?? firstOfType(columns, 'string');
  const numbers = columns.filter((c) => c.type === 'number').map((c) => c.name);

  if (date && number) {
    return {
      ...base,
      chartType: 'line',
      xField: date,
      yFields: [number],
      aggregation: 'sum',
      sort: { field: date, direction: 'asc' },
    };
  }

  if (category && number) {
    return {
      ...base,
      chartType: 'bar',
      xField: category,
      yFields: [number],
      aggregation: 'sum',
      sort: { field: number, direction: 'desc' },
      limit: 10,
    };
  }

  if (!category && !date && numbers.length >= 2) {
    return {
      ...base,
      chartType: 'scatter',
      xField: numbers[0],
      yFields: [numbers[1]],
    };
  }

  if (category) {
    return {
      ...base,
      chartType: 'bar',
      xField: category,
      yFields: [],
      aggregation: 'count',
    };
  }

  return {
    ...base,
    chartType: 'bar',
    xField: columns[0]?.name,
    yFields: [],
    aggregation: 'count',
  };
}
