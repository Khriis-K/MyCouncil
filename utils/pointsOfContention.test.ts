import { describe, expect, test } from 'vitest';
import { higherScore, debateTitle, weightedAlignment } from './pointsOfContention';

describe('higherScore', () => {
  test('marks the first counselor when their score is higher', () => {
    expect(higherScore(9, 5)).toBe('c1');
  });

  test('marks the second counselor when their score is higher', () => {
    expect(higherScore(4, 9)).toBe('c2');
  });

  test('marks neither on a tie', () => {
    expect(higherScore(6, 6)).toBeNull();
  });

  test('marks the higher of the extremes 1 and 10, either way round', () => {
    expect(higherScore(10, 1)).toBe('c1');
    expect(higherScore(1, 10)).toBe('c2');
  });

  test('marks neither when both sit at the same extreme', () => {
    expect(higherScore(1, 1)).toBeNull();
    expect(higherScore(10, 10)).toBeNull();
  });
});

describe('debateTitle', () => {
  test('sets a conflict as one counselor against the other', () => {
    expect(debateTitle('The Commander', 'The Advocate', 'conflict')).toEqual({
      first: 'The Commander',
      joiner: 'v.',
      second: 'the Advocate',
    });
  });

  test('sets a challenge against each other, like a conflict', () => {
    expect(debateTitle('The Commander', 'The Advocate', 'challenge').joiner).toBe('v.');
  });

  test('joins a synthesis pair rather than setting them against each other', () => {
    expect(debateTitle('The Logician', 'The Logistician', 'synthesis')).toEqual({
      first: 'The Logician',
      joiner: '&',
      second: 'the Logistician',
    });
  });
});

describe('weightedAlignment', () => {
  const row = (id: string, c1_score: number, c2_score: number) => ({ id, c1_score, c2_score });

  test('scores each counselor out of ten across equally weighted rows', () => {
    expect(weightedAlignment([row('a', 8, 4), row('b', 6, 10)], {})).toEqual({ c1Percent: 70, c2Percent: 70 });
  });

  test('a heavier row pulls the alignment toward that row', () => {
    expect(weightedAlignment([row('a', 8, 4), row('b', 6, 10)], { a: 100, b: 0 })).toEqual({ c1Percent: 80, c2Percent: 40 });
    expect(weightedAlignment([row('a', 8, 4), row('b', 6, 10)], { a: 25, b: 75 })).toEqual({ c1Percent: 65, c2Percent: 85 });
  });

  // A lone row has nothing to be weighed against, and its slider is hidden, so a weight left on it is ignored
  test('a single row is its own scores, whatever weight it was left at', () => {
    expect(weightedAlignment([row('a', 7, 9)], { a: 90 })).toEqual({ c1Percent: 70, c2Percent: 90 });
    expect(weightedAlignment([row('a', 7, 9)], { a: 0 })).toEqual({ c1Percent: 70, c2Percent: 90 });
  });

  test('gives no verdict with no rows, or with every weight at zero', () => {
    expect(weightedAlignment([], {})).toBeNull();
    expect(weightedAlignment([row('a', 8, 4), row('b', 6, 10)], { a: 0, b: 0 })).toBeNull();
  });
});
