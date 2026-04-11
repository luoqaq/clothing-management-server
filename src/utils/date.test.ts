import { describe, expect, it } from 'bun:test';
import dayjs from 'dayjs';
import { toDbRangeEnd, toDbRangeStart } from './date';

describe('date range normalization', () => {
  it('keeps date-only filters on the same local day boundaries', () => {
    expect(toDbRangeStart('2026-04-11')).toBe('2026-04-11 00:00:00');
    expect(toDbRangeEnd('2026-04-11')).toBe('2026-04-11 23:59:59');
  });

  it('preserves explicit datetime filters without expanding them to the whole day', () => {
    const isoStart = '2026-04-10T16:00:00.000Z';
    const isoEnd = '2026-04-11T15:59:59.999Z';
    expect(toDbRangeStart(isoStart)).toBe(dayjs(isoStart).format('YYYY-MM-DD HH:mm:ss'));
    expect(toDbRangeEnd(isoEnd)).toBe(dayjs(isoEnd).format('YYYY-MM-DD HH:mm:ss'));
  });
});
