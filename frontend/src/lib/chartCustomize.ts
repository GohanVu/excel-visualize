// Tuỳ chỉnh hiển thị chart (P2-T5): bảng màu + nền sáng/tối.
// Áp vào ECharts option đã lưu (config JSONB) — thuần, không phụ thuộc DOM nên test riêng được.

export type ThemeKey = 'dark' | 'light';

export interface ChartStyle {
  palette: string; // key trong PALETTES
  theme: ThemeKey;
}

// `color` ở top-level option là vòng màu ECharts dùng cho các series.
export const PALETTES: Record<string, { label: string; colors: string[] }> = {
  default: {
    label: 'Mặc định',
    colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'],
  },
  ocean: {
    label: 'Đại dương',
    colors: ['#1d4ed8', '#0891b2', '#0d9488', '#0ea5e9', '#6366f1', '#8b5cf6'],
  },
  sunset: {
    label: 'Hoàng hôn',
    colors: ['#f97316', '#ef4444', '#ec4899', '#f59e0b', '#eab308', '#fb7185'],
  },
  forest: {
    label: 'Rừng cây',
    colors: ['#16a34a', '#65a30d', '#15803d', '#4d7c0f', '#84cc16', '#22c55e'],
  },
};

export const THEMES: Record<ThemeKey, { label: string; bg: string; text: string }> = {
  // 'dark' giữ nền trong suốt để lộ nền thẻ gray-900 (mặc định hiện tại).
  dark: { label: 'Tối', bg: 'transparent', text: '#e5e7eb' },
  light: { label: 'Sáng', bg: '#ffffff', text: '#1f2937' },
};

export const DEFAULT_STYLE: ChartStyle = { palette: 'default', theme: 'dark' };

export function paletteColors(key: string): string[] {
  return (PALETTES[key] ?? PALETTES.default).colors;
}

// Trả config MỚI với màu + nền + màu chữ theo style đã chọn (không sửa config gốc).
export function applyCustomization(
  config: Record<string, unknown>,
  style: ChartStyle,
): Record<string, unknown> {
  const theme = THEMES[style.theme] ?? THEMES.dark;
  return {
    ...config,
    color: paletteColors(style.palette),
    backgroundColor: theme.bg,
    textStyle: {
      ...(config.textStyle as Record<string, unknown> | undefined),
      color: theme.text,
    },
  };
}

// Suy ngược style từ config đã lưu để khởi tạo panel (không nhồi field lạ vào option).
export function readStyle(config: Record<string, unknown>): ChartStyle {
  const current = JSON.stringify(config?.color ?? []);
  const palette =
    Object.keys(PALETTES).find(
      (k) => JSON.stringify(PALETTES[k].colors) === current,
    ) ?? 'default';
  const theme: ThemeKey = config?.backgroundColor === '#ffffff' ? 'light' : 'dark';
  return { palette, theme };
}
