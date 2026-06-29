// Định danh ổn định cho 1 thẻ học (1 dòng dữ liệu).
// Dùng để lưu/đọc StudyProgress: hash theo GIÁ TRỊ dòng (không theo rowIndex)
// → đổi header/sheet hay thêm dòng vẫn khớp đúng thẻ cũ, không lệch như index.
//
// Canonical hoá theo cặp `tên cột = giá trị`, sắp xếp theo tên cột → không phụ
// thuộc thứ tự cột trả về. FNV-1a 32-bit → hex (đủ phân biệt trong 1 dataset).

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // h *= 16777619 (giữ trong 32-bit không dấu)
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function rowCardKey(
  row: Record<string, string>,
  columnNames: string[],
): string {
  const canonical = [...columnNames]
    .sort()
    .map((name) => `${name}=${(row[name] ?? '').toString().trim()}`)
    .join('');
  return fnv1a(canonical);
}
