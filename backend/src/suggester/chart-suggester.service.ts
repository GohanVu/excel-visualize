import { Injectable } from '@nestjs/common';
import { ColumnType } from '@prisma/client';

export type ChartType = 'line' | 'bar' | 'pie' | 'scatter';

export interface SuggesterColumn {
  name: string;
  type: ColumnType;
}

export interface ChartSuggestion {
  type: ChartType;
  title: string; // tiếng Việt, plain — không dùng tên kỹ thuật
  description: string;
  encoding: { x: string; y: string[] };
  // 'count' = đếm số dòng theo x (cho data toàn chữ, không có cột số). y rỗng.
  aggregation?: 'count';
}

// Pie chỉ hợp lý khi số nhóm không quá nhiều
const MAX_SUGGESTIONS = 4;

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
      suggestions.push({
        type: 'bar',
        title: 'So sánh giữa các nhóm',
        description: `${y.join(', ')} theo từng ${x}`,
        encoding: { x, y },
      });
      if (numbers.length === 1) {
        suggestions.push({
          type: 'pie',
          title: 'Tỷ trọng các nhóm',
          description: `Phần trăm ${y[0]} của mỗi ${x}`,
          encoding: { x, y },
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
