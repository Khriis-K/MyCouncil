import { describe, expect, test } from 'vitest';
import { CouncilResponse } from '../types';
import { buildTensionPairs } from './counselorMapper';

const tension = (counselor_ids: [string, string], type: 'conflict' | 'synthesis') => ({
  pair_id: `${counselor_ids[0]}-${counselor_ids[1]}`,
  counselor_ids,
  type,
  core_issue: '',
  matrix: { criteria: [] },
  dialogue: [],
});

describe('buildTensionPairs', () => {
  test('returns no pairs without a council response', () => {
    expect(buildTensionPairs(null)).toEqual([]);
  });

  test('maps each tension to a counselor pair, keeping order and type', () => {
    const council: CouncilResponse = {
      summary: '',
      counselors: [],
      tensions: [tension(['mirror', 'advisor'], 'conflict'), tension(['playmate', 'teammate'], 'synthesis')],
    };

    expect(buildTensionPairs(council)).toEqual([
      { counselor1: 'mirror', counselor2: 'advisor', type: 'conflict' },
      { counselor1: 'playmate', counselor2: 'teammate', type: 'synthesis' },
    ]);
  });
});
