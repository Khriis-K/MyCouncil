import { describe, expect, test } from 'vitest';
import { formatRecordTime } from './recordTime';

describe('formatRecordTime', () => {
  test('reads as short day and month, then 24-hour time', () => {
    expect(formatRecordTime(new Date(2026, 9, 9, 10, 42).getTime())).toBe('9 Oct · 10:42');
  });

  test('pads hours and minutes but not the day', () => {
    expect(formatRecordTime(new Date(2027, 0, 1, 7, 5).getTime())).toBe('1 Jan · 07:05');
  });

  test('uses the local clock, with midnight as 00', () => {
    expect(formatRecordTime(new Date(2026, 11, 31, 0, 0).getTime())).toBe('31 Dec · 00:00');
  });
});
