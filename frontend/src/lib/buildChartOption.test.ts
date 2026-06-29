import { describe, it, expect } from 'vitest';
import { buildChartOption, groupAggregate } from './buildChartOption';
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

  // Bảng báo giá: nhóm lặp (Bò Úc 2 dòng) → trước đây vẽ 2 cột trùng tên
  describe('aggregation: số (sum/average/median/min/max)', () => {
    const meat = [
      { Loại: 'Bò Úc', Giá: '100' },
      { Loại: 'Bò Úc', Giá: '200' },
      { Loại: 'Bò Mỹ', Giá: '300' },
    ];
    const sg = (aggregation: ChartSuggestion['aggregation']) =>
      suggestion({ type: 'bar', aggregation, encoding: { x: 'Loại', y: ['Giá'] } });

    it('gộp nhóm lặp thành 1 cột distinct mỗi giá trị x', () => {
      const opt = buildChartOption(sg('sum'), meat) as any;
      expect(opt.xAxis.data).toEqual(['Bò Úc', 'Bò Mỹ']); // không lặp Bò Úc
      expect(opt.series[0].data).toHaveLength(2);
    });

    it('sum', () => {
      expect((buildChartOption(sg('sum'), meat) as any).series[0].data).toEqual([300, 300]);
    });
    it('average', () => {
      expect((buildChartOption(sg('average'), meat) as any).series[0].data).toEqual([150, 300]);
    });
    it('min', () => {
      expect((buildChartOption(sg('min'), meat) as any).series[0].data).toEqual([100, 300]);
    });
    it('max', () => {
      expect((buildChartOption(sg('max'), meat) as any).series[0].data).toEqual([200, 300]);
    });
    it('median (chẵn = trung bình 2 giá trị giữa)', () => {
      const rows = [
        { Loại: 'A', Giá: '10' },
        { Loại: 'A', Giá: '20' },
        { Loại: 'A', Giá: '30' },
        { Loại: 'A', Giá: '40' },
      ];
      expect((buildChartOption(sg('median'), rows) as any).series[0].data).toEqual([25]);
    });

    it('pie cũng gộp theo nhóm', () => {
      const opt = buildChartOption(sg('sum'), meat) as any;
      // bar ở trên; kiểm tra pie riêng
      const pie = buildChartOption(
        suggestion({ type: 'pie', aggregation: 'sum', encoding: { x: 'Loại', y: ['Giá'] } }),
        meat,
      ) as any;
      expect(opt.series[0].type).toBe('bar');
      expect(pie.series[0].data).toEqual([
        { name: 'Bò Úc', value: 300 },
        { name: 'Bò Mỹ', value: 300 },
      ]);
    });
  });

  describe('groupAggregate', () => {
    const rows = [
      { k: 'a', v: '2' },
      { k: 'a', v: '4' },
      { k: 'b', v: '9' },
    ];
    it('count bỏ qua cột giá trị, đếm dòng/nhóm', () => {
      expect(groupAggregate(rows, 'k', '', 'count')).toEqual([
        { name: 'a', value: 2 },
        { name: 'b', value: 1 },
      ]);
    });
    it('sum gộp đúng theo nhóm, giữ thứ tự xuất hiện', () => {
      expect(groupAggregate(rows, 'k', 'v', 'sum')).toEqual([
        { name: 'a', value: 6 },
        { name: 'b', value: 9 },
      ]);
    });
    it('nhóm rỗng giá trị → 0', () => {
      expect(groupAggregate([{ k: 'a', v: 'N/A' }], 'k', 'v', 'sum')).toEqual([
        { name: 'a', value: 0 },
      ]);
    });
  });
});
