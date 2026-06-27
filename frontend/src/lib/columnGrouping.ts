import type { DatasetColumn } from '../api/datasets';

export interface ColumnGroups {
  date: DatasetColumn[];
  number: DatasetColumn[];
  label: DatasetColumn[]; // category + string gộp chung
}

/** Gom các cột thành 3 nhóm hiển thị: Thời gian / Số liệu / Phân loại */
export function groupColumns(columns: DatasetColumn[]): ColumnGroups {
  return {
    date: columns.filter((c) => c.type === 'date'),
    number: columns.filter((c) => c.type === 'number'),
    label: columns.filter((c) => c.type === 'category' || c.type === 'string'),
  };
}

/**
 * Auto pre-select: cột date đầu tiên + cột number đầu tiên.
 * Nếu không có date, lấy cột label đầu tiên làm trục (fallback).
 * Trả về danh sách index đã chọn.
 */
export function autoSelectColumns(columns: DatasetColumn[]): number[] {
  const firstDate = columns.find((c) => c.type === 'date');
  const firstNumber = columns.find((c) => c.type === 'number');
  const fallbackLabel = columns.find(
    (c) => c.type === 'category' || c.type === 'string',
  );

  const selected: number[] = [];
  const axis = firstDate ?? fallbackLabel;
  if (axis) selected.push(axis.index);
  if (firstNumber && firstNumber.index !== axis?.index) {
    selected.push(firstNumber.index);
  }
  return selected;
}
