import { describe, it, expect } from 'vitest';
import { rowCardKey } from './cardKey';

describe('rowCardKey', () => {
  const row = { 'Chữ Hán': '八', 'Bính âm': 'bā', Nghĩa: 'tám' };
  const cols = ['Chữ Hán', 'Bính âm', 'Nghĩa'];

  it('is deterministic for the same row + columns', () => {
    expect(rowCardKey(row, cols)).toBe(rowCardKey(row, cols));
  });

  it('does not depend on column order (canonical sort)', () => {
    expect(rowCardKey(row, cols)).toBe(
      rowCardKey(row, ['Nghĩa', 'Chữ Hán', 'Bính âm']),
    );
  });

  it('differs when a value differs', () => {
    const other = { ...row, Nghĩa: 'số tám' };
    expect(rowCardKey(other, cols)).not.toBe(rowCardKey(row, cols));
  });

  it('trims whitespace so re-parse noise does not shift the key', () => {
    const spaced = { 'Chữ Hán': ' 八 ', 'Bính âm': 'bā', Nghĩa: 'tám' };
    expect(rowCardKey(spaced, cols)).toBe(rowCardKey(row, cols));
  });

  it('treats missing column value as empty (stable, no crash)', () => {
    const missing = { 'Chữ Hán': '八', 'Bính âm': 'bā' };
    expect(typeof rowCardKey(missing, cols)).toBe('string');
  });
});
