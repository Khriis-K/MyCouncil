import { describe, expect, test } from 'vitest';
import { debateInjectionText, debatePairId, interjectionFrom } from './debateInterjection';

const pair = { counselor1: 'Architect', counselor2: 'Advocate', type: 'conflict' as const };
const dialogue = [
  { speaker: 'Architect', text: 'Move.' },
  { speaker: 'Advocate', text: 'Stay where your roots are.' },
];

describe('debatePairId', () => {
  test('joins the pair in TensionPair order', () => {
    expect(debatePairId(pair)).toBe('Architect-Advocate');
  });
});

describe('debateInjectionText', () => {
  test('a user interjection is sent as typed', () => {
    expect(debateInjectionText({ kind: 'interjection', text: 'my sister would move in' })).toBe('my sister would move in');
  });

  test('a criterion becomes an instruction to the council', () => {
    expect(debateInjectionText({ kind: 'criterion', label: 'Cost' })).toBe(
      'Please add the criterion "Cost" to the decision matrix and score it for both counselors (1-10) with reasoning.'
    );
  });
});

describe('interjectionFrom', () => {
  test('a user interjection becomes a memory with the counselor turn before it', () => {
    expect(interjectionFrom({ kind: 'interjection', text: 'my sister would move in' }, pair, dialogue, 42)).toEqual({
      pairId: 'Architect-Advocate',
      userText: 'my sister would move in',
      precedingCounselorText: 'Stay where your roots are.',
      timestamp: 42,
    });
  });

  test('skips earlier user turns when finding the preceding counselor turn', () => {
    const withUser = [...dialogue, { speaker: 'user', text: 'hmm' }];
    expect(interjectionFrom({ kind: 'interjection', text: 'and?' }, pair, withUser, 1)?.precedingCounselorText).toBe('Stay where your roots are.');
  });

  test('an empty transcript has no preceding counselor turn', () => {
    const memory = interjectionFrom({ kind: 'interjection', text: 'first' }, pair, [], 1);
    expect(memory).toEqual({ pairId: 'Architect-Advocate', userText: 'first', timestamp: 1 });
  });

  test('adding a criterion is a synthetic instruction, not a memory', () => {
    expect(interjectionFrom({ kind: 'criterion', label: 'Cost' }, pair, dialogue, 42)).toBeNull();
  });
});
