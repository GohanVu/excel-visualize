// ChartDefinition — cấu hình biểu đồ dạng khai báo, là NGUỒN SỰ THẬT (P3.5-T1).
// Compiler (P3.5-T3) chuyển `definition + rows` → ECharts option.
// Rule-based suggester, AI (Phase 4) và Studio editor đều sinh/sửa cùng type này.
import type { ChartType, Aggregation } from '../api/datasets';

// Re-export để các nơi khác import gọn từ 1 chỗ.
export type { ChartType, Aggregation };

export type SortDirection = 'asc' | 'desc';

// Mirror ThemeKey trong lib/chartCustomize (giá trị trùng: 'dark'|'light').
// Giữ types/ tự chứa, không phụ thuộc lib/; T9 sẽ bắc cầu sang PALETTES/THEMES.
export type ChartTheme = 'dark' | 'light';

export interface ChartSort {
  field: string;
  direction: SortDirection;
}

export interface ChartDisplay {
  /** % tổng — chỉ áp cho bar (tương thích opts.percent hiện tại). */
  percent?: boolean;
  /** Xếp chồng series (defer — chưa compile ở v1). */
  stacked?: boolean;
}

export interface ChartDefinitionStyle {
  title?: string;
  subtitle?: string;
  /** Key bảng màu trong PALETTES (chartCustomize): 'default'|'ocean'|'sunset'|'forest'. */
  palette?: string;
  theme?: ChartTheme;
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
}

export interface ChartDefinition {
  /** Phiên bản schema của definition (khác với version wrapper config v2 ở P3.5-T4). */
  version: 1;
  chartType: ChartType;
  /** Cột trục X / category / date bucket. */
  xField?: string;
  /** Một hoặc nhiều cột số liệu. Rỗng khi aggregation='count'. */
  yFields: string[];
  aggregation?: Aggregation;
  /** Tách 1 cột phân loại thành nhiều series (P3.5-T7). */
  seriesField?: string;
  sort?: ChartSort;
  limit?: number;
  display?: ChartDisplay;
  style?: ChartDefinitionStyle;
}

// Cấu trúc lưu trong `Chart.config` (JSONB) kể từ P3.5-T4.
// `definition` là nguồn sự thật; `option` là ECharts option đã compile — cache để
// Dashboard render nhanh KHÔNG cần fetch rows. Chart cũ (trước T4) không có `definition`,
// `config` chính là ECharts option thô → phân biệt bằng `isDefinitionConfig`.
// Dùng `type` (không phải interface) để gán được vào Record<string,unknown> khi lưu.
export type ChartConfigV2 = {
  version: 2;
  definition: ChartDefinition;
  option: Record<string, unknown>;
};
