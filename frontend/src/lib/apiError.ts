// Lấy message thật từ lỗi API. NestJS để lý do ở response.data.message
// (string hoặc string[]), không phải "Request failed with status code 400".
// Trả về undefined nếu không có message backend → caller tự fallback.
export function apiErrorMessage(e: unknown): string | undefined {
  const data = (
    e as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;
  if (Array.isArray(data)) return data.join(', ');
  if (typeof data === 'string') return data;
  return undefined;
}
