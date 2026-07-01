// Adapter + guard cho backward-compat khi chuyển sang config v2 (P3.5-T2).
// Chart CŨ lưu ECharts option THÔ trong `config` (không có `definition`);
// chart MỚI lưu `{ version, definition, option? }`. Guard phân biệt 2 dạng để
// fork render ở T4: có definition → compile lại; không → dùng option thô như cũ.
import type { ChartSuggestion } from '../../api/datasets';
import type { ChartDefinition, ChartConfigV2 } from '../../types/chartDefinition';
import { DEFAULT_DEFINITION_STYLE } from './chartDefinitionDefaults';

/**
 * Chuyển 1 gợi ý (rule-based suggester) thành ChartDefinition.
 * Giữ luồng suggest hiện tại chạy được trên schema mới mà KHÔNG đụng backend.
 * `opts.percent` (từ ChartDetailPage) → `display.percent`, chỉ áp cho bar
 * (khớp hành vi `buildChartOption` hiện tại: % tổng chỉ dành cho bar).
 */
export function chartSuggestionToDefinition(
  suggestion: ChartSuggestion,
  opts: { percent?: boolean } = {},
): ChartDefinition {
  const def: ChartDefinition = {
    version: 1,
    chartType: suggestion.type,
    xField: suggestion.encoding.x,
    yFields: suggestion.encoding.y ?? [],
    aggregation: suggestion.aggregation,
    style: { ...DEFAULT_DEFINITION_STYLE },
  };
  if (opts.percent && suggestion.type === 'bar') {
    def.display = { percent: true };
  }
  return def;
}

/**
 * True nếu `config` là dạng mới (có `definition` là object); false với chart cũ
 * (ECharts option thô — không có key `definition`). Không validate sâu bên trong.
 */
export function isDefinitionConfig(
  config: unknown,
): config is { definition: ChartDefinition; [key: string]: unknown } {
  if (typeof config !== 'object' || config === null) return false;
  const def = (config as Record<string, unknown>).definition;
  return typeof def === 'object' && def !== null;
}

/** Lấy ChartDefinition từ config v2, hoặc null nếu là chart cũ (option thô). */
export function getChartDefinition(config: unknown): ChartDefinition | null {
  return isDefinitionConfig(config) ? config.definition : null;
}

/** Đóng gói definition + option đã compile thành config v2 để lưu (P3.5-T4). */
export function toChartConfigV2(
  definition: ChartDefinition,
  option: Record<string, unknown>,
): ChartConfigV2 {
  return { version: 2, definition, option };
}

/**
 * Rút ECharts option để render, từ CẢ config v2 (lấy `.option` cache) lẫn chart cũ
 * (config chính là option thô). Dùng ở mọi điểm render 1 chart đã lưu.
 */
export function resolveChartOption(config: unknown): Record<string, unknown> {
  if (isDefinitionConfig(config)) {
    const opt = (config as Partial<ChartConfigV2>).option;
    return opt ?? {};
  }
  return (config as Record<string, unknown>) ?? {};
}
