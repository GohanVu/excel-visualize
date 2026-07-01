import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChartStylePanel from './ChartStylePanel';
import type { DashboardChart } from '../api/charts';

vi.mock('./ChartView', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="preview" data-option={JSON.stringify(option)} />
  ),
}));

const chart: DashboardChart = {
  id: 'c-1',
  type: 'bar',
  title: 'Doanh thu',
  config: { series: [{ type: 'bar' }] },
  position: {},
  createdAt: '2026-06-30T00:00:00.000Z',
};

function setup() {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <ChartStylePanel chart={chart} saving={false} onSave={onSave} onClose={onClose} />,
  );
  return { onSave, onClose };
}

describe('ChartStylePanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('khởi tạo input tiêu đề từ chart.title', () => {
    setup();
    expect(screen.getByPlaceholderText('Biểu đồ')).toHaveValue('Doanh thu');
  });

  it('đổi tiêu đề + lưu → onSave nhận title đã trim', () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByPlaceholderText('Biểu đồ'), {
      target: { value: '  Tên mới  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].title).toBe('Tên mới');
  });

  it('chọn bảng màu + nền sáng → config gửi đi mang màu + nền tương ứng', () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Hoàng hôn/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Sáng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    const cfg = onSave.mock.calls[0][0].config;
    expect(cfg.color).toContain('#f97316'); // sunset
    expect(cfg.backgroundColor).toBe('#ffffff'); // light
    expect(cfg.series).toEqual([{ type: 'bar' }]); // giữ option gốc
  });

  it('chart v2: giữ definition + version, màu áp vào config.option (không top-level)', () => {
    const onSave = vi.fn();
    const v2Chart: DashboardChart = {
      ...chart,
      config: {
        version: 2,
        definition: { version: 1, chartType: 'bar', yFields: [] },
        option: { series: [{ type: 'bar' }] },
      },
    };
    render(
      <ChartStylePanel chart={v2Chart} saving={false} onSave={onSave} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Hoàng hôn/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    const cfg = onSave.mock.calls[0][0].config;
    expect(cfg.version).toBe(2);
    expect(cfg.definition).toEqual({ version: 1, chartType: 'bar', yFields: [] });
    expect(cfg.option.color).toContain('#f97316'); // màu áp vào option cache
    expect(cfg.color).toBeUndefined(); // KHÔNG ở top-level
  });

  it('nút Huỷ + nút đóng đều gọi onClose', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('preview phản ánh lựa chọn hiện tại', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Đại dương/ }));
    const opt = JSON.parse(
      screen.getByTestId('preview').getAttribute('data-option') ?? '{}',
    );
    expect(opt.color).toContain('#1d4ed8'); // ocean
  });
});
