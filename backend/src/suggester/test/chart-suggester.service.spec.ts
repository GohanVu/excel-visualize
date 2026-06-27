import { Test } from '@nestjs/testing';
import { ColumnType } from '@prisma/client';
import { ChartSuggesterService } from '../chart-suggester.service';

describe('ChartSuggesterService', () => {
  let service: ChartSuggesterService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ChartSuggesterService],
    }).compile();
    service = module.get(ChartSuggesterService);
  });

  const col = (name: string, type: ColumnType) => ({ name, type });

  describe('date + number', () => {
    it('suggests line and bar', () => {
      const result = service.suggest([
        col('Ngày', ColumnType.date),
        col('Doanh thu', ColumnType.number),
      ]);
      expect(result.map((s) => s.type)).toEqual(['line', 'bar']);
      expect(result[0].encoding).toEqual({ x: 'Ngày', y: ['Doanh thu'] });
    });

    it('includes all number columns in y encoding', () => {
      const result = service.suggest([
        col('Ngày', ColumnType.date),
        col('Doanh thu', ColumnType.number),
        col('Lợi nhuận', ColumnType.number),
      ]);
      // có thêm scatter vì >= 2 number
      expect(result.map((s) => s.type)).toContain('line');
      expect(result[0].encoding.y).toEqual(['Doanh thu', 'Lợi nhuận']);
    });
  });

  describe('category + number', () => {
    it('suggests bar and pie when single number', () => {
      const result = service.suggest([
        col('Khu vực', ColumnType.category),
        col('Doanh thu', ColumnType.number),
      ]);
      expect(result.map((s) => s.type)).toEqual(['bar', 'pie']);
    });

    it('does NOT suggest pie when multiple numbers', () => {
      const result = service.suggest([
        col('Khu vực', ColumnType.category),
        col('Doanh thu', ColumnType.number),
        col('Chi phí', ColumnType.number),
      ]);
      expect(result.map((s) => s.type)).not.toContain('pie');
      expect(result.map((s) => s.type)).toContain('bar');
    });
  });

  describe('number + number', () => {
    it('suggests scatter for two numbers without date/category', () => {
      const result = service.suggest([
        col('Chiều cao', ColumnType.number),
        col('Cân nặng', ColumnType.number),
      ]);
      expect(result.map((s) => s.type)).toContain('scatter');
      expect(result.find((s) => s.type === 'scatter')?.encoding).toEqual({
        x: 'Chiều cao',
        y: ['Cân nặng'],
      });
    });
  });

  describe('edge cases', () => {
    it('returns empty when only one number, no axis', () => {
      expect(service.suggest([col('Doanh thu', ColumnType.number)])).toEqual([]);
    });

    it('returns empty for label-only selection', () => {
      expect(service.suggest([col('Tên', ColumnType.string)])).toEqual([]);
    });

    it('caps suggestions at 4', () => {
      const result = service.suggest([
        col('Ngày', ColumnType.date),
        col('A', ColumnType.number),
        col('B', ColumnType.number),
        col('C', ColumnType.number),
      ]);
      expect(result.length).toBeLessThanOrEqual(4);
    });

    it('all suggestions have Vietnamese title + description', () => {
      const result = service.suggest([
        col('Ngày', ColumnType.date),
        col('Doanh thu', ColumnType.number),
      ]);
      for (const s of result) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.description.length).toBeGreaterThan(0);
      }
    });
  });
});
