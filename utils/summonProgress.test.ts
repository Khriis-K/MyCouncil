import { describe, expect, test } from 'vitest';
import { seatsFilled } from './summonProgress';

describe('seatsFilled', () => {
  test('no seats are filled when the summon starts', () => {
    expect(seatsFilled(0, 20000, 5)).toBe(0);
  });

  test('seats fill in step with the time estimate', () => {
    expect(seatsFilled(8000, 20000, 5)).toBe(2);
  });

  test('the last seat waits for the council to answer, even past the estimate', () => {
    expect(seatsFilled(19999, 20000, 5)).toBe(4);
    expect(seatsFilled(60000, 20000, 5)).toBe(4);
  });

  test('a missing estimate fills nothing rather than everything', () => {
    expect(seatsFilled(5000, 0, 5)).toBe(0);
  });
});
