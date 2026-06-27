import { Injectable } from '@nestjs/common';
import { ColumnType } from '@prisma/client';

// Tỷ lệ giá trị non-empty phải khớp 1 kiểu để cột được coi là kiểu đó
const MATCH_THRESHOLD = 0.8;
// Cột string được coi là "category" nếu số giá trị phân biệt thấp
const CATEGORY_MAX_DISTINCT = 20;
const CATEGORY_MAX_DISTINCT_RATIO = 0.5;

// ISO datetime ("2024-01-01T00:00:00.000Z"), ISO date, hoặc D/M/Y - D-M-Y
const DATE_PATTERNS = [
  /^\d{4}-\d{1,2}-\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?$/,
  /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/,
];

@Injectable()
export class ColumnTypeService {
  detect(values: string[]): ColumnType {
    const nonEmpty = values
      .map((v) => (v ?? '').toString().trim())
      .filter((v) => v.length > 0);

    if (nonEmpty.length === 0) return ColumnType.string;

    const numberRatio = this.ratio(nonEmpty, (v) => this.isNumber(v));
    if (numberRatio >= MATCH_THRESHOLD) return ColumnType.number;

    const dateRatio = this.ratio(nonEmpty, (v) => this.isDate(v));
    if (dateRatio >= MATCH_THRESHOLD) return ColumnType.date;

    return this.isCategory(nonEmpty) ? ColumnType.category : ColumnType.string;
  }

  private ratio(values: string[], pred: (v: string) => boolean): number {
    const matched = values.filter(pred).length;
    return matched / values.length;
  }

  private isNumber(value: string): boolean {
    // Bỏ dấu phẩy ngăn cách nghìn kiểu "1,000.5"
    const cleaned = value.replace(/,/g, '');
    if (cleaned === '') return false;
    return Number.isFinite(Number(cleaned));
  }

  private isDate(value: string): boolean {
    return DATE_PATTERNS.some((re) => re.test(value));
  }

  private isCategory(values: string[]): boolean {
    const distinct = new Set(values).size;
    return (
      distinct <= CATEGORY_MAX_DISTINCT &&
      distinct / values.length <= CATEGORY_MAX_DISTINCT_RATIO
    );
  }
}
