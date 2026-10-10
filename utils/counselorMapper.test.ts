import { describe, expect, test } from 'vitest';
import { tensionPair } from './counselorMapper';

const tension = (counselor_ids: [string, string], type: 'conflict' | 'synthesis') => ({
  pair_id: `${counselor_ids[0]}-${counselor_ids[1]}`,
  counselor_ids,
  type,
  core_issue: '',
  matrix: { criteria: [] },
  dialogue: [],
});

describe('tensionPair', () => {
  test('a conflict becomes its two counselors, in order', () => {
    expect(tensionPair(tension(['mirror', 'advisor'], 'conflict'))).toEqual({
      counselor1: 'mirror',
      counselor2: 'advisor',
      type: 'conflict',
    });
  });

  test('a synthesis keeps its type', () => {
    expect(tensionPair(tension(['playmate', 'teammate'], 'synthesis'))).toEqual({
      counselor1: 'playmate',
      counselor2: 'teammate',
      type: 'synthesis',
    });
  });
});
