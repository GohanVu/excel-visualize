import { describe, it, expect } from 'vitest';
import { buildChartOption } from './buildChartOption';
import type { ChartSuggestion } from '../api/datasets';

const rows = [
  { Ngày: '2024-01-01', 'Doanh thu': '100', 'Chi phí': '40' },
  { Ngày: '2024-01-02', 'Doanh thu': '200', 'Chi phí': '60' },
];

function suggestion(over: Partial<ChartSuggestion>): ChartSuggestion {
  return {
    type: 'line',
    title: 't',
    description: 'd',
    encoding: { x: 'Ngày', y: ['Doanh thu'] },
    ...over,
  };
}

describe('buildChartOption', () => {
  it('line: category x-axis + one series per y column', () => {
    const opt = buildChartOption(
      suggestion({ type: 'line', encoding: { x: 'Ngày', y: ['Doanh thu', 'Chi phí'] } }),
      rows,
    ) as any;
    expect(opt.xAxis.type).toBe('category');
    expect(opt.xAxis.data).toEqual(['2024-01-01', '2024-01-02']);
    expect(opt.series).toHaveLength(2);
    expect(opt.series[0]).toMatchObject({ type: 'line', name: 'Doanh thu', data: [100, 200] });
  });

  it('bar: series type is bar', () => {
    const opt = buildChartOption(suggestion({ type: 'bar' }), rows) as any;
    expect(opt.series[0].type).toBe('bar');
  });

  it('pie: maps rows to {name, value}', () => {
    const opt = buildChartOption(
      suggestion({ type: 'pie', encoding: { x: 'Ngày', y: ['Doanh thu'] } }),
      rows,
    ) as any;
    expect(opt.series[0].type).toBe('pie');
    expect(opt.series[0].data).toEqual([
      { name: '2024-01-01', value: 100 },
      { name: '2024-01-02', value: 200 },
    ]);
  });

  it('scatter: maps rows to [x, y] pairs', () => {
    const opt = buildChartOption(
      suggestion({ type: 'scatter', encoding: { x: 'Doanh thu', y: ['Chi phí'] } }),
      rows,
    ) as any;
    expect(opt.series[0].type).toBe('scatter');
    expect(opt.series[0].data).toEqual([[100, 40], [200, 60]]);
  });

  it('coerces non-numeric / missing values to 0', () => {
    const opt = buildChartOption(
      suggestion({ type: 'bar', encoding: { x: 'Ngày', y: ['Doanh thu'] } }),
      [{ Ngày: 'x', 'Doanh thu': 'N/A' }],
    ) as any;
    expect(opt.series[0].data).toEqual([0]);
  });

  it('strips thousand separators in numbers', () => {
    const opt = buildChartOption(
      suggestion({ type: 'bar', encoding: { x: 'Ngày', y: ['Doanh thu'] } }),
      [{ Ngày: 'x', 'Doanh thu': '1,500' }],
    ) as any;
    expect(opt.series[0].data).toEqual([1500]);
  });

  describe('aggregation: count', () => {
    const vocab = [
      { 'Từ loại': 'Danh từ' },
      { 'Từ loại': 'Danh từ' },
      { 'Từ loại': 'Động từ' },
    ];

    it('count bar: distinct x with counts', () => {
      const opt = buildChartOption(
        suggestion({ type: 'bar', aggregation: 'count', encoding: { x: 'Từ loại', y: [] } }),
        vocab,
      ) as any;
      expect(opt.xAxis.data).toEqual(['Danh từ', 'Động từ']);
      expect(opt.series[0].type).toBe('bar');
      expect(opt.series[0].data).toEqual([2, 1]);
    });

    it('count pie: {name, value} per distinct x', () => {
      const opt = buildChartOption(
        suggestion({ type: 'pie', aggregation: 'count', encoding: { x: 'Từ loại', y: [] } }),
        vocab,
      ) as any;
      expect(opt.series[0].type).toBe('pie');
      expect(opt.series[0].data).toEqual([
        { name: 'Danh từ', value: 2 },
        { name: 'Động từ', value: 1 },
      ]);
    });

    it('empty values become "(trống)"', () => {
      const opt = buildChartOption(
        suggestion({ type: 'bar', aggregation: 'count', encoding: { x: 'Từ loại', y: [] } }),
        [{ 'Từ loại': '' }, { 'Từ loại': 'Danh từ' }],
      ) as any;
      expect(opt.xAxis.data).toEqual(['(trống)', 'Danh từ']);
    });
  });
});
