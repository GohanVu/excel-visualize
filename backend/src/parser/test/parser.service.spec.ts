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

// Tạo xlsx có ô gộp: data chỉ điền giá trị ở ô trên-trái (đúng như file thật),
// merges = danh sách range kiểu 'A2:A4'
function makeMergedXlsxBuffer(data: unknown[][], merges: string[]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = merges.map((ref) => XLSX.utils.decode_range(ref));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

function makeMultiSheetBuffer(sheets: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), name);
  }
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
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

    it('keeps date strings as dates, not Excel serial numbers', () => {
      const buf = makeCsvBuffer([
        ['Ngày', 'Giá trị'],
        ['2024-01-01', '100'],
      ]);
      const { rows } = service.parse(buf, CSV_MIME);
      // KHÔNG được ra "45292" (serial). Phải chứa năm 2024 (ISO date)
      expect(rows[0][0]).toContain('2024');
      expect(rows[0][0]).not.toBe('45292');
    });
  });

  describe('parse — header detection', () => {
    it('skips a merged banner/title row and detects the real header', () => {
      const buf = makeXlsxBuffer([
        ['TỔNG HỢP TỪ VỰNG HSK 1'], // banner gộp ô — chỉ 1 ô có dữ liệu
        ['STT', 'Chữ Hán', 'Bính âm'], // header thật
        ['3', '八', 'bā'],
      ]);
      const result = service.parse(buf, XLSX_MIME);
      expect(result.headers).toEqual(['STT', 'Chữ Hán', 'Bính âm']);
      expect(result.headerRowIndex).toBe(1);
      expect(result.headerConfident).toBe(false);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['3', '八', 'bā']);
    });

    it('is confident when the first row is already a clean header', () => {
      const buf = makeXlsxBuffer([
        ['Ngày', 'Doanh thu'],
        ['2024-01-01', '100'],
      ]);
      const result = service.parse(buf, XLSX_MIME);
      expect(result.headerRowIndex).toBe(0);
      expect(result.headerConfident).toBe(true);
    });

    it('respects an explicit headerRow override (overrides auto-detection)', () => {
      const buf = makeXlsxBuffer([
        ['A', 'B'], // auto sẽ chọn dòng này (index 0)
        ['C', 'D'], // nhưng ép dùng dòng index 1
        ['x', 'y'],
      ]);
      const result = service.parse(buf, XLSX_MIME, { headerRow: 1 });
      expect(result.headers).toEqual(['C', 'D']);
      expect(result.headerRowIndex).toBe(1);
      expect(result.headerConfident).toBe(true);
      expect(result.rows[0]).toEqual(['x', 'y']);
    });

    it('clamps an out-of-range headerRow override', () => {
      const buf = makeXlsxBuffer([
        ['A', 'B'],
        ['x', 'y'],
      ]);
      const result = service.parse(buf, XLSX_MIME, { headerRow: 99 });
      expect(result.headerRowIndex).toBe(1); // clamp về dòng cuối
    });
  });

  describe('parse — vertical merged cells (forward-fill)', () => {
    it('forward-fills a vertical merge so lower rows are not empty', () => {
      // Cột "Nhóm" gộp dọc A2:A3 → "Bò Úc" chỉ ở dòng đầu, dòng sau rỗng trong file
      const buf = makeMergedXlsxBuffer(
        [
          ['Nhóm', 'Tên', 'Giá'],
          ['Bò Úc', 'Thăn', '500'],
          ['', 'Sườn', '300'],
          ['Bò Mỹ', 'Ba chỉ', '400'],
        ],
        ['A2:A3'],
      );
      const { rows } = service.parse(buf, XLSX_MIME);
      expect(rows.map((r) => r[0])).toEqual(['Bò Úc', 'Bò Úc', 'Bò Mỹ']);
    });

    it('does NOT fill a horizontal merge, so a merged banner is still skipped', () => {
      // Banner gộp NGANG A1:C1 — phải giữ 1 ô non-empty để header detect ở dòng 2
      const buf = makeMergedXlsxBuffer(
        [
          ['BÁO GIÁ THỊT BÒ', '', ''],
          ['Nhóm', 'Tên', 'Giá'],
          ['Bò Úc', 'Thăn', '500'],
        ],
        ['A1:C1'],
      );
      const result = service.parse(buf, XLSX_MIME);
      expect(result.headers).toEqual(['Nhóm', 'Tên', 'Giá']);
      expect(result.headerRowIndex).toBe(1);
      expect(result.headerConfident).toBe(false);
    });
  });

  describe('parse — multi-sheet', () => {
    const build = () =>
      makeMultiSheetBuffer({
        'HSK 1': [
          ['STT', 'Chữ Hán'],
          ['1', '八'],
        ],
        '214 bộ thủ': [
          ['Bộ', 'Nghĩa'],
          ['一', 'một'],
        ],
      });

    it('lists all sheet names', () => {
      expect(service.parse(build(), XLSX_MIME).sheets).toEqual([
        'HSK 1',
        '214 bộ thủ',
      ]);
    });

    it('reads the first sheet by default', () => {
      const result = service.parse(build(), XLSX_MIME);
      expect(result.sheetName).toBe('HSK 1');
      expect(result.headers).toEqual(['STT', 'Chữ Hán']);
    });

    it('reads a specific sheet by name', () => {
      const result = service.parse(build(), XLSX_MIME, {
        sheetName: '214 bộ thủ',
      });
      expect(result.sheetName).toBe('214 bộ thủ');
      expect(result.headers).toEqual(['Bộ', 'Nghĩa']);
      expect(result.rows[0]).toEqual(['一', 'một']);
    });

    it('falls back to the first sheet when requested sheet does not exist', () => {
      const result = service.parse(build(), XLSX_MIME, {
        sheetName: 'Không tồn tại',
      });
      expect(result.sheetName).toBe('HSK 1');
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
