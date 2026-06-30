/**
 * Định dạng lại chuỗi thời gian (ví dụ ISO 8601: "2026-06-01T00:00:00.000Z")
 * thành định dạng ngắn gọn hơn "YYYY-MM-DD" để hiển thị trên UI và biểu đồ.
 */
export function formatDate(value: string | undefined | null): string {
  if (!value) return '';
  const str = String(value).trim();
  // Regex khớp ISO date dạng 2026-06-01T00:00:00.000Z hoặc 2026-06-01 00:00:00 hoặc 2026-06-01
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?$/.test(str)) {
    const parts = str.split(/[T\s]/);
    return parts[0]; // Lấy phần YYYY-MM-DD
  }
  return value;
}
