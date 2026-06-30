import { Test } from '@nestjs/testing';
import { ColumnType } from '@prisma/client';
import { ColumnTypeService } from '../column-type.service';

describe('ColumnTypeService', () => {
  let service: ColumnTypeService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ColumnTypeService],
    }).compile();
    service = module.get(ColumnTypeService);
  });

  describe('number', () => {
    it('detects integers', () => {
      expect(service.detect(['1', '2', '100', '42']).type).toBe(ColumnType.number);
    });

    it('detects decimals', () => {
      expect(service.detect(['1.5', '2.7', '3.14']).type).toBe(ColumnType.number);
    });

    it('detects numbers with thousand separators', () => {
      expect(service.detect(['1,000', '2,500', '10,000']).type).toBe(ColumnType.number);
    });

    it('tolerates a few non-numeric values (>= 80% rule)', () => {
      expect(service.detect(['1', '2', '3', '4', 'N/A']).type).toBe(ColumnType.number);
    });
  });

  describe('date', () => {
    it('detects ISO dates', () => {
      expect(service.detect(['2024-01-01', '2024-02-15', '2024-12-31']).type).toBe(ColumnType.date);
    });

    it('detects ISO datetime strings (from parser Date cells)', () => {
      expect(service.detect(['2024-01-01T00:00:00.000Z', '2024-06-15T12:30:00.000Z']).type).toBe(ColumnType.date);
    });

    it('detects D/M/Y format', () => {
      expect(service.detect(['01/02/2024', '15/03/2024', '28/12/2024']).type).toBe(ColumnType.date);
    });
  });

  describe('category', () => {
    it('detects low-cardinality strings as category', () => {
      const values = Array.from({ length: 30 }, (_, i) => (i % 3 === 0 ? 'Hà Nội' : i % 3 === 1 ? 'Đà Nẵng' : 'TP.HCM'));
      expect(service.detect(values).type).toBe(ColumnType.category);
    });
  });

  describe('string', () => {
    it('detects high-cardinality free text as string', () => {
      const values = Array.from({ length: 30 }, (_, i) => `Ghi chú số ${i} hoàn toàn khác nhau`);
      expect(service.detect(values).type).toBe(ColumnType.string);
    });
  });

  describe('edge cases', () => {
    it('returns string for all-empty column', () => {
      expect(service.detect(['', '  ', '']).type).toBe(ColumnType.string);
    });

    it('ignores empty values when computing ratio', () => {
      expect(service.detect(['10', '', '20', '  ', '30']).type).toBe(ColumnType.number);
    });
  });

  describe('fill-ratio guard (chống date/number giả)', () => {
    // Cột 500 dòng nhưng chỉ 2 ô có ngày → quá thưa, KHÔNG được gán date
    const sparse = (vals: string[], total: number): string[] => [
      ...vals,
      ...Array.from({ length: total - vals.length }, () => ''),
    ];

    it('does NOT classify a sparse column as date', () => {
      const values = sparse(['2024-01-01', '2024-01-02'], 100);
      expect(service.detect(values).type).not.toBe(ColumnType.date);
    });

    it('does NOT classify a sparse column as number', () => {
      const values = sparse(['10', '20', '30'], 100);
      expect(service.detect(values).type).not.toBe(ColumnType.number);
    });

    it('still classifies date when fill ratio is sufficient (>= 30%)', () => {
      const values = sparse(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'], 10);
      expect(service.detect(values).type).toBe(ColumnType.date);
    });
  });

  describe('confidence', () => {
    it('high confidence for a clean number column', () => {
      expect(service.detect(['1', '2', '3', '4']).confidence).toBe(1);
    });

    it('lower confidence for an ambiguous column (numbers below threshold)', () => {
      // 3/5 số → numberRatio 0.6 < 0.8 → string, confidence = 1 - 0.6 = 0.4
      const result = service.detect(['1', '2', '3', 'abc', 'def']);
      expect(result.type).toBe(ColumnType.string);
      expect(result.confidence).toBeCloseTo(0.4, 2);
    });

    it('high confidence for a clear category', () => {
      const values = Array.from({ length: 30 }, () => 'Hà Nội');
      // distinctRatio ~ 1/30 → confidence ~ 0.97
      expect(service.detect(values).confidence).toBeGreaterThan(0.9);
    });
  });

  describe('integer category detection', () => {
    it('detects integer labels as category with low confidence', () => {
      // 30 dòng chỉ chứa các giá trị 1, 2, 3 lặp lại
      const values = Array.from({ length: 30 }, (_, i) => String((i % 3) + 1));
      const result = service.detect(values);
      expect(result.type).toBe(ColumnType.category);
      expect(result.confidence).toBe(0.6);
    });

    it('detects unique integer list as number', () => {
      // 30 dòng chứa 30 số nguyên khác nhau liên tục -> phải là number
      const values = Array.from({ length: 30 }, (_, i) => String(i + 1));
      const result = service.detect(values);
      expect(result.type).toBe(ColumnType.number);
    });
  });
});
