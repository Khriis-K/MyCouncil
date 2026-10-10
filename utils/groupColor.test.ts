import { describe, expect, test } from 'vitest';
import { groupColor } from './groupColor';

describe('groupColor', () => {
  test.each([
    ['INTJ', 'var(--group-analyst)'],
    ['ENFP', 'var(--group-diplomat)'],
    ['ESTJ', 'var(--group-sentinel)'],
    ['ISFP', 'var(--group-explorer)'],
  ])('%s takes its temperament colour', (code, expected) => {
    expect(groupColor(code)).toBe(expected);
  });

  test('a counselor without a known type falls back to secondary ink', () => {
    expect(groupColor('Unknown')).toBe('var(--ink2)');
  });
});
