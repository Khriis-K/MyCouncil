import { describe, expect, test } from 'vitest';
import { higherScore, debateTitle } from './pointsOfContention';

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
