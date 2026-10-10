import { describe, expect, test } from 'vitest';
import { seatHeading } from './seatHeading';

describe('seatHeading', () => {
  test('names the seat, type and role', () => {
    expect(seatHeading({ numeral: 'II', type: 'ENTJ', role: 'Twin flame' })).toBe('Seat II · ENTJ · Twin flame');
  });

  test('leaves out a role the matrix did not give', () => {
    expect(seatHeading({ numeral: 'IV', type: 'ISTJ', role: '' })).toBe('Seat IV · ISTJ');
  });
});
