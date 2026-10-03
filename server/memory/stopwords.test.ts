import { describe, expect, test } from 'vitest';
import { contentWords } from './stopwords';

describe('contentWords', () => {
  test('lowercases, drops stopwords and punctuation, dedupes', () => {
    expect([...contentWords("I told Sam, and Sam said I don't know!")].sort()).toEqual(['know', 'said', 'sam', 'told']);
  });

  test('keeps numbers and drops single characters', () => {
    expect([...contentWords('Deadline is 14 days, a b')].sort()).toEqual(['14', 'days', 'deadline']);
  });

  test('empty input gives an empty set', () => {
    expect(contentWords('the and of').size).toBe(0);
  });
});
