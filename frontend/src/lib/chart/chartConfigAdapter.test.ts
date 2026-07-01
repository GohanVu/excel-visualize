import { describe, it, expect } from 'vitest';
import {
  chartSuggestionToDefinition,
  isDefinitionConfig,
  getChartDefinition,
  toChartConfigV2,
  resolveChartOption,
} from './chartConfigAdapter';
import type { ChartSuggestion } from '../../api/datasets';

function suggestion(over: Partial<ChartSuggestion> = {}): ChartSuggestion {
  return {
    type: 'bar',
    title: 'Doanh thu theo sản phẩm',
    description: 'd',
    encoding: { x: 'Sản phẩm', y: ['Doanh thu'] },
    aggregation: 'sum',
    ...over,
  };
}

describe('chartSuggestionToDefinition', () => {
  it('bar: map type/x/y/aggregation sang definition', () => {
    const def = chartSuggestionToDefinition(suggestion());
    expect(def).toMatchObject({
      version: 1,
      chartType: 'bar',
      xField: 'Sản phẩm',
      yFields: ['Doanh thu'],
      aggregation: 'sum',
    });
  });

  it('line: giữ nguyên chartType', () => {
    const def = chartSuggestionToDefinition(
      suggestion({ type: 'line', encoding: { x: 'Ngày', y: ['Doanh thu'] } }),
    );
    expect(def.chartType).toBe('line');
    expect(def.xField).toBe('Ngày');
  });

  it('pie + aggregation count: yFields rỗng, aggregation count', () => {
    const def = chartSuggestionToDefinition(
      suggestion({ type: 'pie', encoding: { x: 'Trạng thái', y: [] }, aggregation: 'count' }),
    );
    expect(def).toMatchObject({ chartType: 'pie', xField: 'Trạng thái', aggregation: 'count' });
    expect(def.yFields).toEqual([]);
  });

  it('percent trên bar → display.percent = true', () => {
    const def = chartSuggestionToDefinition(suggestion({ type: 'bar' }), { percent: true });
    expect(def.display).toEqual({ percent: true });
  });

  it('percent trên non-bar (line) → bỏ qua (không set display)', () => {
    const def = chartSuggestionToDefinition(suggestion({ type: 'line' }), { percent: true });
    expect(def.display).toBeUndefined();
  });

  it('luôn kèm style mặc định', () => {
    const def = chartSuggestionToDefinition(suggestion());
    expect(def.style).toMatchObject({ palette: 'default', theme: 'dark' });
  });
});

describe('isDefinitionConfig / getChartDefinition', () => {
  it('config v2 (có definition) → true + trả definition', () => {
    const config = { version: 2, definition: { version: 1, chartType: 'bar', yFields: [] } };
    expect(isDefinitionConfig(config)).toBe(true);
    expect(getChartDefinition(config)).toMatchObject({ chartType: 'bar' });
  });

  it('chart cũ (ECharts option thô) → false + trả null', () => {
    const oldOption = {
      color: ['#5470c6'],
      xAxis: { type: 'category', data: ['A', 'B'] },
      series: [{ type: 'bar', data: [1, 2] }],
    };
    expect(isDefinitionConfig(oldOption)).toBe(false);
    expect(getChartDefinition(oldOption)).toBeNull();
  });

  it('giá trị không hợp lệ (null/undefined/non-object) → false', () => {
    expect(isDefinitionConfig(null)).toBe(false);
    expect(isDefinitionConfig(undefined)).toBe(false);
    expect(isDefinitionConfig('x')).toBe(false);
    expect(isDefinitionConfig({ definition: null })).toBe(false);
  });
});

describe('toChartConfigV2 / resolveChartOption', () => {
  const definition = chartSuggestionToDefinition(suggestion());

  it('toChartConfigV2 đóng gói {version:2, definition, option}', () => {
    const option = { series: [{ type: 'bar' }] };
    expect(toChartConfigV2(definition, option)).toEqual({ version: 2, definition, option });
  });

  it('resolveChartOption: config v2 → trả .option đã cache', () => {
    const cfg = toChartConfigV2(definition, { series: [1] });
    expect(resolveChartOption(cfg)).toEqual({ series: [1] });
  });

  it('resolveChartOption: chart cũ (option thô) → trả chính nó', () => {
    const old = { color: ['#000'], series: [{ type: 'bar' }] };
    expect(resolveChartOption(old)).toBe(old);
  });

  it('resolveChartOption: null/undefined → {}', () => {
    expect(resolveChartOption(null)).toEqual({});
    expect(resolveChartOption(undefined)).toEqual({});
  });

  it('resolveChartOption: v2 thiếu option → {}', () => {
    expect(resolveChartOption({ version: 2, definition })).toEqual({});
  });
});
