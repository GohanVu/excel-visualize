import { Test } from '@nestjs/testing';
import * as XLSX from 'xlsx';
import { BadRequestException } from '@nestjs/common';
import { ParserService } from '../parser.service';

function makeXlsxBuffer(data: unknown[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

function makeCsvBuffer(data: unknown[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  return Buffer.from(csv, 'utf-8');
}

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_MIME = 'text/csv';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ParserService],
    }).compile();
    service = module.get(ParserService);
  });

  describe('parse — xlsx', () => {
    it('returns correct headers from the first row', () => {
      const buf = makeXlsxBuffer([
        ['Tên', 'Tuổi', 'Doanh thu'],
        ['Alice', 25, 1000],
        ['Bob', 30, 2000],
      ]);
      const { headers } = service.parse(buf, XLSX_MIME);
      expect(headers).toEqual(['Tên', 'Tuổi', 'Doanh thu']);
    });

    it('returns all data rows (excluding header)', () => {
      const buf = makeXlsxBuffer([
        ['A', 'B'],
        ['x', 'y'],
        ['p', 'q'],
      ]);
      const { rows } = service.parse(buf, XLSX_MIME);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual(['x', 'y']);
    });

    it('converts numbers to string', () => {
      const buf = makeXlsxBuffer([['Số'], [42], [3.14]]);
      const { rows } = service.parse(buf, XLSX_MIME);
      expect(rows[0][0]).toBe('42');
      expect(rows[1][0]).toBe('3.14');
    });

    it('converts empty cell to empty string', () => {
      const buf = makeXlsxBuffer([['A', 'B'], ['val', null]]);
      const { rows } = service.parse(buf, XLSX_MIME);
      expect(rows[0][1]).toBe('');
    });

    it('returns empty headers and rows for empty sheet', () => {
      const buf = makeXlsxBuffer([]);
      const result = service.parse(buf, XLSX_MIME);
      expect(result.headers).toHaveLength(0);
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('parse — csv', () => {
    it('parses CSV with correct headers and rows', () => {
      const buf = makeCsvBuffer([
        ['Ngày', 'Giá trị'],
        ['2024-01-01', '100'],
        ['2024-01-02', '200'],
      ]);
      const { headers, rows } = service.parse(buf, CSV_MIME);
      expect(headers).toEqual(['Ngày', 'Giá trị']);
      expect(rows).toHaveLength(2);
      expect(rows[0][1]).toBe('100');
    });
  });

  describe('parse — error cases', () => {
    it('throws BadRequestException for corrupted buffer', () => {
      const corrupt = Buffer.from('not-a-valid-file');
      expect(() => service.parse(corrupt, XLSX_MIME)).toThrow(
        BadRequestException,
      );
    });
  });
});
