import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedDataset {
  headers: string[];
  rows: string[][];
}

@Injectable()
export class ParserService {
  parse(buffer: Buffer, mimeType: string): ParsedDataset {
    const isCsv = mimeType === 'text/csv' || mimeType === 'application/csv';

    if (!isCsv) this.assertBinarySpreadsheet(buffer);

    let workbook: XLSX.WorkBook;
    try {
      // CSV: decode UTF-8 string trước để giữ đúng dấu tiếng Việt
      // (SheetJS đọc buffer CSV mặc định không phải UTF-8)
      // cellDates: true để "2024-01-01" thành Date, không bị convert sang serial number
      workbook = isCsv
        ? XLSX.read(buffer.toString('utf-8'), { type: 'string', cellDates: true, raw: false })
        : XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
    } catch {
      throw new BadRequestException('Không thể đọc file. File bị lỗi hoặc không đúng định dạng.');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('File không có sheet nào.');

    const sheet = workbook.Sheets[sheetName];
    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (raw.length === 0) return { headers: [], rows: [] };

    const headers = (raw[0] as unknown[]).map((h) =>
      String(h ?? '').trim(),
    );
    const rows = (raw.slice(1) as unknown[][]).map((row) =>
      headers.map((_, i) => this.cellToString(row[i])),
    );

    return { headers, rows };
  }

  // File binary spreadsheet phải khớp magic bytes — chặn file rác / sai định dạng
  private assertBinarySpreadsheet(buffer: Buffer): void {
    const isZip = // .xlsx / .xlsm — ZIP container "PK\x03\x04"
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04;
    const isOle2 = // .xls cũ — OLE2 "D0CF11E0A1B11AE1"
      buffer.length >= 8 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0;

    if (!isZip && !isOle2) {
      throw new BadRequestException('Không thể đọc file. File bị lỗi hoặc không đúng định dạng.');
    }
  }

  private cellToString(cell: unknown): string {
    if (cell == null) return '';
    if (cell instanceof Date) return cell.toISOString();
    return String(cell);
  }
}
