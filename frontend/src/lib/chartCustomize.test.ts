import { describe, it, expect } from 'vitest';
import {
  PALETTES,
  applyCustomization,
  paletteColors,
  readStyle,
} from './chartCustomize';

describe('chartCustomize', () => {
  it('applyCustomization gắn vòng màu của bảng đã chọn', () => {
    const out = applyCustomization({ series: [] }, { palette: 'ocean', theme: 'dark' });
    expect(out.color).toEqual(PALETTES.ocean.colors);
  });

  it('theme tối → nền trong suốt; theme sáng → nền trắng + chữ tối', () => {
    const dark = applyCustomization({}, { palette: 'default', theme: 'dark' });
    expect(dark.backgroundColor).toBe('transparent');
    expect((dark.textStyle as { color: string }).color).toBe('#e5e7eb');

    const light = applyCustomization({}, { palette: 'default', theme: 'light' });
    expect(light.backgroundColor).toBe('#ffffff');
    expect((light.textStyle as { color: string }).color).toBe('#1f2937');
  });

  it('không sửa config gốc (trả object mới) + giữ field khác', () => {
    const src = { series: [{ type: 'bar' }], xAxis: { type: 'category' } };
    const out = applyCustomization(src, { palette: 'sunset', theme: 'dark' });
    expect(out.series).toBe(src.series); // shallow giữ nguyên
    expect(out.xAxis).toEqual({ type: 'category' });
    expect((src as Record<string, unknown>).color).toBeUndefined(); // gốc không bị thêm color
  });

  it('paletteColors fallback về default khi key lạ', () => {
    expect(paletteColors('khong-ton-tai')).toEqual(PALETTES.default.colors);
  });

  it('readStyle suy ngược palette + theme từ config đã lưu', () => {
    const saved = applyCustomization({}, { palette: 'forest', theme: 'light' });
    expect(readStyle(saved)).toEqual({ palette: 'forest', theme: 'light' });
  });

  it('readStyle mặc định khi config chưa có màu/nền', () => {
    expect(readStyle({})).toEqual({ palette: 'default', theme: 'dark' });
  });
});
