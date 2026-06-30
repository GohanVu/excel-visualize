import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats ISO-8601 string to YYYY-MM-DD', () => {
    expect(formatDate('2026-06-30T16:28:02.000Z')).toBe('2026-06-30');
    expect(formatDate('2026-06-01T00:00:00.000Z')).toBe('2026-06-01');
    expect(formatDate('2024-12-31T23:59:59Z')).toBe('2024-12-31');
  });

  it('formats YYYY-MM-DD HH:mm:ss string to YYYY-MM-DD', () => {
    expect(formatDate('2026-06-30 16:28:02')).toBe('2026-06-30');
  });

  it('leaves already formatted YYYY-MM-DD as is', () => {
    expect(formatDate('2026-06-30')).toBe('2026-06-30');
  });

  it('returns empty string for empty/undefined values', () => {
    expect(formatDate(undefined)).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('returns raw value if it does not match date regex', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDate('12345')).toBe('12345');
    expect(formatDate('30/06/2026')).toBe('30/06/2026'); // định dạng khác không khớp regex vẫn giữ nguyên
  });
});
