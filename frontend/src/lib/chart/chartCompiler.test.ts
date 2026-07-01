import { describe, it, expect } from 'vitest';
import { buildChartOptionFromDefinition } from './chartCompiler';
import type { ChartDefinition } from '../../types/chartDefinition';

function def(over: Partial<ChartDefinition>): ChartDefinition {
  return {
    version: 1,
    chartType: 'bar',
    xField: 'x',
    yFields: [],
    ...over,
  };
}

describe('buildChartOptionFromDefinition — seriesField (tách nhóm)', () => {
  const sales = [
    { Tháng: 'T1', 'Khu vực': 'Hà Nội', 'Doanh thu': '100' },
    { Tháng: 'T1', 'Khu vực': 'HCM', 'Doanh thu': '200' },
    { Tháng: 'T2', 'Khu vực': 'Hà Nội', 'Doanh thu': '300' },
    { Tháng: 'T2', 'Khu vực': 'HCM', 'Doanh thu': '400' },
  ];

  it('mỗi giá trị seriesField = 1 series, gộp theo (x, series)', () => {
    const opt = buildChartOptionFromDefinition(
      def({
        chartType: 'line',
        xField: 'Tháng',
        yFields: ['Doanh thu'],
        aggregation: 'sum',
        seriesField: 'Khu vực',
      }),
      sales,
    ) as any;
    expect(opt.xAxis.data).toEqual(['T1', 'T2']);
    expect(opt.series).toHaveLength(2);
    expect(opt.series[0]).toMatchObject({ name: 'Hà Nội', type: 'line', data: [100, 300] });
    expect(opt.series[1]).toMatchObject({ name: 'HCM', type: 'line', data: [200, 400] });
    expect(opt.legend).toEqual({ data: ['Hà Nội', 'HCM'] });
  });

  it('count + seriesField: đếm số dòng theo (x, series)', () => {
    const rows = [
      { Tháng: 'T1', 'Khu vực': 'HN' },
      { Tháng: 'T1', 'Khu vực': 'HN' },
      { Tháng: 'T1', 'Khu vực': 'HCM' },
      { Tháng: 'T2', 'Khu vực': 'HN' },
    ];
    const opt = buildChartOptionFromDefinition(
      def({ xField: 'Tháng', yFields: [], aggregation: 'count', seriesField: 'Khu vực' }),
      rows,
    ) as any;
    expect(opt.xAxis.data).toEqual(['T1', 'T2']);
    expect(opt.series[0]).toMatchObject({ name: 'HN', data: [2, 1] });
    expect(opt.series[1]).toMatchObject({ name: 'HCM', data: [1, 0] });
  });
});

describe('buildChartOptionFromDefinition — sort + limit', () => {
  const rows = [
    { SP: 'B', DT: '300' },
    { SP: 'A', DT: '100' },
    { SP: 'C', DT: '200' },
  ];

  it('sort theo giá trị series giảm dần', () => {
    const opt = buildChartOptionFromDefinition(
      def({
        xField: 'SP',
        yFields: ['DT'],
        aggregation: 'sum',
        sort: { field: 'DT', direction: 'desc' },
      }),
      rows,
    ) as any;
    expect(opt.xAxis.data).toEqual(['B', 'C', 'A']);
    expect(opt.series[0].data).toEqual([300, 200, 100]);
  });

  it('sort theo nhãn trục X tăng dần', () => {
    const opt = buildChartOptionFromDefinition(
      def({
        xField: 'SP',
        yFields: ['DT'],
        aggregation: 'sum',
        sort: { field: 'SP', direction: 'asc' },
      }),
      rows,
    ) as any;
    expect(opt.xAxis.data).toEqual(['A', 'B', 'C']);
    expect(opt.series[0].data).toEqual([100, 300, 200]);
  });

  it('limit Top N (kết hợp sort desc) → giữ N nhóm cao nhất', () => {
    const opt = buildChartOptionFromDefinition(
      def({
        xField: 'SP',
        yFields: ['DT'],
        aggregation: 'sum',
        sort: { field: 'DT', direction: 'desc' },
        limit: 2,
      }),
      rows,
    ) as any;
    expect(opt.xAxis.data).toEqual(['B', 'C']);
    expect(opt.series[0].data).toEqual([300, 200]);
  });

  it('sort nhãn X numeric-aware (2 < 10)', () => {
    const numRows = [
      { SP: '10', DT: '1' },
      { SP: '2', DT: '2' },
      { SP: '1', DT: '3' },
    ];
    const opt = buildChartOptionFromDefinition(
      def({
        xField: 'SP',
        yFields: ['DT'],
        aggregation: 'sum',
        sort: { field: 'SP', direction: 'asc' },
      }),
      numRows,
    ) as any;
    expect(opt.xAxis.data).toEqual(['1', '2', '10']);
  });

  it('không sort/limit → giữ thứ tự xuất hiện (identity)', () => {
    const opt = buildChartOptionFromDefinition(
      def({ xField: 'SP', yFields: ['DT'], aggregation: 'sum' }),
      rows,
    ) as any;
    expect(opt.xAxis.data).toEqual(['B', 'A', 'C']);
  });

  it('limit lớn hơn số nhóm → không cắt', () => {
    const opt = buildChartOptionFromDefinition(
      def({ xField: 'SP', yFields: ['DT'], aggregation: 'sum', limit: 99 }),
      rows,
    ) as any;
    expect(opt.xAxis.data).toEqual(['B', 'A', 'C']);
  });
});

describe('buildChartOptionFromDefinition — chartType', () => {
  it('aggregation + line → series type line (Studio linh hoạt, không ép bar)', () => {
    const opt = buildChartOptionFromDefinition(
      def({ chartType: 'line', xField: 'SP', yFields: ['DT'], aggregation: 'sum' }),
      [{ SP: 'A', DT: '10' }],
    ) as any;
    expect(opt.series[0].type).toBe('line');
  });
});
