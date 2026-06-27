import { describe, it, expect } from 'vitest';
import { groupColumns, autoSelectColumns } from './columnGrouping';
import type { DatasetColumn } from '../api/datasets';

function col(name: string, index: number, type: DatasetColumn['type']): DatasetColumn {
  return { name, index, type, sampleValues: [] };
}

const columns: DatasetColumn[] = [
  col('Ngày', 0, 'date'),
  col('Khu vực', 1, 'category'),
  col('Doanh thu', 2, 'number'),
  col('Lợi nhuận', 3, 'number'),
  col('Ghi chú', 4, 'string'),
];

describe('groupColumns', () => {
  it('splits into date / number / label (category + string)', () => {
    const g = groupColumns(columns);
    expect(g.date.map((c) => c.name)).toEqual(['Ngày']);
    expect(g.number.map((c) => c.name)).toEqual(['Doanh thu', 'Lợi nhuận']);
    expect(g.label.map((c) => c.name)).toEqual(['Khu vực', 'Ghi chú']);
  });

  it('returns empty groups for empty input', () => {
    expect(groupColumns([])).toEqual({ date: [], number: [], label: [] });
  });
});

describe('autoSelectColumns', () => {
  it('selects first date + first number', () => {
    expect(autoSelectColumns(columns)).toEqual([0, 2]);
  });

  it('falls back to first label when no date column', () => {
    const noDate = [col('Khu vực', 0, 'category'), col('Doanh thu', 1, 'number')];
    expect(autoSelectColumns(noDate)).toEqual([0, 1]);
  });

  it('selects only number when no date/label', () => {
    expect(autoSelectColumns([col('Doanh thu', 0, 'number')])).toEqual([0]);
  });

  it('returns empty when no columns', () => {
    expect(autoSelectColumns([])).toEqual([]);
  });
});
