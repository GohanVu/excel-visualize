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
      expect(service.detect(['1', '2', '100', '42'])).toBe(ColumnType.number);
    });

    it('detects decimals', () => {
      expect(service.detect(['1.5', '2.7', '3.14'])).toBe(ColumnType.number);
    });

    it('detects numbers with thousand separators', () => {
      expect(service.detect(['1,000', '2,500', '10,000'])).toBe(ColumnType.number);
    });

    it('tolerates a few non-numeric values (>= 80% rule)', () => {
      expect(service.detect(['1', '2', '3', '4', 'N/A'])).toBe(ColumnType.number);
    });
  });

  describe('date', () => {
    it('detects ISO dates', () => {
      expect(service.detect(['2024-01-01', '2024-02-15', '2024-12-31'])).toBe(ColumnType.date);
    });

    it('detects ISO datetime strings (from parser Date cells)', () => {
      expect(service.detect(['2024-01-01T00:00:00.000Z', '2024-06-15T12:30:00.000Z'])).toBe(ColumnType.date);
    });

    it('detects D/M/Y format', () => {
      expect(service.detect(['01/02/2024', '15/03/2024', '28/12/2024'])).toBe(ColumnType.date);
    });
  });

  describe('category', () => {
    it('detects low-cardinality strings as category', () => {
      const values = Array.from({ length: 30 }, (_, i) => (i % 3 === 0 ? 'Hà Nội' : i % 3 === 1 ? 'Đà Nẵng' : 'TP.HCM'));
      expect(service.detect(values)).toBe(ColumnType.category);
    });
  });

  describe('string', () => {
    it('detects high-cardinality free text as string', () => {
      const values = Array.from({ length: 30 }, (_, i) => `Ghi chú số ${i} hoàn toàn khác nhau`);
      expect(service.detect(values)).toBe(ColumnType.string);
    });
  });

  describe('edge cases', () => {
    it('returns string for all-empty column', () => {
      expect(service.detect(['', '  ', ''])).toBe(ColumnType.string);
    });

    it('ignores empty values when computing ratio', () => {
      expect(service.detect(['10', '', '20', '  ', '30'])).toBe(ColumnType.number);
    });
  });
});
