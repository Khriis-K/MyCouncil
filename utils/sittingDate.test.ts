import { describe, expect, test } from 'vitest';
import { formatSittingDate } from './sittingDate';

describe('formatSittingDate', () => {
  test('reads as a formal sitting with day, full month and year', () => {
    expect(formatSittingDate(new Date(2026, 9, 9))).toBe('Sitting of 9 October 2026');
  });

  test('uses the local calendar day, without a leading zero', () => {
    expect(formatSittingDate(new Date(2027, 0, 1, 23, 59))).toBe('Sitting of 1 January 2027');
  });
});
