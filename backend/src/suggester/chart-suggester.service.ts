import { Injectable } from '@nestjs/common';
import { ColumnType } from '@prisma/client';

export type ChartType = 'line' | 'bar' | 'pie' | 'scatter';

export interface SuggesterColumn {
  name: string;
  type: ColumnType;
}

// Phép gộp khi nhóm theo x. 'count' đếm dòng; còn lại áp lên cột số y[0].
export type Aggregation =
  | 'count'
  | 'sum'
  | 'average'
  | 'median'
  | 'min'
  | 'max';

export interface ChartSuggestion {
  type: ChartType;
  title: string; // tiếng Việt, plain — không dùng tên kỹ thuật
  description: string;
  encoding: { x: string; y: string[] };
  // count = đếm số dòng theo x (y rỗng); sum/average/... áp lên y[0].
  aggregation?: Aggregation;
}

// Pie chỉ hợp lý khi số nhóm không quá nhiều
const MAX_SUGGESTIONS = 4;

// Heuristic rẻ chọn phép gộp mặc định theo tên cột số (category + number).
// "giá" (đơn giá) → trung bình; số lượng/doanh thu/thành tiền/... → tổng.
// AI sẽ chọn tốt hơn ở Phase 4. User đổi được ở P1.8-T3.
const AVG_HINTS = [
  'đơn giá',
  'giá',
  'tỉ lệ',
  'tỷ lệ',
  'phần trăm',
  'trung bình',
  'điểm',
  'nhiệt độ',
  'tốc độ',
  'rate',
  'price',
  'avg',
];

function defaultAggregation(columnName: string): Aggregation {
  const n = columnName.toLowerCase();
  // "giá trị" = value → tổng (không nhầm với "giá" = price)
  if (n.includes('giá trị')) return 'sum';
  if (AVG_HINTS.some((h) => n.includes(h))) return 'average';
  return 'sum'; // số lượng, doanh thu, thành tiền, tổng, mặc định
}

@Injectable()
export class ChartSuggesterService {
  /**
   * Rule-based: dựa trên tổ hợp kiểu cột đã chọn → danh sách chart hợp lệ.
   * - date + number  → line (xu hướng), bar (so sánh theo thời gian)
   * - category + number → bar (so sánh nhóm), pie (tỷ trọng, khi 1 số liệu)
   * - number + number → scatter (tương quan)
   */
  suggest(columns: SuggesterColumn[]): ChartSuggestion[] {
    const dates = columns.filter((c) => c.type === ColumnType.date);
    const numbers = columns.filter((c) => c.type === ColumnType.number);
    const categories = columns.filter((c) => c.type === ColumnType.category);
    const labels = columns.filter(
      (c) => c.type === ColumnType.category || c.type === ColumnType.string,
    );

    const suggestions: ChartSuggestion[] = [];

    if (dates.length >= 1 && numbers.length >= 1) {
      const x = dates[0].name;
      const y = numbers.map((n) => n.name);
      suggestions.push({
        type: 'line',
        title: 'Xu hướng theo thời gian',
        description: `Diễn biến của ${y.join(', ')} theo ${x}`,
        encoding: { x, y },
      });
      suggestions.push({
        type: 'bar',
        title: 'So sánh theo thời gian',
        description: `Cột giá trị ${y.join(', ')} tại mỗi ${x}`,
        encoding: { x, y },
      });
    } else if (labels.length >= 1 && numbers.length >= 1) {
      const x = labels[0].name;
      const y = numbers.map((n) => n.name);
      // Category + number: PHẢI gộp theo nhóm (nếu không, x lặp → cột trùng tên).
      // Phép gộp mặc định theo tên cột số đầu (y[0]); user đổi được ở T3.
      const agg = defaultAggregation(y[0]);
      const aggLabel = agg === 'average' ? 'Trung bình' : 'Tổng';
      suggestions.push({
        type: 'bar',
        title: 'So sánh giữa các nhóm',
        description: `${aggLabel} ${y[0]} theo từng ${x}`,
        encoding: { x, y },
        aggregation: agg,
      });
      if (numbers.length === 1) {
        suggestions.push({
          type: 'pie',
          title: 'Tỷ trọng các nhóm',
          description: `${aggLabel} ${y[0]} của mỗi ${x}`,
          encoding: { x, y },
          aggregation: agg,
        });
      }
    }

    // Data toàn chữ (không có cột số) nhưng có cột phân loại → ĐẾM số dòng theo nhóm.
    // VD file từ vựng: đếm số từ theo "Từ loại". Chỉ dùng category (string nhiều
    // distinct thì đếm vô nghĩa — 500 nhóm). Đếm cho phép visualize data học tập.
    if (numbers.length === 0 && categories.length >= 1) {
      const x = categories[0].name;
      suggestions.push({
        type: 'bar',
        title: `Số lượng theo ${x}`,
        description: `Đếm số mục theo từng ${x}`,
        encoding: { x, y: [] },
        aggregation: 'count',
      });
      suggestions.push({
        type: 'pie',
        title: `Tỷ trọng theo ${x}`,
        description: `Phần trăm số lượng mỗi ${x}`,
        encoding: { x, y: [] },
        aggregation: 'count',
      });
    }

    if (numbers.length >= 2) {
      suggestions.push({
        type: 'scatter',
        title: 'Tương quan giữa hai chỉ số',
        description: `Mối liên hệ giữa ${numbers[0].name} và ${numbers[1].name}`,
        encoding: { x: numbers[0].name, y: [numbers[1].name] },
      });
    }

    return suggestions.slice(0, MAX_SUGGESTIONS);
  }
}
