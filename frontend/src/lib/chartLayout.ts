import type { DashboardChart, LayoutItem } from '../api/charts';

// Lưới dashboard 12 cột; mặc định mỗi chart nửa bề ngang (6 cột) × 7 hàng.
const COLS = 12;
const DEFAULT_W = 6;
const DEFAULT_H = 7;
const PER_ROW = COLS / DEFAULT_W; // 2 chart / hàng
export const GRID = { COLS, ROW_HEIGHT: 40, DEFAULT_W, DEFAULT_H };

export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function pick(v: number | undefined, fallback: number): number {
  return typeof v === 'number' ? v : fallback;
}

// Dựng layout react-grid-layout từ chart: dùng position đã lưu; chưa có thì xếp
// ô mặc định theo thứ tự (2 chart/hàng).
export function chartsToLayout(charts: DashboardChart[]): GridItem[] {
  return charts.map((c, idx) => {
    const p = c.position ?? {};
    return {
      i: c.id,
      x: pick(p.x, (idx % PER_ROW) * DEFAULT_W),
      y: pick(p.y, Math.floor(idx / PER_ROW) * DEFAULT_H),
      w: pick(p.w, DEFAULT_W),
      h: pick(p.h, DEFAULT_H),
    };
  });
}

// layout RGL → payload API (i → id)
export function layoutToPayload(layout: GridItem[]): LayoutItem[] {
  return layout.map(({ i, x, y, w, h }) => ({ id: i, x, y, w, h }));
}
