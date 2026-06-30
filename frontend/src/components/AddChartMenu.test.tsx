import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddChartMenu from './AddChartMenu';
import type { Dataset } from '../api/datasets';

const datasets = [
  { id: 'ds-1', name: 'Từ vựng HSK' },
  { id: 'ds-2', name: 'Báo giá thịt' },
] as Dataset[];

function setup(ds: Dataset[] = datasets) {
  const onPick = vi.fn();
  const onUpload = vi.fn();
  render(<AddChartMenu datasets={ds} onPick={onPick} onUpload={onUpload} />);
  return { onPick, onUpload };
}

describe('AddChartMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('menu đóng ban đầu (không có menuitem)', () => {
    setup();
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it('bấm nút → mở menu liệt kê sheet + tuỳ chọn tải mới', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm biểu đồ' }));
    expect(screen.getByRole('menuitem', { name: /Từ vựng HSK/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Báo giá thịt/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Tải sheet mới/ })).toBeInTheDocument();
  });

  it('chọn 1 sheet → onPick(id) + menu đóng lại', () => {
    const { onPick } = setup();
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm biểu đồ' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Báo giá thịt/ }));
    expect(onPick).toHaveBeenCalledWith('ds-2');
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it('chọn "Tải sheet mới" → onUpload', () => {
    const { onUpload } = setup();
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm biểu đồ' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Tải sheet mới/ }));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('không có sheet nào → hiện thông báo rỗng', () => {
    setup([]);
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm biểu đồ' }));
    expect(screen.getByText('Chưa có sheet nào')).toBeInTheDocument();
  });
});
