import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedDataset {
  headers: string[];
  rows: string[][];
  // Vị trí (0-based, trong mảng đã đọc) của dòng được dùng làm header
  headerRowIndex: number;
  // false khi phải bỏ qua banner/title gộp ô để tìm header → FE nên gợi ý user xác nhận
  headerConfident: boolean;
  // Tất cả tab (worksheet) trong file
  sheets: string[];
  // Tab đang được đọc
  sheetName: string;
}

export interface ParseOptions {
  sheetName?: string; // tab cần đọc; không có / không tồn tại → tab đầu tiên
  headerRow?: number; // ép dòng header (user override sau khi sửa tay)
}

@Injectable()
export class ParserService {
  // Số dòng đầu tối đa quét để tìm header (banner/title thường chỉ 1-3 dòng)
  private readonly MAX_HEADER_SCAN = 10;

  parse(buffer: Buffer, mimeType: string, opts: ParseOptions = {}): ParsedDataset {
    const workbook = this.readWorkbook(buffer, mimeType);
    const sheets = workbook.SheetNames;
    const sheetName = this.resolveSheet(sheets, opts.sheetName);

    const sheet = workbook.Sheets[sheetName];
    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (raw.length === 0) {
      return {
        headers: [],
        rows: [],
        headerRowIndex: 0,
        headerConfident: true,
        sheets,
        sheetName,
      };
    }

    // User ép header row (sau khi sửa thủ công) → tin tưởng tuyệt đối.
    // Ngược lại tự dò: bỏ qua banner gộp ô (dòng chỉ 1 ô có dữ liệu).
    const header =
      opts.headerRow != null
        ? { index: this.clampHeaderRow(opts.headerRow, raw.length), confident: true }
        : this.detectHeaderRow(raw);

    const headers = (raw[header.index] as unknown[]).map((h) =>
      String(h ?? '').trim(),
    );
    const rows = (raw.slice(header.index + 1) as unknown[][]).map((row) =>
      headers.map((_, i) => this.cellToString(row[i])),
    );

    return {
      headers,
      rows,
      headerRowIndex: header.index,
      headerConfident: header.confident,
      sheets,
      sheetName,
    };
  }

  private readWorkbook(buffer: Buffer, mimeType: string): XLSX.WorkBook {
    const isCsv = mimeType === 'text/csv' || mimeType === 'application/csv';
    if (!isCsv) this.assertBinarySpreadsheet(buffer);
    try {
      // CSV: decode UTF-8 string trước để giữ đúng dấu tiếng Việt
      // (SheetJS đọc buffer CSV mặc định không phải UTF-8)
      // cellDates: true để "2024-01-01" thành Date, không bị convert sang serial number
      return isCsv
        ? XLSX.read(buffer.toString('utf-8'), { type: 'string', cellDates: true, raw: false })
        : XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
    } catch {
      throw new BadRequestException('Không thể đọc file. File bị lỗi hoặc không đúng định dạng.');
    }
  }

  // Chọn tab: ưu tiên tab user yêu cầu (nếu tồn tại trong file), không thì tab đầu
  private resolveSheet(sheetNames: string[], requested?: string): string {
    if (requested && sheetNames.includes(requested)) return requested;
    const first = sheetNames[0];
    if (!first) throw new BadRequestException('File không có sheet nào.');
    return first;
  }

  // Header = dòng đầu tiên có ≥2 ô non-empty (banner gộp ô chỉ có 1 ô).
  // confident chỉ khi dòng đầu đã là header — phải bỏ qua dòng nào → để FE hỏi user.
  private detectHeaderRow(raw: unknown[][]): { index: number; confident: boolean } {
    const limit = Math.min(raw.length, this.MAX_HEADER_SCAN);
    for (let i = 0; i < limit; i++) {
      const nonEmpty = (raw[i] ?? []).filter(
        (c) => String(c ?? '').trim().length > 0,
      ).length;
      if (nonEmpty >= 2) {
        return { index: i, confident: i === 0 };
      }
    }
    // Không có dòng nhiều ô (vd file 1 cột) → dùng dòng đầu
    return { index: 0, confident: true };
  }

  private clampHeaderRow(index: number, length: number): number {
    if (index < 0) return 0;
    if (index >= length) return length - 1;
    return index;
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
