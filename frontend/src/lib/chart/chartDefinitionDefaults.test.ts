import { describe, it, expect } from 'vitest';
import {
  createDefaultChartDefinition,
  DEFAULT_DEFINITION_STYLE,
} from './chartDefinitionDefaults';
import type { DatasetColumn, ColumnType } from '../../api/datasets';

function col(name: string, type: ColumnType): Pick<DatasetColumn, 'name' | 'type'> {
  return { name, type };
}

describe('createDefaultChartDefinition', () => {
  it('date + number → line theo thời gian, sum, sort x tăng dần', () => {
    const def = createDefaultChartDefinition([
      col('Ngày', 'date'),
      col('Doanh thu', 'number'),
    ]);
    expect(def).toMatchObject({
      version: 1,
      chartType: 'line',
      xField: 'Ngày',
      yFields: ['Doanh thu'],
      aggregation: 'sum',
      sort: { field: 'Ngày', direction: 'asc' },
    });
  });

  it('category + number → bar, sum, Top 10 giảm dần', () => {
    const def = createDefaultChartDefinition([
      col('Sản phẩm', 'category'),
      col('Doanh thu', 'number'),
    ]);
    expect(def).toMatchObject({
      chartType: 'bar',
      xField: 'Sản phẩm',
      yFields: ['Doanh thu'],
      aggregation: 'sum',
      sort: { field: 'Doanh thu', direction: 'desc' },
      limit: 10,
    });
  });

  it('category only → bar đếm số dòng (count), không có cột số', () => {
    const def = createDefaultChartDefinition([col('Trạng thái', 'category')]);
    expect(def).toMatchObject({
      chartType: 'bar',
      xField: 'Trạng thái',
      aggregation: 'count',
    });
    expect(def.yFields).toEqual([]);
  });

  it('≥2 number thuần (không date/category) → scatter', () => {
    const def = createDefaultChartDefinition([
      col('Chiều cao', 'number'),
      col('Cân nặng', 'number'),
    ]);
    expect(def).toMatchObject({
      chartType: 'scatter',
      xField: 'Chiều cao',
      yFields: ['Cân nặng'],
    });
  });

  it('category + nhiều number → ưu tiên bar (không scatter)', () => {
    const def = createDefaultChartDefinition([
      col('Khu vực', 'category'),
      col('Doanh thu', 'number'),
      col('Chi phí', 'number'),
    ]);
    expect(def.chartType).toBe('bar');
    expect(def.xField).toBe('Khu vực');
  });

  it('string được coi như phân loại khi không có category', () => {
    const def = createDefaultChartDefinition([col('Tên', 'string'), col('Điểm', 'number')]);
    expect(def).toMatchObject({ chartType: 'bar', xField: 'Tên', yFields: ['Điểm'] });
  });

  it('rỗng → fallback bar count, không lỗi', () => {
    const def = createDefaultChartDefinition([]);
    expect(def).toMatchObject({ version: 1, chartType: 'bar', aggregation: 'count' });
    expect(def.xField).toBeUndefined();
    expect(def.yFields).toEqual([]);
  });

  it('luôn kèm style mặc định (copy, không chia sẻ tham chiếu)', () => {
    const def = createDefaultChartDefinition([col('A', 'category')]);
    expect(def.style).toMatchObject(DEFAULT_DEFINITION_STYLE);
    expect(def.style).not.toBe(DEFAULT_DEFINITION_STYLE);
  });
});
