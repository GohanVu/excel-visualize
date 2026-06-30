import { Injectable } from '@nestjs/common';
import { ColumnType } from '@prisma/client';

// Tỷ lệ giá trị non-empty phải khớp 1 kiểu để cột được coi là kiểu đó
const MATCH_THRESHOLD = 0.8;
// Cột phải có ≥30% ô (trên TỔNG số dòng) có dữ liệu mới được gán number/date.
// Tránh "date/number giả": cột gần rỗng nhưng vài ô lọt regex.
const MIN_FILL_RATIO = 0.3;
// Cột string được coi là "category" nếu số giá trị phân biệt thấp
const CATEGORY_MAX_DISTINCT = 20;
const CATEGORY_MAX_DISTINCT_RATIO = 0.5;

export interface ColumnDetection {
  type: ColumnType;
  // 0..1 — độ chắc chắn của phỏng đoán. FE dùng để quyết có hỏi user không
  confidence: number;
}

// ISO datetime ("2024-01-01T00:00:00.000Z"), ISO date, hoặc D/M/Y - D-M-Y
const DATE_PATTERNS = [
  /^\d{4}-\d{1,2}-\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?$/,
  /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/,
];

@Injectable()
export class ColumnTypeService {
  detect(values: string[]): ColumnDetection {
    const total = values.length;
    const nonEmpty = values
      .map((v) => (v ?? '').toString().trim())
      .filter((v) => v.length > 0);

    if (nonEmpty.length === 0) {
      return { type: ColumnType.string, confidence: 1 };
    }

    const fillRatio = total > 0 ? nonEmpty.length / total : 0;
    const numberRatio = this.ratio(nonEmpty, (v) => this.isNumber(v));
    const dateRatio = this.ratio(nonEmpty, (v) => this.isDate(v));

    // Guard: cột quá thưa không đủ tin để gán number/date
    if (fillRatio >= MIN_FILL_RATIO) {
      if (numberRatio >= MATCH_THRESHOLD) {
        // Kiểm tra xem đây có phải là cột phân loại dạng số nguyên (integer category) không?
        const isAllInt = nonEmpty.every((v) => {
          const n = Number(v.replace(/,/g, ''));
          return Number.isInteger(n);
        });
        const distinct = new Set(nonEmpty).size;
        const isLowDistinct =
          nonEmpty.length >= 10 &&
          distinct <= 10 &&
          distinct / nonEmpty.length <= 0.2;

        if (isAllInt && isLowDistinct) {
          // Đoán là category với confidence thấp để user xác nhận ở UI
          return { type: ColumnType.category, confidence: 0.6 };
        }

        return { type: ColumnType.number, confidence: this.round2(numberRatio) };
      }
      if (dateRatio >= MATCH_THRESHOLD) {
        return { type: ColumnType.date, confidence: this.round2(dateRatio) };
      }
    }

    if (this.isCategory(nonEmpty)) {
      const distinctRatio = new Set(nonEmpty).size / nonEmpty.length;
      return {
        type: ColumnType.category,
        confidence: this.round2(1 - distinctRatio),
      };
    }

    // string: chắc chắn cao nếu rõ ràng không phải số/ngày;
    // thấp khi gần ngưỡng (vd 60% số nhưng chưa đủ 80%) → FE nên hỏi user
    return {
      type: ColumnType.string,
      confidence: this.round2(1 - Math.max(numberRatio, dateRatio)),
    };
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
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
