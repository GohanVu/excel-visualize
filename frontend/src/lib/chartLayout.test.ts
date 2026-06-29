import { describe, it, expect } from 'vitest';
import { chartsToLayout, layoutToPayload } from './chartLayout';
import type { DashboardChart } from '../api/charts';

const chart = (id: string, position = {}): DashboardChart => ({
  id,
  type: 'bar',
  title: id,
  config: {},
  position,
  createdAt: '2026-06-29T00:00:00.000Z',
});

describe('chartsToLayout', () => {
  it('xếp ô mặc định 2 chart/hàng khi chưa có position', () => {
    const l = chartsToLayout([chart('a'), chart('b'), chart('c')]);
    expect(l[0]).toMatchObject({ i: 'a', x: 0, y: 0, w: 6, h: 7 });
    expect(l[1]).toMatchObject({ i: 'b', x: 6, y: 0 }); // cùng hàng
    expect(l[2]).toMatchObject({ i: 'c', x: 0, y: 7 }); // xuống hàng
  });

  it('dùng position đã lưu khi có', () => {
    const l = chartsToLayout([chart('a', { x: 3, y: 9, w: 4, h: 5 })]);
    expect(l[0]).toEqual({ i: 'a', x: 3, y: 9, w: 4, h: 5 });
  });

  it('position rỗng {} → fallback mặc định (không NaN)', () => {
    const l = chartsToLayout([chart('a', {})]);
    expect(l[0]).toEqual({ i: 'a', x: 0, y: 0, w: 6, h: 7 });
  });
});

describe('layoutToPayload', () => {
  it('map i → id, giữ x/y/w/h', () => {
    expect(
      layoutToPayload([{ i: 'a', x: 1, y: 2, w: 3, h: 4 }]),
    ).toEqual([{ id: 'a', x: 1, y: 2, w: 3, h: 4 }]);
  });
});
